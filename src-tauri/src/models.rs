use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SystemStats {
    pub timestamp: u64,
    pub cpu: CpuStats,
    pub gpu: Vec<GpuAdapter>,
    pub ram: RamStats,
    pub network: NetworkStats,
    pub battery: Option<BatteryStats>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CpuStats {
    pub usage_percent: f32,
    pub core_percentages: Vec<f32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuAdapter {
    pub id: String,
    pub name: String,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize)]
pub struct RamStats {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub usage_percent: f32,
    pub top_processes: Vec<ProcessItem>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProcessItem {
    pub pid: u32,
    pub name: String,
    pub memory_bytes: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct NetworkStats {
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
    pub local_ip: Option<String>,
    pub wifi_ssid: Option<String>,
    pub public_ip: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BatteryStats {
    pub percent: u8,
    pub is_charging: bool,
    pub is_plugged_in: bool,
    pub time_remaining_secs: Option<u32>,
}
