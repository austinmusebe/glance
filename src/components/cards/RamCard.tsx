import type { RamStats } from "../../lib/types";
import { formatBytes, formatPercent } from "../../lib/format";
import { ProgressBar } from "../ProgressBar";

interface RamCardProps {
  ram: RamStats;
}

export function RamCard({ ram }: RamCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
      <span className="text-[11px] font-medium tracking-wide uppercase text-muted">
        RAM
      </span>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-card-foreground">
          <span className="text-xl font-semibold tabular-nums">
            {formatBytes(ram.used_bytes)}
          </span>
          <span className="text-muted">/{formatBytes(ram.total_bytes)}</span>
        </span>
        <span className="text-sm font-semibold tabular-nums text-card-foreground">
          {formatPercent(ram.usage_percent)}
        </span>
      </div>
      <ProgressBar value={ram.usage_percent} />
    </div>
  );
}
