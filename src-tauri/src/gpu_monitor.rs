//! GPU monitoring via Windows Performance Data Helper (PDH) API.
//!
//! Reads `\GPU Engine(*)\Utilization Percentage` counters to get per-adapter GPU utilization —
//! the same data source Windows Task Manager uses for its GPU tab.
//! Resolves adapter LUIDs to friendly names via DXGI and filters out software/virtual adapters.

#[cfg(target_os = "windows")]
pub mod pdh {
    use crate::models::GpuAdapter;
    use std::collections::HashMap;
    use windows::{
        core::PCWSTR,
        Win32::Graphics::Dxgi::{CreateDXGIFactory1, IDXGIFactory1},
        Win32::System::Performance::{
            PdhAddCounterW, PdhCloseQuery, PdhCollectQueryData,
            PdhGetFormattedCounterArrayW, PdhOpenQueryW, PDH_CSTATUS_VALID_DATA,
            PDH_FMT_COUNTERVALUE_ITEM_W, PDH_FMT_DOUBLE, PDH_HCOUNTER, PDH_HQUERY,
        },
    };

    // PDH handles are raw pointers but safe to send across threads
    // when protected by a Mutex.
    unsafe impl Send for GpuMonitor {}

    pub struct GpuMonitor {
        query: PDH_HQUERY,
        counter: PDH_HCOUNTER,
        /// Map of normalized lower-case LUID -> friendly display name
        adapter_names: HashMap<String, String>,
    }

    impl GpuMonitor {
        /// Create a new GPU monitor with wildcard counter query.
        pub fn new() -> Option<Self> {
            let adapter_names = resolve_adapters();

            if adapter_names.is_empty() {
                log::warn!("No physical GPU adapters found via DXGI");
            }

            let mut query = PDH_HQUERY::default();
            let status = unsafe { PdhOpenQueryW(PCWSTR::null(), 0, &mut query) };
            if status != 0 {
                log::warn!("PdhOpenQueryW failed: 0x{:08X}", status);
                return None;
            }

            // Add wildcard counter for all GPU Engine utilization
            let counter_path: Vec<u16> = "\\GPU Engine(*)\\Utilization Percentage\0"
                .encode_utf16()
                .collect();

            let mut counter = PDH_HCOUNTER::default();
            let status = unsafe {
                PdhAddCounterW(query, PCWSTR(counter_path.as_ptr()), 0, &mut counter)
            };

            if status != 0 {
                log::warn!("PdhAddCounterW wildcard failed: 0x{:08X}", status);
                unsafe {
                    let _ = PdhCloseQuery(query);
                }
                return None;
            }

            // Initial collect to establish baseline for rate calculation
            unsafe {
                let _ = PdhCollectQueryData(query);
            }

            Some(Self {
                query,
                counter,
                adapter_names,
            })
        }

        /// Collect current GPU utilization, aggregated per physical adapter.
        /// Re-queries the wildcard counter on every tick to capture newly spawned processes/engines.
        pub fn collect(&self) -> Vec<GpuAdapter> {
            // Collect query data on each poll tick
            let collect_status = unsafe { PdhCollectQueryData(self.query) };
            if collect_status != 0 {
                log::debug!("PdhCollectQueryData status: 0x{:08X}", collect_status);
            }

            let mut buffer_size: u32 = 0;
            let mut item_count: u32 = 0;

            // First call to determine required buffer size
            unsafe {
                let _ = PdhGetFormattedCounterArrayW(
                    self.counter,
                    PDH_FMT_DOUBLE,
                    &mut buffer_size,
                    &mut item_count,
                    None,
                );
            }

            let mut adapter_usage: HashMap<String, f64> = HashMap::new();

            if buffer_size > 0 {
                let mut buffer = vec![0u8; buffer_size as usize];
                let status = unsafe {
                    PdhGetFormattedCounterArrayW(
                        self.counter,
                        PDH_FMT_DOUBLE,
                        &mut buffer_size,
                        &mut item_count,
                        Some(buffer.as_mut_ptr() as *mut PDH_FMT_COUNTERVALUE_ITEM_W),
                    )
                };

                if status == 0 && item_count > 0 {
                    let items = unsafe {
                        std::slice::from_raw_parts(
                            buffer.as_ptr() as *const PDH_FMT_COUNTERVALUE_ITEM_W,
                            item_count as usize,
                        )
                    };

                    for item in items {
                        if item.FmtValue.CStatus == PDH_CSTATUS_VALID_DATA {
                            let name = unsafe { item.szName.to_string() }.unwrap_or_default();
                            let usage = unsafe { item.FmtValue.Anonymous.doubleValue };

                            if let Some(luid) = extract_luid(&name) {
                                let entry = adapter_usage.entry(luid).or_insert(0.0);
                                *entry += usage;
                            }
                        }
                    }
                }
            }

            // Map each registered physical adapter to a GpuAdapter struct
            let mut result: Vec<GpuAdapter> = self
                .adapter_names
                .iter()
                .map(|(luid, name)| {
                    let usage = adapter_usage.get(luid).copied().unwrap_or(0.0);
                    GpuAdapter {
                        id: luid.clone(),
                        name: name.clone(),
                        usage_percent: (usage as f32).min(100.0),
                    }
                })
                .collect();

            // Sort adapters stably by name
            result.sort_by(|a, b| a.name.cmp(&b.name));

            result
        }
    }

