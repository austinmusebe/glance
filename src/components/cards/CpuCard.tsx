import type { CpuStats } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { Sparkline } from "../Sparkline";

interface CpuCardProps {
  cpu: CpuStats;
  history: number[];
}

export function CpuCard({ cpu, history }: CpuCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-card)] bg-card p-3 border border-border">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-wide uppercase text-muted">
          CPU
        </span>
        <span className="text-xl font-semibold tabular-nums text-card-foreground">
          {formatPercent(cpu.usage_percent)}
        </span>
      </div>
      <Sparkline data={history} width={148} height={40} />
    </div>
  );
}
