interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Pure SVG sparkline — plots up to 60 data points.
 * Fixed Y-axis 0–100 for percentage values.
 */
export function Sparkline({
  data,
  width = 280,
  height = 44,
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

  const points = data.map((value, i) => {
    const x = padding + (i / (maxPoints - 1)) * drawWidth;
    const y = padding + drawHeight - (Math.min(100, Math.max(0, value)) / 100) * drawHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const lastX = (padding + ((data.length - 1) / (maxPoints - 1)) * drawWidth).toFixed(1);
  const areaPath = `${linePath} L ${lastX},${height} L ${padding},${height} Z`;

  return (
    <svg
      width="100%"
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkline-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
