import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({}),
}));

describe("Settings Store & Accent Color Real-time Updates", () => {
  let styleProperties: Record<string, string> = {};
  let classes: Set<string> = new Set();

  beforeEach(() => {
    styleProperties = {};
    classes = new Set();

    // Mock document and documentElement for node test environment
    (globalThis as any).document = {
      documentElement: {
        style: {
          setProperty: (key: string, value: string) => {
            styleProperties[key] = value;
          },
          getPropertyValue: (key: string) => styleProperties[key] || "",
        },
        classList: {
          add: (cls: string) => classes.add(cls),
          remove: (cls: string) => classes.delete(cls),
          contains: (cls: string) => classes.has(cls),
        },
      },
    };
  });

  it("immediately updates --color-accent and --color-accent-dim on documentElement", async () => {
    const { applyAccentColor } = await import("../hooks/useSettings");
    applyAccentColor("#ff5722");

    // #ff5722 -> r: 255, g: 87, b: 34
    expect(styleProperties["--color-accent"]).toBe("rgb(255, 87, 34)");
    expect(styleProperties["--color-accent-dim"]).toBe("rgba(255, 87, 34, 0.2)");
  });

  it("handles hex colors with or without # prefix", async () => {
    const { applyAccentColor } = await import("../hooks/useSettings");
    applyAccentColor("10b981");

    // #10b981 -> r: 16, g: 185, b: 129
    expect(styleProperties["--color-accent"]).toBe("rgb(16, 185, 129)");
    expect(styleProperties["--color-accent-dim"]).toBe("rgba(16, 185, 129, 0.2)");
  });

  it("updateSettings immediately updates DOM CSS variables without restart", async () => {
    const { updateSettings } = await import("../hooks/useSettings");
    await updateSettings({ accent_color: "#8b5cf6" });

    // #8b5cf6 -> r: 139, g: 92, b: 246
    expect(styleProperties["--color-accent"]).toBe("rgb(139, 92, 246)");
    expect(styleProperties["--color-accent-dim"]).toBe("rgba(139, 92, 246, 0.2)");
  });

  it("applyTheme immediately toggles dark and light classes", async () => {
    const { applyTheme } = await import("../hooks/useSettings");
    applyTheme("light");
    expect(classes.has("light")).toBe(true);
    expect(classes.has("dark")).toBe(false);

    applyTheme("dark");
    expect(classes.has("dark")).toBe(true);
    expect(classes.has("light")).toBe(false);
  });
});
