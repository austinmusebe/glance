//! GPU monitoring via Windows Performance Data Helper (PDH) API.
//!
//! Reads `GPU Engine` counters to get per-adapter GPU utilization —
//! the same data source Windows Task Manager uses for its GPU tab.
//! Resolves adapter LUIDs to friendly names via the registry.

#[cfg(target_os = "windows")]
pub mod pdh {
    use crate::models::GpuAdapter;
    use std::collections::HashMap;
    use windows::{
        core::PCWSTR,
        Win32::System::Performance::{
            PdhAddCounterW, PdhCloseQuery, PdhCollectQueryData, PdhEnumObjectItemsW,
            PdhGetFormattedCounterValue, PdhOpenQueryW, PDH_CSTATUS_VALID_DATA,
            PDH_FMT_COUNTERVALUE, PDH_FMT_DOUBLE, PDH_HCOUNTER, PDH_HQUERY,
            PERF_DETAIL,
        },
    };

    /// A single GPU engine counter instance.
    struct GpuEngineCounter {
        counter: PDH_HCOUNTER,
        luid: String,
        #[allow(dead_code)]
        engine_type: String,
    }

    // PDH handles are raw pointers but are safe to send across threads
    // when protected by a Mutex (single-threaded access).
    unsafe impl Send for GpuMonitor {}

    pub struct GpuMonitor {
        query: PDH_HQUERY,
        counters: Vec<GpuEngineCounter>,
        adapter_names: HashMap<String, String>,
    }

    impl GpuMonitor {
        /// Create a new GPU monitor by enumerating all GPU Engine counter instances.
        pub fn new() -> Option<Self> {
            let adapter_names = resolve_adapter_names();

            let mut query = PDH_HQUERY::default();
            let status = unsafe { PdhOpenQueryW(PCWSTR::null(), 0, &mut query) };
            if status != 0 {
                log::warn!("PdhOpenQueryW failed: 0x{:08X}", status);
                return None;
            }

            // Enumerate individual GPU Engine instances
            let counters = enumerate_engine_counters(query, &adapter_names);

            if counters.is_empty() {
                // Try wildcard as last resort
                let counter_path = "\\GPU Engine(*)\\Utilization Percentage\0"
                    .encode_utf16()
                    .collect::<Vec<u16>>();
                let mut counter = PDH_HCOUNTER::default();
                let status = unsafe {
                    PdhAddCounterW(query, PCWSTR(counter_path.as_ptr()), 0, &mut counter)
                };
                if status != 0 {
                    log::warn!("No GPU Engine counters available");
                    unsafe { let _ = PdhCloseQuery(query); }
                    return None;
                }

                // Need two collects for rate-based counters
                unsafe { let _ = PdhCollectQueryData(query); }
                std::thread::sleep(std::time::Duration::from_millis(100));
                unsafe { let _ = PdhCollectQueryData(query); }

                Some(Self {
                    query,
                    counters: vec![GpuEngineCounter {
                        counter,
                        luid: "wildcard".to_string(),
                        engine_type: "all".to_string(),
                    }],
                    adapter_names,
                })
            } else {
                // Need two collects for rate-based counters
                unsafe { let _ = PdhCollectQueryData(query); }
                std::thread::sleep(std::time::Duration::from_millis(100));
                unsafe { let _ = PdhCollectQueryData(query); }

                Some(Self {
                    query,
                    counters,
                    adapter_names,
                })
            }
        }

        /// Collect current GPU utilization, aggregated per adapter.
        pub fn collect(&self) -> Vec<GpuAdapter> {
            unsafe {
                let _ = PdhCollectQueryData(self.query);
            }

            // Aggregate utilization by LUID (adapter)
            let mut adapter_usage: HashMap<String, f64> = HashMap::new();

            for gc in &self.counters {
                let mut value = PDH_FMT_COUNTERVALUE::default();
                let status = unsafe {
                    PdhGetFormattedCounterValue(gc.counter, PDH_FMT_DOUBLE, None, &mut value)
                };
                if status == 0 && value.CStatus == PDH_CSTATUS_VALID_DATA {
                    let usage = unsafe { value.Anonymous.doubleValue };
                    let entry = adapter_usage.entry(gc.luid.clone()).or_insert(0.0);
                    *entry += usage;
                }
            }

            adapter_usage
                .into_iter()
                .map(|(luid, usage)| {
                    let name = self
                        .adapter_names
                        .get(&luid)
                        .cloned()
                        .unwrap_or_else(|| format!("GPU ({})", &luid[..luid.len().min(8)]));
                    GpuAdapter {
                        id: luid,
                        name,
                        usage_percent: (usage as f32).min(100.0),
                    }
                })
                .collect()
        }
    }

