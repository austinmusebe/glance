import type { CpuStats } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { Sparkline } from "../Sparkline";
import { ProgressBar } from "../ProgressBar";

interface CpuDetailProps {
  cpu: CpuStats;
  history: number[];
}

export function CpuDetail({ cpu, history }: CpuDetailProps) {
  const cores = cpu.core_percentages || [];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Overall Stat Card */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Overall Load</span>
            {cores.length > 0 && (
              <span className="text-[10px] text-muted font-medium px-1.5 py-0.5 rounded bg-white/5 border border-border">
                {cores.length} Cores
              </span>
            )}
          </div>
          <span className="text-2xl font-bold tabular-nums text-card-foreground">
            {formatPercent(cpu.usage_percent)}
          </span>
        </div>
        <div className="w-full pt-1">
          <Sparkline data={history} width={340} height={72} />
        </div>
      </div>

      {/* Per-Core Breakdown Grid */}
      {cores.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted px-0.5">
            Core Utilization
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {cores.map((usage, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 p-2 rounded-[var(--radius-card)] bg-card border border-border hover:bg-[var(--color-card-hover)] transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-muted font-medium">#{idx + 1}</span>
                  <span className="text-xs font-semibold tabular-nums text-card-foreground">
                    {Math.round(usage)}%
                  </span>
                </div>
                <ProgressBar value={usage} className="!h-1" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
