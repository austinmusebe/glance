use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::System;
use tauri::{AppHandle, Emitter, Runtime};

use crate::models::*;

pub struct SystemMonitor {
    system: Arc<Mutex<System>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new();
        // Initial refresh to establish baseline
        sys.refresh_cpu_all();
        sys.refresh_memory();
        Self {
            system: Arc::new(Mutex::new(sys)),
        }
    }

    /// Start the background polling loop, emitting `system-stats` events
    pub fn start_polling<R: Runtime>(&self, app_handle: AppHandle<R>, interval_ms: u64) {
        let system = self.system.clone();

        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_millis(interval_ms));

                let stats = {
                    let mut sys = system.lock().unwrap();
                    sys.refresh_cpu_all();
                    sys.refresh_memory();

                    let cpu_usage = sys.global_cpu_usage();
                    let used_mem = sys.used_memory();
                    let total_mem = sys.total_memory();

                    SystemStats {
                        timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_millis() as u64,
                        cpu: CpuStats {
                            usage_percent: cpu_usage,
                        },
                        gpu: vec![], // Filled in Slice 4
                        ram: RamStats {
                            used_bytes: used_mem,
                            total_bytes: total_mem,
                            usage_percent: if total_mem > 0 {
                                (used_mem as f32 / total_mem as f32) * 100.0
                            } else {
                                0.0
                            },
                        },
                        network: NetworkStats {
                            rx_bytes_per_sec: 0, // Filled in Slice 5
                            tx_bytes_per_sec: 0,
                        },
                    }
                };

                let _ = app_handle.emit("system-stats", &stats);
            }
        });
    }
}
