import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// "vite build --mode appsscript" builds ONE self-contained index.html (what Apps Script serves).
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "appsscript" ? [viteSingleFile()] : [])],
  base: "./",
}));