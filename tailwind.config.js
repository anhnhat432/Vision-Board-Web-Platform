/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[class~="dark"]'],
  theme: {
    extend: {
      colors: {
        /* ── App brand tokens ──────────────────────────────────
         * LUÔN dùng những token này thay vì màu hard-coded.
         * Quy tắc:
         *   app-accent-*  → Execution / Action / Progress screens
         *   app-warm-*    → CHỈ Reflection / Review screens
         * ───────────────────────────────────────────────────── */

        /* Background */
        "app-bg":          "var(--app-bg)",
        "app-bg-subtle":   "var(--app-bg-subtle)",
        "app-surface":     "var(--app-surface)",

        /* Text */
        "app-ink":          "var(--app-ink)",
        "app-ink-soft":     "var(--app-ink-soft)",
        "app-ink-muted":    "var(--app-ink-muted)",
        "app-ink-disabled": "var(--app-ink-disabled)",
        "app-ink-link":     "var(--app-ink-link)",

        /* Border */
        "app-line":        "var(--app-line)",
        "app-line-strong": "var(--app-line-strong)",

        /* Accent — Forest Green (Execution zone) */
        "app-accent":        "var(--app-accent)",
        "app-accent-hover":  "var(--app-accent-hover)",
        "app-accent-soft":   "var(--app-accent-soft)",
        "app-accent-subtle": "var(--app-accent-subtle)",

        /* Warm — Terracotta (Reflection zone ONLY) */
        "app-warm":          "var(--app-warm)",
        "app-warm-hover":    "var(--app-warm-hover)",
        "app-warm-soft":     "var(--app-warm-soft)",
        "app-warm-subtle":   "var(--app-warm-subtle)",
        "app-warm-strong":   "var(--app-warm-strong)",
        "app-warm-border":   "var(--app-warm-border)",

        /* Status */
        "app-status-success": "var(--app-status-success)",
        "app-status-warning": "var(--app-status-warning)",
        "app-status-error":   "var(--app-status-error)",
        "app-status-info":    "var(--app-status-info)",
      },

      fontFamily: {
        sans: [
          "Be Vietnam Pro",
          "Inter",
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
        card:    "var(--app-radius-card)",    /* 14px — card, panel */
        pill:    "var(--app-radius-pill)",    /* 9999px — tag, badge */
        input:   "var(--app-radius-input)",   /* 10px — input, select */
        control: "var(--app-radius-control)", /* 11px — checkbox, toggle */
      },

      boxShadow: {
        /* App-branded shadows — neutral tone, không dùng màu accent */
        "app-sm": "var(--app-shadow-sm)",
        "app-md": "var(--app-shadow-md)",
        "app-lg": "var(--app-shadow-lg)",
        "app-xl": "var(--app-shadow-xl)",
      },

      spacing: {
        "section": "var(--app-section-gap)",           /* 24px */
        "section-compact": "var(--app-section-gap-compact)", /* 20px */
        "card-pad": "var(--app-card-padding)",         /* 24px */
        "card-pad-mobile": "var(--app-card-padding-mobile)", /* 20px */
      },
    },
  },
};
