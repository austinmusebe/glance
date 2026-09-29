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
  height = 48,
  className = "",
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        viewBox={`0 0 ${width} ${height}`}
      />
    );
  }

  const maxPoints = 60;
  const padding = 1;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  const points = data.map((value, i) => {
    const x = padding + (i / (maxPoints - 1)) * drawWidth;
    const y = padding + drawHeight - (value / 100) * drawHeight;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${padding + ((data.length - 1) / (maxPoints - 1)) * drawWidth},${height} L ${padding},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.65 0.15 250)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.65 0.15 250)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkline-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke="oklch(0.65 0.15 250)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
