interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  max?: number;
  strokeColor?: string;
  className?: string;
}

/**
 * Pure SVG sparkline — plots up to 60 data points.
 * Customizable max value (defaults to 100 for percentages).
 */
export function Sparkline({
  data,
  width = 280,
  height = 44,
  max = 100,
  strokeColor = "var(--color-accent)",
  className = "",
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg
        width="100%"
        height={height}
        className={className}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={height - 2}
          x2={width}
          y2={height - 2}
          stroke="var(--color-border)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
    );
  }

  const maxPoints = 60;
  const padding = 2;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;
  const effectiveMax = Math.max(1, max);

  const points = data.map((value, i) => {
    const x = padding + (i / (maxPoints - 1)) * drawWidth;
    const clamped = Math.min(effectiveMax, Math.max(0, value));
    const y = padding + drawHeight - (clamped / effectiveMax) * drawHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const lastX = (padding + ((data.length - 1) / (maxPoints - 1)) * drawWidth).toFixed(1);
  const areaPath = `${linePath} L ${lastX},${height} L ${padding},${height} Z`;

  const gradId = `sparkline-fill-${strokeColor.replace(/[^a-zA-Z0-9]/g, "") || "def"}`;

  return (
    <svg
      width="100%"
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
