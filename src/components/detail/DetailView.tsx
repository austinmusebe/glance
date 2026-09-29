import type { MetricType, SystemStats } from "../../lib/types";
import { Sparkline } from "../Sparkline";

interface DetailViewProps {
  metric: MetricType;
  stats: SystemStats;
  cpuHistory: number[];
  onBack: () => void;
}

const METRIC_TITLES: Record<MetricType, string> = {
  cpu: "Processor",
  gpu: "Graphics",
  ram: "Memory",
  network: "Network",
  battery: "Battery",
};

export function DetailView({ metric, stats, cpuHistory, onBack }: DetailViewProps) {
  const title = METRIC_TITLES[metric];

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Detail Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-card-foreground transition-colors py-1 px-1.5 -ml-1 rounded hover:bg-white/5 active:scale-95 cursor-pointer font-medium"
          aria-label="Back to overview"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>Overview</span>
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-card-foreground">
          {title}
        </span>
      </div>

      {/* Metric Detail Content */}
      <div className="flex-1 py-3 overflow-y-auto flex flex-col gap-3">
        {metric === "cpu" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">CPU Utilization</span>
              <span className="text-xl font-bold tabular-nums text-card-foreground">
                {Math.round(stats.cpu.usage_percent)}%
              </span>
            </div>
            <div className="rounded-[var(--radius-card)] bg-card p-2.5 border border-border">
              <Sparkline data={cpuHistory} width={340} height={70} />
            </div>
          </div>
        )}

        {metric === "gpu" && (
          <div className="flex flex-col gap-2">
            {stats.gpu.map((gpu) => (
              <div key={gpu.id} className="flex flex-col gap-1 rounded bg-card p-2 border border-border">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-card-foreground">{gpu.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-card-foreground">
                    {Math.round(gpu.usage_percent)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {metric === "ram" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">Memory Usage</span>
              <span className="text-xl font-bold tabular-nums text-card-foreground">
                {Math.round(stats.ram.usage_percent)}%
              </span>
            </div>
          </div>
        )}

        {metric === "network" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">Network Throughput</span>
            </div>
          </div>
        )}

        {metric === "battery" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted">Battery Status</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
