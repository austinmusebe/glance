import type { RamStats } from "../../lib/types";
import { formatBytes, formatPercent } from "../../lib/format";
import { Sparkline } from "../Sparkline";
import { ProgressBar } from "../ProgressBar";

interface RamDetailProps {
  ram: RamStats;
  history: number[];
}

export function RamDetail({ ram, history }: RamDetailProps) {
  const topProcesses = ram.top_processes || [];

  return (
    <div className="flex flex-col gap-3">
      {/* Primary Usage Card */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted">Memory In Use</span>
            <span className="text-xs text-muted">
              {formatBytes(ram.used_bytes)} of {formatBytes(ram.total_bytes)}
            </span>
          </div>
          <span className="text-2xl font-bold tabular-nums text-card-foreground">
            {formatPercent(ram.usage_percent)}
          </span>
        </div>

        <ProgressBar value={ram.usage_percent} />

        <div className="w-full pt-1">
          <Sparkline data={history} width={340} height={64} />
        </div>
      </div>

      {/* Top 5 Processes by RAM */}
      {topProcesses.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Top Processes (RAM)
            </span>
            <span className="text-[10px] text-muted">Memory</span>
          </div>

          <div className="flex flex-col gap-1 rounded-[var(--radius-card)] bg-card p-2 border border-border">
            {topProcesses.map((proc, idx) => (
              <div
                key={`${proc.pid}-${idx}`}
                className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-white/5 transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] tabular-nums text-muted w-3 text-right">
                    {idx + 1}
                  </span>
                  <span
                    className="font-medium text-card-foreground truncate max-w-[190px]"
                    title={`${proc.name} (PID: ${proc.pid})`}
                  >
                    {proc.name}
                  </span>
                </div>
                <span className="tabular-nums font-semibold text-card-foreground shrink-0 text-xs">
                  {formatBytes(proc.memory_bytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
