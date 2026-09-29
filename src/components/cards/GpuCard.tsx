import type { GpuAdapter } from "../../lib/types";
import { formatPercent } from "../../lib/format";
import { ProgressBar } from "../ProgressBar";

interface GpuCardProps {
  gpus: GpuAdapter[];
}

function cleanGpuName(raw: string): string {
  return raw
    .replace(/^NVIDIA\s+GeForce\s+/i, "")
    .replace(/^AMD\s+Radeon\s+/i, "")
    .replace(/^Intel\(R\)\s+/i, "")
    .replace(/\s+Graphics/i, "")
    .trim();
}

export function GpuCard({ gpus }: GpuCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-colors duration-150 shadow-sm justify-between">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">
        GPU
      </span>
      {gpus.length === 0 ? (
        <div className="py-2 text-xs text-muted">No GPU detected</div>
      ) : (
        <div className="flex flex-col gap-2">
          {gpus.map((gpu) => (
            <div key={gpu.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-1">
                <span
                  className="text-xs text-card-foreground font-medium truncate max-w-[105px]"
                  title={gpu.name}
                >
                  {cleanGpuName(gpu.name)}
                </span>
                <span className="text-sm font-semibold tabular-nums text-card-foreground">
                  {formatPercent(gpu.usage_percent)}
                </span>
              </div>
              <ProgressBar value={gpu.usage_percent} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
