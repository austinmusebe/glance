use std::collections::{HashMap, HashSet};
use std::ffi::c_void;
use std::ptr::null_mut;
use sysinfo::System;

use crate::icon_cache::IconCache;
use crate::models::AppNetworkUsage;

#[cfg(target_os = "windows")]
#[link(name = "iphlpapi")]
unsafe extern "system" {
    fn GetExtendedTcpTable(
        pTcpTable: *mut c_void,
        pdwSize: *mut u32,
        bOrder: i32,
        ulAf: u32,
        tableClass: i32,
        reserved: u32,
    ) -> u32;

    fn GetExtendedUdpTable(
        pUdpTable: *mut c_void,
        pdwSize: *mut u32,
        bOrder: i32,
        ulAf: u32,
        tableClass: i32,
        reserved: u32,
    ) -> u32;
}

/// Retrieve all PIDs currently owning active TCP or UDP sockets
pub fn get_active_network_pids() -> HashSet<u32> {
    let mut pids = HashSet::new();

    #[cfg(target_os = "windows")]
    unsafe {
        const AF_INET: u32 = 2;
        const AF_INET6: u32 = 23;
        const TCP_TABLE_OWNER_PID_ALL: i32 = 5;
        const UDP_TABLE_OWNER_PID: i32 = 1;

        // IPv4 TCP
        let mut size = 0u32;
        let _ = GetExtendedTcpTable(null_mut(), &mut size, 0, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0);
        if size > 0 {
            let mut buf = vec![0u8; size as usize];
            if GetExtendedTcpTable(buf.as_mut_ptr() as *mut c_void, &mut size, 0, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0) == 0 {
                let num_entries = *(buf.as_ptr() as *const u32);
                for i in 0..num_entries as usize {
                    let offset = 4 + i * 24 + 20;
                    if offset + 4 <= buf.len() {
                        let pid = *(buf.as_ptr().add(offset) as *const u32);
                        if pid > 0 {
                            pids.insert(pid);
                        }
                    }
                }
            }
        }

        // IPv6 TCP
        let mut size6 = 0u32;
        let _ = GetExtendedTcpTable(null_mut(), &mut size6, 0, AF_INET6, TCP_TABLE_OWNER_PID_ALL, 0);
        if size6 > 0 {
            let mut buf = vec![0u8; size6 as usize];
            if GetExtendedTcpTable(buf.as_mut_ptr() as *mut c_void, &mut size6, 0, AF_INET6, TCP_TABLE_OWNER_PID_ALL, 0) == 0 {
                let num_entries = *(buf.as_ptr() as *const u32);
                for i in 0..num_entries as usize {
                    let offset = 4 + i * 56 + 52;
                    if offset + 4 <= buf.len() {
                        let pid = *(buf.as_ptr().add(offset) as *const u32);
                        if pid > 0 {
                            pids.insert(pid);
                        }
                    }
                }
            }
        }

        // IPv4 UDP
        let mut udp_size = 0u32;
        let _ = GetExtendedUdpTable(null_mut(), &mut udp_size, 0, AF_INET, UDP_TABLE_OWNER_PID, 0);
        if udp_size > 0 {
            let mut buf = vec![0u8; udp_size as usize];
            if GetExtendedUdpTable(buf.as_mut_ptr() as *mut c_void, &mut udp_size, 0, AF_INET, UDP_TABLE_OWNER_PID, 0) == 0 {
                let num_entries = *(buf.as_ptr() as *const u32);
                for i in 0..num_entries as usize {
                    let offset = 4 + i * 12 + 8;
                    if offset + 4 <= buf.len() {
                        let pid = *(buf.as_ptr().add(offset) as *const u32);
                        if pid > 0 {
                            pids.insert(pid);
                        }
                    }
                }
            }
        }
    }

    pids
}

pub struct AppNetworkTracker {
    /// PIDs that have had open sockets
    network_pids: HashSet<u32>,
    /// Last seen (read_bytes, write_bytes) per PID
    last_proc_bytes: HashMap<u32, (u64, u64)>,
    /// Cumulative data per application: app_name -> (rx_bytes, tx_bytes, icon)
    app_totals: HashMap<String, (u64, u64, Option<String>)>,
    icon_cache: IconCache,
}

impl AppNetworkTracker {
    pub fn new(icon_cache: IconCache) -> Self {
        Self {
            network_pids: HashSet::new(),
            last_proc_bytes: HashMap::new(),
            app_totals: HashMap::new(),
            icon_cache,
        }
    }

    /// Refresh network stats from current processes and socket tables.
    /// Accumulates traffic since Glance launch.
    pub fn update(&mut self, system: &System) -> Vec<AppNetworkUsage> {
        let active_pids = get_active_network_pids();
        self.network_pids.extend(active_pids);

        let mut current_pids = HashSet::new();

        for (pid_val, proc) in system.processes() {
            let pid = pid_val.as_u32();
            current_pids.insert(pid);

            // Only track if the process is or was known to have network sockets
            if !self.network_pids.contains(&pid) {
                continue;
            }

            let disk = proc.disk_usage();
            let cur_read = disk.total_read_bytes;
            let cur_write = disk.total_written_bytes;

            let app_name = proc.name().to_string_lossy().to_string();

            if let Some((last_read, last_write)) = self.last_proc_bytes.get_mut(&pid) {
                let delta_rx = cur_read.saturating_sub(*last_read);
                let delta_tx = cur_write.saturating_sub(*last_write);
                *last_read = cur_read;
                *last_write = cur_write;

                let entry = self.app_totals.entry(app_name.clone()).or_insert_with(|| {
                    let icon = proc.exe().and_then(|p| self.icon_cache.get_icon_base64(p));
                    (0, 0, icon)
                });

                entry.0 += delta_rx;
                entry.1 += delta_tx;
                if entry.2.is_none() {
                    entry.2 = proc.exe().and_then(|p| self.icon_cache.get_icon_base64(p));
                }
            } else {
                // First time Glance sees this process: initialize baseline so we only track
                // bytes used *since* Glance launch!
                self.last_proc_bytes.insert(pid, (cur_read, cur_write));
                if !self.app_totals.contains_key(&app_name) {
                    let icon = proc.exe().and_then(|p| self.icon_cache.get_icon_base64(p));
                    self.app_totals.insert(app_name, (0, 0, icon));
                }
            }
        }

        // Clean up terminated PIDs from last_proc_bytes
        self.last_proc_bytes.retain(|pid, _| current_pids.contains(pid));

        // Build sorted list of application network usage
        let mut results: Vec<AppNetworkUsage> = self
            .app_totals
            .iter()
            .map(|(name, (rx, tx, icon))| AppNetworkUsage {
                name: name.clone(),
                icon: icon.clone(),
                rx_bytes: *rx,
                tx_bytes: *tx,
                total_bytes: rx + tx,
            })
            .collect();

        // Default sort by total_bytes descending
        results.sort_by(|a, b| b.total_bytes.cmp(&a.total_bytes));
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_active_network_pids() {
        let pids = get_active_network_pids();
        assert!(!pids.is_empty(), "Should find at least one active network PID");
    }
}
