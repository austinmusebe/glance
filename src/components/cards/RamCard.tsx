import type { RamStats } from "../../lib/types";
import { formatBytes, formatPercent } from "../../lib/format";
import { ProgressBar } from "../ProgressBar";

interface RamCardProps {
  ram: RamStats;
}

export function RamCard({ ram }: RamCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-colors duration-150 shadow-sm justify-between">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">
        RAM
      </span>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-xs text-card-foreground">
            <span className="text-lg font-bold tabular-nums">
              {formatBytes(ram.used_bytes)}
            </span>
            <span className="text-muted text-[11px]"> / {formatBytes(ram.total_bytes)}</span>
          </span>
          <span className="text-sm font-semibold tabular-nums text-card-foreground">
            {formatPercent(ram.usage_percent)}
          </span>
        </div>
        <ProgressBar value={ram.usage_percent} />
      </div>
    </div>
  );
}
