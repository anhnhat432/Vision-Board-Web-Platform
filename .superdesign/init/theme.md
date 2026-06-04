# Design Theme & Tokens

This file contains the complete visual configuration of the design system, including Tailwind configuration and CSS variables.

## Tailwind Config (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[class~="dark"]'],
  theme: {
    extend: {
      colors: {
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
```

## CSS Tokens (`tokens.css`)

```css
:root {
  /* Green palette */
  --green-950: #152B25;
  --green-900: #1E3D35;
  --green-800: #264E43;
  --green-700: #2A5447;
  --green-600: #3A7261;
  --green-100: #E8F0EC;
  --green-050: #F2F7F4;

  /* Terracotta palette */
  --terra-800: #A8522F;
  --terra-700: #C96843;
  --terra-600: #D36A47;
  --terra-100: #FCEDE5;
  --terra-050: #FEF6F1;
  --terra-strong: #5C3A2E;
  --terra-border: #ECD4C6;

  /* Neutral palette */
  --neutral-950: #1A1A1A;
  --neutral-700: #4A4A4A;
  --neutral-500: #6B6B6B;
  --neutral-400: #8A8A8A;
  --neutral-300: #B8B2AA;
  --neutral-200: #D4CFC8;
  --neutral-150: #EAE5DB;
  --neutral-050: #FCFAF7;
  --neutral-000: #FFFFFF;

  /* Status palette */
  --status-green:  #3A7D5E;
  --status-amber:  #C4841A;
  --status-red:    #B84040;
  --status-blue:   #3A6B9E;
}

:root {
  --app-radius-card: 14px;
  --app-radius-pill: 9999px;
  --app-radius-input: 10px;
  --app-radius-control: 11px;
  --app-section-gap: 24px;
  --app-section-gap-compact: 20px;
  --app-card-padding: 24px;
  --app-card-padding-mobile: 20px;

  --app-bg:          var(--neutral-050);
  --app-bg-subtle:   #F8F6F2;
  --app-surface:     var(--neutral-000);
  --app-overlay:     rgba(26, 26, 26, 0.40);

  --app-ink:         var(--neutral-950);
  --app-ink-soft:    var(--neutral-700);
  --app-ink-muted:   var(--neutral-500);
  --app-ink-disabled: var(--neutral-300);
  --app-ink-on-accent: var(--neutral-000);
  --app-ink-on-warm:  var(--neutral-000);
  --app-ink-link:    var(--green-700);

  --app-line:        var(--neutral-150);
  --app-line-strong: var(--neutral-200);

  --app-accent:        var(--green-700);
  --app-accent-hover:  var(--green-800);
  --app-accent-active: var(--green-900);
  --app-accent-soft:   var(--green-100);
  --app-accent-subtle: var(--green-050);

  --app-warm:          var(--terra-600);
  --app-warm-hover:    var(--terra-700);
  --app-warm-active:   var(--terra-800);
  --app-warm-soft:     var(--terra-100);
  --app-warm-subtle:   var(--terra-050);
  --app-warm-strong:   var(--terra-strong);
  --app-warm-border:   var(--terra-border);

  --app-status-success: var(--status-green);
  --app-status-warning: var(--status-amber);
  --app-status-error:   var(--status-red);
  --app-status-info:    var(--status-blue);

  --app-focus-ring: 0 0 0 4px rgba(47, 93, 80, 0.2);
  --app-focus-ring-warm: 0 0 0 4px rgba(217, 119, 87, 0.2);

  --app-shadow-sm:
    0 1px 2px rgba(26, 26, 26, 0.04),
    0 0 0 1px rgba(26, 26, 26, 0.01);
  --app-shadow-md:
    0 6px 16px -4px rgba(26, 26, 26, 0.06),
    0 2px 6px -2px rgba(26, 26, 26, 0.03);
  --app-shadow-lg:
    0 12px 32px -8px rgba(26, 26, 26, 0.08),
    0 4px 12px -4px rgba(26, 26, 26, 0.03);
  --app-shadow-xl:
    0 20px 48px -12px rgba(26, 26, 26, 0.10),
    0 8px 20px -6px rgba(26, 26, 26, 0.04);
}

html.dark {
  --app-bg:          #1C1A15;
  --app-bg-subtle:   #211F1A;
  --app-surface:     #26231D;
  --app-overlay:     rgba(0, 0, 0, 0.60);

  --app-ink:         #F2EDE5;
  --app-ink-soft:    #C8C2B5;
  --app-ink-muted:   #A39B8C;
  --app-ink-disabled: #6B6358;
  --app-ink-on-accent: #FFFFFF;
  --app-ink-on-warm:  #FFFFFF;
  --app-ink-link:    #5BA590;

  --app-line:        #3A342B;
  --app-line-strong: #4A4239;

  --app-accent:        #5BA590;
  --app-accent-hover:  #4D9480;
  --app-accent-active: #3E7A68;
  --app-accent-soft:   #1F3A33;
  --app-accent-subtle: #192E28;

  --app-warm:          #E89878;
  --app-warm-hover:    #D98060;
  --app-warm-active:   #C96843;
  --app-warm-soft:     #3A2820;
  --app-warm-subtle:   #2E201A;
  --app-warm-strong:   #F8D5C2;
  --app-warm-border:   #5C3A2E;
}
```
