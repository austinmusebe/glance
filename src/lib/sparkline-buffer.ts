const MAX_LENGTH = 60;

/**
 * Ring buffer that keeps the most recent `MAX_LENGTH` data points.
 * Used for sparkline history (60 seconds at 1s intervals).
 */
export function createSparklineBuffer(initial: number[] = []): number[] {
  return initial.slice(-MAX_LENGTH);
}

/**
 * Push a new value onto the buffer, evicting the oldest if full.
 * Returns a new array (immutable for React state).
 */
export function pushToBuffer(buffer: number[], value: number): number[] {
  const next = [...buffer, value];
  if (next.length > MAX_LENGTH) {
    return next.slice(next.length - MAX_LENGTH);
  }
  return next;
}

/**
 * Get the min and max values from the buffer for Y-axis scaling.
 */
export function getBufferRange(buffer: number[]): { min: number; max: number } {
  if (buffer.length === 0) return { min: 0, max: 100 };
  const min = Math.min(...buffer);
  const max = Math.max(...buffer);
  // Ensure there's always some range to avoid a flat line at 0
  return { min: Math.max(0, min - 5), max: Math.min(100, max + 5) };
}
