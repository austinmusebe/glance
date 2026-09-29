use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SystemStats {
    pub timestamp: u64,
    pub cpu: CpuStats,
    pub gpu: Vec<GpuAdapter>,
    pub ram: RamStats,
    pub network: NetworkStats,
}

#[derive(Debug, Clone, Serialize)]
pub struct CpuStats {
    pub usage_percent: f32,
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
}

#[derive(Debug, Clone, Serialize)]
pub struct NetworkStats {
    pub rx_bytes_per_sec: u64,
    pub tx_bytes_per_sec: u64,
}
