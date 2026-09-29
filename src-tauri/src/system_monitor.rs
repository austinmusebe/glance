use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::{Networks, System};
use tauri::{AppHandle, Emitter, Runtime};

use crate::gpu_monitor::pdh::GpuMonitor;
use crate::models::*;

pub struct SystemMonitor {
    system: Arc<Mutex<System>>,
    networks: Arc<Mutex<Networks>>,
    gpu_monitor: Arc<Mutex<Option<GpuMonitor>>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new();
        // Initial refresh to establish baseline for CPU delta calculation
        sys.refresh_cpu_all();
        sys.refresh_memory();

        let networks = Networks::new_with_refreshed_list();

        let gpu_monitor = GpuMonitor::new();
        if gpu_monitor.is_none() {
            log::warn!("GPU monitoring unavailable — PDH GPU Engine counters not found");
        }

        Self {
            system: Arc::new(Mutex::new(sys)),
            networks: Arc::new(Mutex::new(networks)),
            gpu_monitor: Arc::new(Mutex::new(gpu_monitor)),
        }
    }

    /// Start the background polling loop, emitting `system-stats` events.
    pub fn start_polling<R: Runtime>(&self, app_handle: AppHandle<R>, interval_ms: u64) {
        let system = self.system.clone();
        let networks = self.networks.clone();
        let gpu_monitor = self.gpu_monitor.clone();

        std::thread::spawn(move || {
            // Track previous network bytes for delta calculation
            let mut prev_rx: u64 = 0;
            let mut prev_tx: u64 = 0;
            let mut first_tick = true;

            loop {
                std::thread::sleep(Duration::from_millis(interval_ms));

                // --- CPU + RAM ---
                let (cpu_usage, used_mem, total_mem, core_percentages, top_processes) = {
                    let mut sys = system.lock().unwrap();
                    sys.refresh_cpu_all();
                    sys.refresh_memory();
                    sys.refresh_processes_specifics(
                        sysinfo::ProcessesToUpdate::All,
                        true,
                        sysinfo::ProcessRefreshKind::nothing().with_memory(),
                    );

                    let cores: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();

                    let mut procs: Vec<ProcessItem> = sys
                        .processes()
                        .iter()
                        .map(|(pid, proc)| ProcessItem {
                            pid: pid.as_u32(),
                            name: proc.name().to_string_lossy().to_string(),
                            memory_bytes: proc.memory(),
                        })
                        .collect();
                    procs.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
                    procs.truncate(5);

                    (
                        sys.global_cpu_usage(),
                        sys.used_memory(),
                        sys.total_memory(),
                        cores,
                        procs,
                    )
                };

                // --- GPU ---
                let gpu_data = {
                    let gpu = gpu_monitor.lock().unwrap();
                    gpu.as_ref()
                        .map(|g| g.collect())
                        .unwrap_or_default()
                };

                // --- Network ---
                let (rx_per_sec, tx_per_sec) = {
                    let mut nets = networks.lock().unwrap();
                    nets.refresh(true);

                    let mut total_rx: u64 = 0;
                    let mut total_tx: u64 = 0;
                    for (_name, data) in nets.iter() {
                        total_rx += data.total_received();
                        total_tx += data.total_transmitted();
                    }

                    if first_tick {
                        prev_rx = total_rx;
                        prev_tx = total_tx;
                        first_tick = false;
                        (0u64, 0u64)
                    } else {
                        let interval_secs = interval_ms as f64 / 1000.0;
                        let rx_delta = total_rx.saturating_sub(prev_rx);
                        let tx_delta = total_tx.saturating_sub(prev_tx);
                        prev_rx = total_rx;
                        prev_tx = total_tx;
                        (
                            (rx_delta as f64 / interval_secs) as u64,
                            (tx_delta as f64 / interval_secs) as u64,
                        )
                    }
                };

                let battery_data = crate::battery::get_battery_stats();

                let stats = SystemStats {
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                    cpu: CpuStats {
                        usage_percent: cpu_usage,
                        core_percentages,
                    },
                    gpu: gpu_data,
                    ram: RamStats {
                        used_bytes: used_mem,
                        total_bytes: total_mem,
                        usage_percent: if total_mem > 0 {
                            (used_mem as f32 / total_mem as f32) * 100.0
                        } else {
                            0.0
                        },
                        top_processes,
                    },
                    network: NetworkStats {
                        rx_bytes_per_sec: rx_per_sec,
                        tx_bytes_per_sec: tx_per_sec,
                        local_ip: None,
                        wifi_ssid: None,
                        public_ip: None,
                    },
                    battery: battery_data,
                };

                let _ = app_handle.emit("system-stats", &stats);

                if let Some(tray) = app_handle.tray_by_id("main") {
                    let _ = tray.set_tooltip(Some(format!(
                        "Glance — CPU: {:.0}% | RAM: {:.0}%",
                        stats.cpu.usage_percent, stats.ram.usage_percent
                    )));
                }
            }
        });
    }
}
