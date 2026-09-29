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
            let icon_cache = crate::icon_cache::IconCache::new();
            let mut network_tracker = crate::network_tracker::AppNetworkTracker::new(icon_cache.clone());

            // Track previous network bytes for delta calculation
            let mut prev_rx: u64 = 0;
            let mut prev_tx: u64 = 0;
            let mut first_tick = true;

            loop {
                std::thread::sleep(Duration::from_millis(interval_ms));

                // --- CPU + RAM + Processes + Network Tracker ---
                let (cpu_usage, used_mem, total_mem, core_percentages, top_ram_processes, top_cpu_processes, app_network) = {
                    let mut sys = system.lock().unwrap();
                    sys.refresh_cpu_all();
                    sys.refresh_memory();
                    sys.refresh_processes_specifics(
                        sysinfo::ProcessesToUpdate::All,
                        true,
                        sysinfo::ProcessRefreshKind::nothing()
                            .with_memory()
                            .with_cpu()
                            .with_disk_usage(),
                    );

                    let num_cpus = sys.cpus().len().max(1) as f32;
                    let cores: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();

                    let all_procs: Vec<ProcessItem> = sys
                        .processes()
                        .iter()
                        .map(|(pid, proc)| {
                            let cpu_norm = (proc.cpu_usage() / num_cpus).min(100.0);
                            let icon = proc.exe().and_then(|p| icon_cache.get_icon_base64(p));
                            ProcessItem {
                                pid: pid.as_u32(),
                                name: proc.name().to_string_lossy().to_string(),
                                memory_bytes: proc.memory(),
                                cpu_percent: cpu_norm,
                                icon,
                            }
                        })
                        .collect();

                    let mut top_ram = all_procs.clone();
                    top_ram.sort_by(|a, b| b.memory_bytes.cmp(&a.memory_bytes));
                    top_ram.truncate(5);

                    let mut top_cpu = all_procs;
                    top_cpu.sort_by(|a, b| {
                        b.cpu_percent
                            .partial_cmp(&a.cpu_percent)
                            .unwrap_or(std::cmp::Ordering::Equal)
                    });
                    top_cpu.truncate(5);

                    let app_net = network_tracker.update(&sys);

                    (
                        sys.global_cpu_usage(),
                        sys.used_memory(),
                        sys.total_memory(),
                        cores,
                        top_ram,
                        top_cpu,
                        app_net,
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

                let local_ip = {
                    use std::net::UdpSocket;
                    UdpSocket::bind("0.0.0.0:0")
                        .and_then(|s| s.connect("8.8.8.8:80").map(|_| s))
                        .and_then(|s| s.local_addr())
                        .map(|addr| addr.ip().to_string())
                        .ok()
                };

                let wifi_ssid = get_wifi_ssid(&networks);

                let stats = SystemStats {
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                    cpu: CpuStats {
                        usage_percent: cpu_usage,
                        core_percentages,
                        top_processes: top_cpu_processes,
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
                        top_processes: top_ram_processes,
                    },
                    network: NetworkStats {
                        rx_bytes_per_sec: rx_per_sec,
                        tx_bytes_per_sec: tx_per_sec,
                        local_ip,
                        wifi_ssid,
                        public_ip: None,
                        app_network,
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

fn get_wifi_ssid(networks: &Arc<Mutex<sysinfo::Networks>>) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let output = std::process::Command::new("netsh")
            .args(["wlan", "show", "interfaces"])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("SSID") && !trimmed.starts_with("BSSID") {
                    if let Some((_, ssid)) = trimmed.split_once(':') {
                        let name = ssid.trim();
                        if !name.is_empty() {
                            return Some(name.to_string());
                        }
                    }
                }
            }
        }
    }

    if let Ok(nets) = networks.lock() {
        for (name, _) in nets.iter() {
            if name.contains("Wi-Fi") || name.contains("WiFi") || name.contains("Wireless") {
                return Some("Wi-Fi".to_string());
            }
        }
        for (name, _) in nets.iter() {
            if !name.contains("Loopback") && !name.contains("vEthernet") {
                return Some(name.clone());
            }
        }
    }

    None
}
