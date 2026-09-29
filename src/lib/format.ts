const UNITS = ["B/s", "KB/s", "MB/s", "GB/s"] as const;

/**
 * Format bytes-per-second into a human-readable throughput string.
 * e.g. 1536 → "1.5 KB/s", 2_500_000 → "2.4 MB/s"
 */
export function formatThroughput(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "0 B/s";

  let unitIndex = 0;
  let value = bytesPerSec;

  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${UNITS[unitIndex]}`;
}

/**
 * Format bytes into a human-readable size string.
 * e.g. 13_421_772_800 → "12.5 GB"
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

/**
 * Format a percentage with one decimal place.
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format seconds into human readable duration (e.g. "2h 15m" or "45m").
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