    impl Drop for GpuMonitor {
        fn drop(&mut self) {
            unsafe {
                let _ = PdhCloseQuery(self.query);
            }
        }
    }

    /// Enumerate individual GPU Engine counter instances.
    fn enumerate_engine_counters(
        query: PDH_HQUERY,
        _adapter_names: &HashMap<String, String>,
    ) -> Vec<GpuEngineCounter> {
        let object_name: Vec<u16> = "GPU Engine\0".encode_utf16().collect();

        // First call to get buffer sizes
        let mut counter_list_size: u32 = 0;
        let mut instance_list_size: u32 = 0;
        let _ = unsafe {
            PdhEnumObjectItemsW(
                PCWSTR::null(),
                PCWSTR::null(),
                PCWSTR(object_name.as_ptr()),
                None,
                &mut counter_list_size,
                None,
                &mut instance_list_size,
                PERF_DETAIL(0),
                0,
            )
        };

        if instance_list_size == 0 {
            return vec![];
        }

        let mut counter_list = vec![0u16; counter_list_size as usize];
        let mut instance_list = vec![0u16; instance_list_size as usize];

        let status = unsafe {
            PdhEnumObjectItemsW(
                PCWSTR::null(),
                PCWSTR::null(),
                PCWSTR(object_name.as_ptr()),
                Some(windows::core::PWSTR(counter_list.as_mut_ptr())),
                &mut counter_list_size,
                Some(windows::core::PWSTR(instance_list.as_mut_ptr())),
                &mut instance_list_size,
                PERF_DETAIL(0),
                0,
            )
        };

        if status != 0 {
            log::warn!("PdhEnumObjectItemsW failed: 0x{:08X}", status);
            return vec![];
        }

        // Parse MULTI_SZ instance names
        let instances = parse_multi_sz(&instance_list);

        // Deduplicate: we want unique (luid, engtype) pairs
        let mut seen = std::collections::HashSet::new();
        let mut result = Vec::new();

        for instance in &instances {
            let luid = extract_luid(instance);
            let engtype = extract_engtype(instance);

            if let Some(ref luid) = luid {
                let key = format!("{}_{}", luid, engtype.as_deref().unwrap_or("unknown"));
                if !seen.insert(key) {
                    continue;
                }
            }

            let counter_path = format!("\\GPU Engine({})\\Utilization Percentage\0", instance);
            let path_wide: Vec<u16> = counter_path.encode_utf16().collect();

            let mut counter = PDH_HCOUNTER::default();
            let status =
                unsafe { PdhAddCounterW(query, PCWSTR(path_wide.as_ptr()), 0, &mut counter) };

            if status == 0 {
                result.push(GpuEngineCounter {
                    counter,
                    luid: luid.unwrap_or_else(|| "unknown".to_string()),
                    engine_type: engtype.unwrap_or_else(|| "unknown".to_string()),
                });
            }
        }

        result
    }

    /// Parse a Windows MULTI_SZ buffer into strings.
    fn parse_multi_sz(buffer: &[u16]) -> Vec<String> {
        let mut result = Vec::new();
        let mut start = 0;
        for i in 0..buffer.len() {
            if buffer[i] == 0 {
                if i > start {
                    result.push(String::from_utf16_lossy(&buffer[start..i]));
                }
                start = i + 1;
                if i + 1 < buffer.len() && buffer[i + 1] == 0 {
                    break;
                }
            }
        }
        result
    }

    /// Extract the LUID from an instance name.
    fn extract_luid(instance: &str) -> Option<String> {
        let parts: Vec<&str> = instance.split('_').collect();
        for (i, part) in parts.iter().enumerate() {
            if *part == "luid" && i + 2 < parts.len() {
                return Some(format!("{}_{}", parts[i + 1], parts[i + 2]));
            }
        }
        None
    }

    /// Extract the engine type from an instance name.
    fn extract_engtype(instance: &str) -> Option<String> {
        let parts: Vec<&str> = instance.split('_').collect();
        for (i, part) in parts.iter().enumerate() {
            if *part == "engtype" && i + 1 < parts.len() {
                return Some(parts[i + 1..].join("_"));
            }
        }
        None
    }

