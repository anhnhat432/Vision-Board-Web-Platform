import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used - do not remove them.
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./backend/src/shared"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          const normalizedId = id.replaceAll("\\", "/");

          if (
            normalizedId.includes("/node_modules/@sentry/") ||
            normalizedId.includes("/node_modules/@sentry-internal/")
          ) {
            return "monitoring";
          }
          if (normalizedId.includes("react-router")) return "router";
          if (normalizedId.includes("d3-")) return "charts";
          if (normalizedId.includes("sonner") || normalizedId.includes("next-themes")) return "feedback";
          if (normalizedId.includes("canvas-confetti")) return "effects";
          if (normalizedId.includes("react-day-picker") || normalizedId.includes("date-fns")) return "calendar";
          if (
            normalizedId.includes("embla-carousel-react") ||
            normalizedId.includes("react-responsive-masonry") ||
            normalizedId.includes("react-slick")
          ) {
            return "media";
          }
          if (
            normalizedId.includes("cmdk") ||
            normalizedId.includes("react-hook-form") ||
            normalizedId.includes("input-otp")
          ) {
            return "forms";
          }
          if (normalizedId.includes("react-markdown") || normalizedId.includes("remark-")) return "markdown";
          if (normalizedId.includes("html-to-image") || normalizedId.includes("qrcode")) return "exporting";
          if (normalizedId.includes("@emotion") || normalizedId.includes("@mui/")) return "mui";
          if (normalizedId.includes("react-dnd") || normalizedId.includes("dnd-core")) return "dnd";
          if (normalizedId.includes("motion") || normalizedId.includes("framer-motion")) return "motion";
          if (normalizedId.includes("@radix-ui")) return "radix";
          if (normalizedId.includes("lucide-react")) return "icons";
          if (normalizedId.includes("firebase")) return "firebase";

          return "vendor";
        },
      },
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
