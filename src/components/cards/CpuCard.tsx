import type { CpuStats } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { Sparkline } from "../Sparkline";

interface CpuCardProps {
  cpu: CpuStats;
  history: number[];
  isStacked?: boolean;
}

export function CpuCard({ cpu, history, isStacked = false }: CpuCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-colors duration-150 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">
          CPU
        </span>
        <span className="text-xl font-bold tabular-nums text-card-foreground">
          {formatPercent(cpu.usage_percent)}
        </span>
      </div>
      <div className="w-full pt-1">
        <Sparkline
          data={history}
          width={isStacked ? 280 : 150}
          height={isStacked ? 48 : 38}
        />
      </div>
    </div>
  );
}
