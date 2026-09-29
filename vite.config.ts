import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Prevent vite from obscuring Tauri rust errors
  clearScreen: false,

  server: {
    // Tauri expects a fixed port; fail if it's in use
    port: 5173,
    strictPort: true,
    // Expose to Tauri webview
    host: "localhost",
  },
});
