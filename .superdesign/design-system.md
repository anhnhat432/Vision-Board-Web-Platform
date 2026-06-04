# Design System - Vision Board Web Platform

This document defines the visual standards, color palettes, typography, spacing, and UI components allowed in the Vision Board Web Platform.

## 1. Product Context & Archetype

Vision Board Web Platform is a local-first production web app that helps users turn their life vision into SMART goals, feasibility checks, 12-week execution plans, weekly action, and reflection.

Key Design Goals:
- Calm, premium, production SaaS feel.
- High trust: clear offline capabilities, sync statuses, billing flows, real accounts.
- Separate **thinking/reflection** (terracotta theme) from **action/execution** (forest green theme).

## 2. Color System

We use a semantic color tokens system. Do not introduce arbitrary colors or gradients.

### Core Palettes
- **Accent (Forest Green)**: Used for Execution, Goals, 12-Week Planning, Action, and general UI.
  - `--app-accent`: `#2A5447` (green-700)
  - `--app-accent-hover`: `#264E43` (green-800)
  - `--app-accent-soft`: `#E8F0EC` (green-100)
  - `--app-accent-subtle`: `#F2F7F4` (green-050)
- **Warm (Terracotta)**: Used ONLY for Reflection, Review, and Journaling screens. Do not mix with Accent.
  - `--app-warm`: `#D36A47` (terra-600)
  - `--app-warm-hover`: `#C96843` (terra-700)
  - `--app-warm-soft`: `#FCEDE5` (terra-100)
  - `--app-warm-subtle`: `#FEF6F1` (terra-050)
  - `--app-warm-strong`: `#5C3A2E` (terra-strong)
  - `--app-warm-border`: `#ECD4C6` (terra-border)
- **Neutrals**: Used for structure, borders, and typography.
  - `--app-bg`: `#FCFAF7` (neutral-050, light warm background)
  - `--app-surface`: `#FFFFFF` (pure white card/surface)
  - `--app-line`: `#EAE5DB` (neutral-150 border)
  - `--app-ink`: `#1A1A1A` (neutral-950 main text)
  - `--app-ink-soft`: `#4A4A4A` (neutral-700 description text)
  - `--app-ink-muted`: `#6B6B6B` (neutral-500 placeholder/caption)

## 3. Typography

- **Sans (Body, labels, forms)**: `Be Vietnam Pro`, `Inter`, sans-serif.
- **Serif (Headings, quotes, reflection prompts)**: `Source Serif 4 Variable`, `Source Serif 4`, Georgia, serif.
- Spacing & Rhythm: Use clean line heights (1.5 for body, 1.25 for titles) and letter spacing tracking.

## 4. Layout & Spacing

- Card Border Radius: `var(--app-radius-card)` (14px).
- Input/Select Border Radius: `var(--app-radius-input)` (10px).
- Control/Checkbox Border Radius: `var(--app-radius-control)` (11px).
- Section Gap: `24px` (`var(--app-section-gap)`).
- Card Padding: `24px` (desktop), `20px` (mobile).

## 5. UI Primitives & Components

We reuse standardized primitives:
- **Button**: Default (accent bg), Outline (border + hover bg), Ghost (transparent + hover ink/5), Destructive (danger-bg).
- **Card**: Elevated surface with subtle shadows (`--app-shadow-sm` or `--app-shadow-md`). Can be interactive with 3D hover effects.
- **Input & Textarea**: Rounded controls with accent focus rings.