    impl Drop for GpuMonitor {
        fn drop(&mut self) {
            unsafe {
                let _ = PdhCloseQuery(self.query);
            }
        }
    }

    /// Extract normalized lowercase LUID from an instance name like:
    /// "pid_1234_luid_0x00000000_0x000098B1_phys_0_eng_0_engtype_3D"
    pub fn extract_luid(instance: &str) -> Option<String> {
        let parts: Vec<&str> = instance.split('_').collect();
        for (i, part) in parts.iter().enumerate() {
            if *part == "luid" && i + 2 < parts.len() {
                let high = parts[i + 1].trim_start_matches("0x").trim_start_matches("0X");
                let low = parts[i + 2].trim_start_matches("0x").trim_start_matches("0X");
                let high_val = u32::from_str_radix(high, 16).ok()?;
                let low_val = u32::from_str_radix(low, 16).ok()?;
                return Some(format!("0x{:08x}_0x{:08x}", high_val, low_val));
            }
        }
        None
    }

    /// Resolve physical adapters via DXGI, filtering out software/virtual adapters
    /// such as "Microsoft Basic Render Driver".
    fn resolve_adapters() -> HashMap<String, String> {
        let mut names = HashMap::new();

        let factory: Result<IDXGIFactory1, _> = unsafe { CreateDXGIFactory1() };
        let Ok(factory) = factory else {
            return names;
        };

        let mut i = 0u32;
        loop {
            let adapter = unsafe { factory.EnumAdapters1(i) };
            let Ok(adapter) = adapter else {
                break;
            };

            if let Ok(desc) = unsafe { adapter.GetDesc1() } {
                let name_end = desc
                    .Description
                    .iter()
                    .position(|&c| c == 0)
                    .unwrap_or(desc.Description.len());
                let name = String::from_utf16_lossy(&desc.Description[..name_end]).trim().to_string();

                // Filter out software adapters (flag 2 is DXGI_ADAPTER_FLAG_SOFTWARE)
                // and "Microsoft Basic Render Driver"
                let is_software = (desc.Flags & 2) != 0;
                let is_basic_render = name.eq_ignore_ascii_case("Microsoft Basic Render Driver")
                    || name.contains("Basic Render");

                if !is_software && !is_basic_render && !name.is_empty() {
                    let luid_key = format!(
                        "0x{:08x}_0x{:08x}",
                        desc.AdapterLuid.HighPart, desc.AdapterLuid.LowPart
                    );
                    names.insert(luid_key, name);
                }
            }

            i += 1;
        }

        names
    }
}

#[cfg(not(target_os = "windows"))]
pub mod pdh {
    use crate::models::GpuAdapter;

    pub struct GpuMonitor;
    unsafe impl Send for GpuMonitor {}

    impl GpuMonitor {
        pub fn new() -> Option<Self> {
            None
        }

        pub fn collect(&self) -> Vec<GpuAdapter> {
            vec![]
        }
    }
}

#[cfg(test)]
mod tests {
    use super::pdh::*;
    use std::time::Duration;

    #[test]
    fn test_extract_luid() {
        let instance = "pid_1234_luid_0x00000000_0x000098B1_phys_0_eng_0_engtype_3D";
        assert_eq!(
            extract_luid(instance),
            Some("0x00000000_0x000098b1".to_string())
        );

        let instance_lower = "pid_4321_luid_0x0_0x98b1_phys_0_eng_0";
        assert_eq!(
            extract_luid(instance_lower),
            Some("0x00000000_0x000098b1".to_string())
        );

        let invalid = "pid_1234_engtype_3D";
        assert_eq!(extract_luid(invalid), None);
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn test_gpu_monitor_live_polls() {
        let monitor = GpuMonitor::new().expect("GpuMonitor::new should succeed on Windows");

        println!("Starting 3 live consecutive GPU poll ticks...");
        for tick in 1..=3 {
            std::thread::sleep(Duration::from_millis(500));
            let adapters = monitor.collect();
            println!("Poll Tick #{}: {:?}", tick, adapters);

            for adapter in &adapters {
                // Assert Microsoft Basic Render Driver is filtered out
                assert!(
                    !adapter.name.contains("Microsoft Basic Render Driver"),
                    "Microsoft Basic Render Driver must be filtered out"
                );
                assert!(
                    adapter.usage_percent >= 0.0 && adapter.usage_percent <= 100.0,
                    "Usage percent must be in valid range [0, 100]"
                );
            }
        }
    }
}
