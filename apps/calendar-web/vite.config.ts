import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/", // Changed from "/seacalendar/" for Vercel deployment
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@seacalendar/shared": path.resolve(__dirname, "../backend/src/seacalendar/shared/dist"),
    },
  },
  optimizeDeps: {
    include: ["@seacalendar/shared"],
    exclude: ["@anthropic-ai/sdk"], // Server-only dependency
  },
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    allowedHosts: ['cal.billyeatstofu.com', 'localhost'],
    fs: {
      allow: ['..'], // Allow accessing workspace packages
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
