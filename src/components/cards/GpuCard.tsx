import type { GpuAdapter } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { ProgressBar } from "../ProgressBar";

interface GpuCardProps {
  gpus: GpuAdapter[];
}

export function GpuCard({ gpus }: GpuCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
      <span className="text-[11px] font-medium tracking-wide uppercase text-muted">
        GPU
      </span>
      {gpus.length === 0 ? (
        <span className="text-xs text-muted">No GPU data</span>
      ) : (
        gpus.map((gpu) => (
          <div key={gpu.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-card-foreground truncate max-w-[100px]" title={gpu.name}>
                {gpu.name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-card-foreground">
                {formatPercent(gpu.usage_percent)}
              </span>
            </div>
            <ProgressBar value={gpu.usage_percent} />
          </div>
        ))
      )}
    </div>
  );
}
