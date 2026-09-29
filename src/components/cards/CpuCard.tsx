import type { CpuStats } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { Sparkline } from "../Sparkline";

interface CpuCardProps {
  cpu: CpuStats;
  history: number[];
  isStacked?: boolean;
  onClick?: () => void;
}

export function CpuCard({ cpu, history, isStacked = false, onClick }: CpuCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`flex flex-col gap-1.5 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-all duration-150 shadow-sm ${
        onClick ? "cursor-pointer active:scale-[0.98] select-none hover:border-[var(--color-border-hover)]" : ""
      }`}
    >
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
