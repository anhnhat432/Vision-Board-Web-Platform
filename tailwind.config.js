/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        "app-bg": "var(--app-bg)",
        "app-surface": "var(--app-surface)",
        "app-ink": "var(--app-ink)",
        "app-ink-soft": "var(--app-ink-soft)",
        "app-ink-muted": "var(--app-ink-muted)",
        "app-line": "var(--app-line)",
        "app-accent": "var(--app-accent)",
        "app-accent-soft": "var(--app-accent-soft)",
        "app-warm": "var(--app-warm)",
        "app-warm-soft": "var(--app-warm-soft)",
        "app-warm-strong": "var(--app-warm-strong)",
        "app-warm-border": "var(--app-warm-border)",
      },
      fontFamily: {
        sans: [
          "Be Vietnam Pro",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "Source Serif 4 Variable",
          "Source Serif 4",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
};
