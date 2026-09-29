import type { GpuAdapter } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { Sparkline } from "../Sparkline";
import { ProgressBar } from "../ProgressBar";

interface GpuDetailProps {
  gpus: GpuAdapter[];
  gpuHistory: Record<string, number[]>;
}

export function GpuDetail({ gpus, gpuHistory }: GpuDetailProps) {
  if (gpus.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted">
        No physical GPU adapters detected.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {gpus.map((gpu) => {
        const history = gpuHistory[gpu.id] || [];

        return (
          <div
            key={gpu.id}
            className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border hover:bg-[var(--color-card-hover)] transition-colors"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-card-foreground truncate" title={gpu.name}>
                {gpu.name}
              </span>
              <span className="text-lg font-bold tabular-nums text-card-foreground">
                {formatPercent(gpu.usage_percent)}
              </span>
            </div>

            <ProgressBar value={gpu.usage_percent} />

            <div className="w-full pt-1">
              <Sparkline data={history} width={340} height={54} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
