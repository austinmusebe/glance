export type MetricType = "cpu" | "gpu" | "ram" | "network" | "battery";

export interface SystemStats {
  timestamp: number;
  cpu: CpuStats;
  gpu: GpuAdapter[];
  ram: RamStats;
  network: NetworkStats;
  battery?: BatteryStats | null;
}

export interface BatteryStats {
  percent: number;
  is_charging: boolean;
  is_plugged_in: boolean;
  time_remaining_secs?: number | null;
}

export interface CpuStats {
  usage_percent: number;
  core_percentages?: number[];
  top_processes?: ProcessItem[];
}

export interface GpuAdapter {
  id: string;
  name: string;
  usage_percent: number;
}

export interface RamStats {
  used_bytes: number;
  total_bytes: number;
  usage_percent: number;
  top_processes?: ProcessItem[];
}

export interface ProcessItem {
  pid: number;
  name: string;
  memory_bytes: number;
  cpu_percent?: number;
  icon?: string | null;
}

export interface AppNetworkUsage {
  name: string;
  icon?: string | null;
  rx_bytes: number;
  tx_bytes: number;
  total_bytes: number;
}

export interface NetworkStats {
  rx_bytes_per_sec: number;
  tx_bytes_per_sec: number;
  local_ip?: string | null;
  wifi_ssid?: string | null;
  public_ip?: string | null;
  app_network?: AppNetworkUsage[];
}

export interface UserSettings {
  refresh_interval_ms: number;
  theme: "light" | "dark" | "system";
  launch_on_startup: boolean;
  layout: "grid" | "stacked";
  accent_color?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  refresh_interval_ms: 1000,
  theme: "system",
  launch_on_startup: false,
  layout: "grid",
  accent_color: "#60a5fa",
};
