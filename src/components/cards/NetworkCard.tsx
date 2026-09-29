import type { NetworkStats } from "../../lib/types";
import { formatThroughput } from "../../lib/format";

interface NetworkCardProps {
  network: NetworkStats;
}

export function NetworkCard({ network }: NetworkCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
      <span className="text-[11px] font-medium tracking-wide uppercase text-muted">
        Network
      </span>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-accent text-xs">↑</span>
          <span className="text-sm tabular-nums text-card-foreground">
            {formatThroughput(network.tx_bytes_per_sec)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-accent text-xs">↓</span>
          <span className="text-sm tabular-nums text-card-foreground">
            {formatThroughput(network.rx_bytes_per_sec)}
          </span>
        </div>
      </div>
    </div>
  );
}
