interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

/**
 * Thin horizontal progress bar for utilization display.
 * Animate width changes smoothly with restraint.
 */
export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300 ease-out"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
