import { useEffect } from "react";
import { useSettings } from "./hooks/useSettings";
import { FlyoutPanel } from "./components/FlyoutPanel";

function App() {
  const { settings } = useSettings();

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

  return (
    <div className="h-screen w-screen overflow-hidden">
      <FlyoutPanel />
    </div>
  );
}

export default App;
