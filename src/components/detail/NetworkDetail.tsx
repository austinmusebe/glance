import type { NetworkStats } from "../../lib/types";
import { formatThroughput } from "../../lib/format";
import { Sparkline } from "../Sparkline";
import { usePublicIp } from "../../hooks/usePublicIp";

interface NetworkDetailProps {
  network: NetworkStats;
  downHistory: number[];
  upHistory: number[];
}

export function NetworkDetail({ network, downHistory, upHistory }: NetworkDetailProps) {
  const { publicIp, loading: publicIpLoading } = usePublicIp();

  const maxDown = Math.max(1024, ...downHistory);
  const maxUp = Math.max(1024, ...upHistory);

  return (
    <div className="flex flex-col gap-3">
      {/* Speed Throughput and Dual Graph Cards */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
        {/* Download row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--color-accent)] font-bold text-xs">↓</span>
              <span className="text-xs text-muted">Download</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-card-foreground">
              {formatThroughput(network.rx_bytes_per_sec)}
            </span>
          </div>
          <Sparkline
            data={downHistory}
            max={maxDown}
            width={340}
            height={38}
            strokeColor="var(--color-accent)"
          />
        </div>

        <div className="border-t border-border my-0.5" />

        {/* Upload row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-xs">↑</span>
              <span className="text-xs text-muted">Upload</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-card-foreground">
              {formatThroughput(network.tx_bytes_per_sec)}
            </span>
          </div>
          <Sparkline
            data={upHistory}
            max={maxUp}
            width={340}
            height={38}
            strokeColor="rgb(52, 211, 153)"
          />
        </div>
      </div>

      {/* Network Configuration Details */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border text-xs">
        {/* Wi-Fi SSID / Interface */}
        <div className="flex items-center justify-between py-1 border-b border-border">
          <div className="flex items-center gap-1.5 text-muted">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
            </svg>
            <span>Network / SSID</span>
          </div>
          <span className="font-semibold text-card-foreground truncate max-w-[180px]">
            {network.wifi_ssid || "Wi-Fi"}
          </span>
        </div>

        {/* Local IP */}
        <div className="flex items-center justify-between py-1 border-b border-border">
          <span className="text-muted">Local IP Address</span>
          <span className="font-semibold tabular-nums text-card-foreground">
            {network.local_ip || "127.0.0.1"}
          </span>
        </div>

        {/* Public IP */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-1.5 text-muted">
            <span>Public IP Address</span>
          </div>
          <span className="font-semibold tabular-nums text-card-foreground">
            {publicIp ? (
              publicIp
            ) : publicIpLoading ? (
              <span className="text-muted font-normal">Resolving…</span>
            ) : (
              <span className="text-muted font-normal">Unavailable</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
