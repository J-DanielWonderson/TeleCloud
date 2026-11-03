import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  clearScreen: false,
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
  },
});
