import { describe, it, expect } from "vitest";
import {
  createSparklineBuffer,
  pushToBuffer,
  getBufferRange,
} from "../lib/sparkline-buffer";

describe("createSparklineBuffer", () => {
  it("creates empty buffer", () => {
    expect(createSparklineBuffer()).toEqual([]);
  });

  it("truncates initial data to 60 items", () => {
    const data = Array.from({ length: 80 }, (_, i) => i);
    const buffer = createSparklineBuffer(data);
    expect(buffer).toHaveLength(60);
    expect(buffer[0]).toBe(20);
    expect(buffer[59]).toBe(79);
  });

  it("keeps data under 60 items as-is", () => {
    const data = [10, 20, 30];
    expect(createSparklineBuffer(data)).toEqual([10, 20, 30]);
  });
});

describe("pushToBuffer", () => {
  it("appends to empty buffer", () => {
    expect(pushToBuffer([], 42)).toEqual([42]);
  });

  it("appends to partial buffer", () => {
    expect(pushToBuffer([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it("evicts oldest when full", () => {
    const full = Array.from({ length: 60 }, (_, i) => i);
    const result = pushToBuffer(full, 999);
    expect(result).toHaveLength(60);
    expect(result[0]).toBe(1);
    expect(result[59]).toBe(999);
  });

  it("returns new array (immutable)", () => {
    const original = [1, 2, 3];
    const result = pushToBuffer(original, 4);
    expect(result).not.toBe(original);
    expect(original).toEqual([1, 2, 3]);
  });
});

describe("getBufferRange", () => {
  it("returns default range for empty buffer", () => {
    expect(getBufferRange([])).toEqual({ min: 0, max: 100 });
  });

  it("returns padded range", () => {
    const range = getBufferRange([20, 50, 80]);
    expect(range.min).toBe(15);
    expect(range.max).toBe(85);
  });

  it("clamps min to 0", () => {
    const range = getBufferRange([2, 3]);
    expect(range.min).toBe(0);
  });

  it("clamps max to 100", () => {
    const range = getBufferRange([97, 99]);
    expect(range.max).toBe(100);
  });
});
