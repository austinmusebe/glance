import type { NetworkStats } from "../../lib/types";
import { formatThroughput } from "../../lib/format";

interface NetworkCardProps {
  network: NetworkStats;
}

export function NetworkCard({ network }: NetworkCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-colors duration-150 shadow-sm justify-between">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">
        Network
      </span>
      <div className="flex flex-col gap-1.5 py-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-accent)] text-xs font-bold leading-none">↑</span>
            <span className="text-xs text-muted">Up</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-card-foreground">
            {formatThroughput(network.tx_bytes_per_sec)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--color-accent)] text-xs font-bold leading-none">↓</span>
            <span className="text-xs text-muted">Down</span>
          </div>
          <span className="text-xs font-semibold tabular-nums text-card-foreground">
            {formatThroughput(network.rx_bytes_per_sec)}
          </span>
        </div>
      </div>
    </div>
  );
}
