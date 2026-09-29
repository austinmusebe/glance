import { useEffect } from "react";
import { useSettings } from "./hooks/useSettings";
import { FlyoutPanel } from "./components/FlyoutPanel";

function App() {
  const { settings } = useSettings();

  // Apply Light / Dark / System theme
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (theme: "light" | "dark" | "system") => {
      let isDark = true;
      if (theme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      } else {
        isDark = theme === "dark";
      }

      if (isDark) {
        root.classList.remove("light");
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    };

    applyTheme(settings.theme);

    if (settings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  // Apply custom accent color to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const hex = (settings.accent_color || "#3b82f6").trim();
    const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;

    if (/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      root.style.setProperty("--color-accent", `rgb(${r}, ${g}, ${b})`);
      root.style.setProperty("--color-accent-dim", `rgba(${r}, ${g}, ${b}, 0.2)`);
    }
  }, [settings.accent_color]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-card-foreground backdrop-blur-xl transition-colors duration-200">
      <FlyoutPanel />
    </div>
  );
}

export default App;
