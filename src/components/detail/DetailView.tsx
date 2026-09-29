import type { MetricType, SystemStats } from "../../lib/types";
import { formatDuration } from "../../lib/format";
import { CpuDetail } from "./CpuDetail";
import { GpuDetail } from "./GpuDetail";
import { RamDetail } from "./RamDetail";
import { NetworkDetail } from "./NetworkDetail";

interface DetailViewProps {
  metric: MetricType;
  stats: SystemStats;
  cpuHistory: number[];
  ramHistory?: number[];
  netDownHistory?: number[];
  netUpHistory?: number[];
  gpuHistory?: Record<string, number[]>;
  onBack: () => void;
}

const METRIC_TITLES: Record<MetricType, string> = {
  cpu: "Processor",
  gpu: "Graphics",
  ram: "Memory",
  network: "Network",
  battery: "Battery",
};

export function DetailView({
  metric,
  stats,
  cpuHistory,
  ramHistory = [],
  netDownHistory = [],
  netUpHistory = [],
  gpuHistory = {},
  onBack,
}: DetailViewProps) {
  const title = METRIC_TITLES[metric];

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Detail Navigation Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted hover:text-card-foreground transition-colors py-1 px-1.5 -ml-1 rounded hover:bg-[var(--color-item-hover)] active:scale-95 cursor-pointer font-medium"
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
          <CpuDetail cpu={stats.cpu} history={cpuHistory} />
        )}

        {metric === "gpu" && (
          <GpuDetail gpus={stats.gpu} gpuHistory={gpuHistory} />
        )}

        {metric === "ram" && (
          <RamDetail ram={stats.ram} history={ramHistory} />
        )}

        {metric === "network" && (
          <NetworkDetail
            network={stats.network}
            downHistory={netDownHistory}
            upHistory={netUpHistory}
          />
        )}

        {metric === "battery" && (
          <div className="flex flex-col gap-3">
            {stats.battery ? (
              <>
                <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted">Charge Level</span>
                    <span className="text-2xl font-bold tabular-nums text-card-foreground">
                      {stats.battery.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-border)] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        stats.battery.is_charging
                          ? "bg-[var(--color-accent)]"
                          : stats.battery.percent <= 20
                          ? "bg-red-500"
                          : "bg-[var(--color-accent)]"
                      }`}
                      style={{ width: `${stats.battery.percent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-card p-3 border border-border text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="text-muted">Power Source</span>
                    <span className="font-medium text-card-foreground">
                      {stats.battery.is_plugged_in ? "Power Adapter (AC)" : "Battery"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-border">
                    <span className="text-muted">State</span>
                    <span className="font-medium text-card-foreground">
                      {stats.battery.is_charging
                        ? "Charging"
                        : stats.battery.is_plugged_in
                        ? "Plugged In"
                        : "Discharging"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted">Time Remaining</span>
                    <span className="font-medium text-card-foreground tabular-nums">
                      {stats.battery.time_remaining_secs && stats.battery.time_remaining_secs > 0
                        ? formatDuration(stats.battery.time_remaining_secs)
                        : stats.battery.is_charging
                        ? "Charging"
                        : stats.battery.is_plugged_in
                        ? "Full"
                        : "Calculating..."}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-xs text-muted">
                No system battery detected.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
