import type { BatteryStats } from "../../lib/types";
import { formatDuration } from "../../lib/format";
import { ProgressBar } from "../ProgressBar";

interface BatteryCardProps {
  battery?: BatteryStats | null;
  onClick?: () => void;
}

export function BatteryCard({ battery, onClick }: BatteryCardProps) {
  if (!battery) {
    return null;
  }

  const isCharging = battery.is_charging;
  const isPlugged = battery.is_plugged_in;
  const percent = battery.percent;

  let statusText = "On Battery";
  if (isCharging) {
    statusText = "Charging";
  } else if (isPlugged && percent >= 99) {
    statusText = "Fully Charged";
  } else if (isPlugged) {
    statusText = "Plugged In";
  } else if (battery.time_remaining_secs && battery.time_remaining_secs > 0) {
    statusText = `${formatDuration(battery.time_remaining_secs)} left`;
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`col-span-2 flex flex-col gap-2 rounded-[var(--radius-card)] bg-card hover:bg-[var(--color-card-hover)] p-3 border border-border transition-all duration-150 shadow-sm justify-between ${
        onClick
          ? "cursor-pointer active:scale-[0.98] select-none hover:border-[var(--color-border-hover)]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted">
          Battery
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {isPlugged && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isCharging ? "text-[var(--color-accent)] animate-pulse" : "text-muted"}
            >
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          )}
          <span>{statusText}</span>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xl font-bold tabular-nums text-card-foreground">
          {percent}%
        </span>
        {battery.time_remaining_secs && !isCharging && (
          <span className="text-xs tabular-nums text-muted">
            {formatDuration(battery.time_remaining_secs)} remaining
          </span>
        )}
      </div>

      <ProgressBar
        value={percent}
        className={percent <= 20 && !isPlugged ? "!bg-red-500/20" : ""}
      />
    </div>
  );
}
