import { describe, it, expect } from "vitest";
import { formatThroughput, formatBytes, formatPercent } from "../lib/format";

describe("formatThroughput", () => {
  it("formats zero", () => {
    expect(formatThroughput(0)).toBe("0 B/s");
  });

  it("formats small bytes", () => {
    expect(formatThroughput(512)).toBe("512 B/s");
  });

  it("formats kilobytes", () => {
    expect(formatThroughput(1536)).toBe("1.5 KB/s");
  });

  it("formats megabytes", () => {
    expect(formatThroughput(2_500_000)).toBe("2.4 MB/s");
  });

  it("formats gigabytes", () => {
    expect(formatThroughput(1_500_000_000)).toBe("1.4 GB/s");
  });

  it("rounds large values", () => {
    expect(formatThroughput(15_000_000)).toBe("14 MB/s");
  });
});

describe("formatBytes", () => {
  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats gigabytes with decimal", () => {
    // 8 GB exactly
    expect(formatBytes(8_589_934_592)).toBe("8.0 GB");
  });

  it("formats partial gigabytes", () => {
    // 13_421_772_800 / 1024^3 = 12.5 → rounds to 13
    expect(formatBytes(13_421_772_800)).toBe("13 GB");
  });

  it("formats megabytes", () => {
    // 5 MB exactly → 5.0 MB
    expect(formatBytes(5_242_880)).toBe("5.0 MB");
  });
});

describe("formatPercent", () => {
  it("rounds to integer", () => {
    expect(formatPercent(23.7)).toBe("24%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("handles 100", () => {
    expect(formatPercent(100)).toBe("100%");
  });
});
