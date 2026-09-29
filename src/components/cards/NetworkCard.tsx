import type { NetworkStats } from "../../lib/types";
import { formatThroughput } from "../../lib/format";

interface NetworkCardProps {
  network: NetworkStats;
  onClick?: () => void;
}

export function NetworkCard({ network, onClick }: NetworkCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex flex-col gap-2 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-all duration-150 shadow-sm justify-between ${
        onClick ? "cursor-pointer active:scale-[0.98] select-none hover:border-[var(--color-border-hover)]" : ""
      }`}
    >
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
