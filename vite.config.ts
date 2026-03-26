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
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react-router")) return "router";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("sonner") || id.includes("next-themes")) return "feedback";
          if (id.includes("canvas-confetti")) return "effects";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "calendar";
          if (
            id.includes("embla-carousel-react") ||
            id.includes("react-responsive-masonry") ||
            id.includes("react-slick")
          ) {
            return "media";
          }
          if (
            id.includes("cmdk") ||
            id.includes("react-hook-form") ||
            id.includes("input-otp")
          ) {
            return "forms";
          }
          if (id.includes("@emotion") || id.includes("@mui/")) return "mui";
          if (id.includes("react-dnd") || id.includes("dnd-core")) return "dnd";
          if (id.includes("motion") || id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";

          return "vendor";
        },
      },
    },
  },
  assetsInclude: ["**/*.svg", "**/*.csv"],
});