    /// Resolve GPU adapter LUIDs to friendly names via registry + DXGI fallback.
    fn resolve_adapter_names() -> HashMap<String, String> {
        let mut names = enumerate_dxgi_adapters();

        if names.is_empty() {
            names = resolve_from_registry();
        }

        names
    }

    /// Read adapter names from the display adapter registry key.
    fn resolve_from_registry() -> HashMap<String, String> {
        use windows::core::PWSTR;
        use windows::Win32::System::Registry::{
            RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, HKEY,
            HKEY_LOCAL_MACHINE, KEY_READ,
        };

        let mut names = HashMap::new();

        let class_key_path: Vec<u16> =
            "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\0"
                .encode_utf16()
                .collect();

        let mut class_key = HKEY::default();
        let status = unsafe {
            RegOpenKeyExW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(class_key_path.as_ptr()),
                Some(0),
                KEY_READ,
                &mut class_key,
            )
        };

        if status.is_err() {
            return names;
        }

        let mut index = 0u32;
        loop {
            let mut subkey_name = [0u16; 256];
            let mut subkey_name_len = subkey_name.len() as u32;

            let status = unsafe {
                RegEnumKeyExW(
                    class_key,
                    index,
                    Some(PWSTR(subkey_name.as_mut_ptr())),
                    &mut subkey_name_len,
                    None,
                    None,
                    None,
                    None,
                )
            };

            if status.is_err() {
                break;
            }

            let subkey_str =
                String::from_utf16_lossy(&subkey_name[..subkey_name_len as usize]);

            let full_path = format!(
                "SYSTEM\\CurrentControlSet\\Control\\Class\\{{4d36e968-e325-11ce-bfc1-08002be10318}}\\{}\0",
                subkey_str
            );
            let full_path_wide: Vec<u16> = full_path.encode_utf16().collect();

            let mut subkey = HKEY::default();
            if unsafe {
                RegOpenKeyExW(
                    HKEY_LOCAL_MACHINE,
                    PCWSTR(full_path_wide.as_ptr()),
                    Some(0),
                    KEY_READ,
                    &mut subkey,
                )
            }
            .is_ok()
            {
                if let Some(driver_desc) = read_reg_string_val(subkey, "DriverDesc") {
                    names.insert(format!("adapter_{}", subkey_str), driver_desc);
                }
                unsafe {
                    let _ = RegCloseKey(subkey);
                }
            }

            index += 1;
        }

        unsafe {
            let _ = RegCloseKey(class_key);
        }

        names
    }

    /// Read a REG_SZ value from a registry key.
    fn read_reg_string_val(
        key: windows::Win32::System::Registry::HKEY,
        value_name: &str,
    ) -> Option<String> {
        use windows::Win32::System::Registry::{RegQueryValueExW, REG_VALUE_TYPE};

        let value_name_wide: Vec<u16> = format!("{}\0", value_name).encode_utf16().collect();
        let mut data_type = REG_VALUE_TYPE(0);
        let mut data_size: u32 = 0;

        // First call to get size
        let status = unsafe {
            RegQueryValueExW(
                key,
                PCWSTR(value_name_wide.as_ptr()),
                None,
                Some(&mut data_type as *mut REG_VALUE_TYPE),
                None,
                Some(&mut data_size),
            )
        };

        if status.is_err() || data_size == 0 {
            return None;
        }

        let mut data = vec![0u8; data_size as usize];
        let status = unsafe {
            RegQueryValueExW(
                key,
                PCWSTR(value_name_wide.as_ptr()),
                None,
                Some(&mut data_type as *mut REG_VALUE_TYPE),
                Some(data.as_mut_ptr()),
                Some(&mut data_size),
            )
        };

        if status.is_err() {
            return None;
        }

        let wide: Vec<u16> = data
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();

        let end = wide.iter().position(|&c| c == 0).unwrap_or(wide.len());
        Some(String::from_utf16_lossy(&wide[..end]))
    }

    /// Enumerate GPU adapters via DXGI to get friendly names keyed by LUID.
    fn enumerate_dxgi_adapters() -> HashMap<String, String> {
        use windows::Win32::Graphics::Dxgi::{CreateDXGIFactory1, IDXGIFactory1};

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
                let name = String::from_utf16_lossy(&desc.Description[..name_end]);

                let luid_key = format!(
                    "0x{:08X}_0x{:08X}",
                    desc.AdapterLuid.HighPart, desc.AdapterLuid.LowPart
                );
                names.insert(luid_key, name);
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
