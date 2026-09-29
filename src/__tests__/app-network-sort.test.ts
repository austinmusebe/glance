import { describe, it, expect } from "vitest";
import type { AppNetworkUsage } from "../lib/types";

describe("AppNetworkUsage sorting logic", () => {
  const sampleApps: AppNetworkUsage[] = [
    { name: "chrome.exe", rx_bytes: 50_000_000, tx_bytes: 2_000_000, total_bytes: 52_000_000 },
    { name: "discord.exe", rx_bytes: 10_000_000, tx_bytes: 15_000_000, total_bytes: 25_000_000 },
    { name: "spotify.exe", rx_bytes: 30_000_000, tx_bytes: 500_000, total_bytes: 30_500_000 },
  ];

  it("sorts by total descending", () => {
    const sorted = [...sampleApps].sort((a, b) => b.total_bytes - a.total_bytes);
    expect(sorted.map((a) => a.name)).toEqual(["chrome.exe", "spotify.exe", "discord.exe"]);
  });

  it("sorts by download (rx) descending", () => {
    const sorted = [...sampleApps].sort((a, b) => b.rx_bytes - a.rx_bytes);
    expect(sorted.map((a) => a.name)).toEqual(["chrome.exe", "spotify.exe", "discord.exe"]);
  });

  it("sorts by upload (tx) descending", () => {
    const sorted = [...sampleApps].sort((a, b) => b.tx_bytes - a.tx_bytes);
    expect(sorted.map((a) => a.name)).toEqual(["discord.exe", "chrome.exe", "spotify.exe"]);
  });

  it("sorts by upload (tx) ascending", () => {
    const sorted = [...sampleApps].sort((a, b) => a.tx_bytes - b.tx_bytes);
    expect(sorted.map((a) => a.name)).toEqual(["spotify.exe", "chrome.exe", "discord.exe"]);
  });

  it("sorts by download (rx) ascending", () => {
    const sorted = [...sampleApps].sort((a, b) => a.rx_bytes - b.rx_bytes);
    expect(sorted.map((a) => a.name)).toEqual(["discord.exe", "spotify.exe", "chrome.exe"]);
  });
});
