import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    include: ["wagmi", "viem", "ox"],
  },
  server: {
    host: "::",
    port: 8081,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("/@walletconnect/") ||
            id.includes("/@reown/")
          ) {
            return "walletconnect";
          }

          if (id.includes("/wagmi/") || id.includes("/viem/")) {
            return "wagmi";
          }

          if (id.includes("/ethers/")) {
            return "ethers";
          }

          if (id.includes("/framer-motion/")) {
            return "motion";
          }

          if (id.includes("/react-router") || id.includes("@remix-run/router")) {
            return "router";
          }

          if (id.includes("/@radix-ui/")) {
            return "radix";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
      "wagmi",
      "viem",
    ],
  },
}));
