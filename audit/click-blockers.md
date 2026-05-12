# Click Blockers Audit

Scope: round 1-4 decorative illustrations, ambient overlays, hero scenes, skeleton shimmer, and layout footer aurora.

## Findings

| File | Line | Element | Violation | Severity |
|---|---:|---|---|---|
| `src/app/pages/LoginPage.tsx` | 190 | `HeroLoginScene`, `ConstellationAccent` | Decorative SVGs are absolute and pointer-events-none, but sibling content in the hero card does not have a consistent `relative z-10` layer. | medium |
| `src/app/pages/Dashboard.tsx` | 722 | `HeroDashboardScene`, `SoftDotsPattern` | Decorative SVGs are absolute and pointer-events-none, but body content below them is not explicitly lifted above scene layer. | medium |
| `src/app/pages/Achievements.tsx` | 105 | radial gradient overlay | Full-card `absolute inset-0` decorative overlay lacks `pointer-events-none`; can sit above hero CTA/card content. | critical |
| `src/app/pages/FeasibilityCheck.tsx` | 297 | radial gradient overlay | Full-card `absolute inset-0` decorative overlay lacks `pointer-events-none`; can sit above badges and CTA flow. | critical |
| `src/app/pages/VisionBoardEditor.tsx` | 653 | radial gradient overlay | Hero-card `absolute inset-0` decorative overlay lacks `pointer-events-none`; can block hero controls. | critical |
| `src/app/pages/VisionBoardEditor.tsx` | 922-923 | grid/radial empty workspace overlays | Empty workspace decoration lacks `pointer-events-none`; content is separately absolute and can be covered. | medium |
| `src/features/plan12week/pages/12WeekSetup.tsx` | 1102 | radial gradient overlay | Review/setup hero `absolute inset-0` decorative overlay lacks `pointer-events-none`; can block setup CTA. | critical |
| `src/app/pages/VisionBoardGallery.tsx` | 203 | radial gradient overlay | Hero decorative overlay lacks `pointer-events-none`; can block gallery hero CTA/link. | critical |
| `src/app/pages/VisionBoardGallery.tsx` | 318 | blurred card glow | Card glow is absolute and decorative without `pointer-events-none`; can interfere with card hover/click. | medium |
| `src/app/pages/VisionBoardGallery.tsx` | 420 | grid preview overlay | Preview grid decoration lacks `pointer-events-none`; can block preview hover/click target. | medium |
| `src/app/pages/LifeBalance.tsx` | 410 | blurred area glow | Card decorative glow lacks `pointer-events-none`; can interfere with life-area card click/hover. | medium |
| `src/app/pages/ReflectionJournal.tsx` | 569 | blurred entry glow | Card decorative glow lacks `pointer-events-none`; can interfere with entry action controls. | medium |
| `src/app/pages/SMARTGoalSetup/components/SmartGoalHero.tsx` | 49-51 | `HeroSmartGoalScene`, `ConstellationAccent`, `SmartGoalIllustration` | Decorative scenes are pointer-events-none, but content wrapper shares the same stacking context without explicit `relative z-10`. | medium |
| `src/features/plan12week/pages/12WeekSystem/components.tsx` | 200-201 | `Hero12WeekScene`, `SoftDotsPattern` | Decorative scenes are pointer-events-none, but header content is not explicitly lifted above decorative layer. | medium |
| `src/app/components/RootLayout.tsx` | 1348 | `FooterAuroraIllustration` | SVG is absolute directly inside footer aurora band. Parent is pointer-events-none, but SVG should also be explicit and behind footer navigation. | low |
| `src/styles/theme.css` | 1915 | `.skeleton-shimmer::after` | Already has `pointer-events: none`; no fix needed. | none |

## Notes

- Round 1/2/3 standalone illustration components use `aria-hidden` and responsive viewBox correctly; risk appears in page-level absolute wrappers, not the SVG definitions.
- Most round 4 hero scenes already include `pointer-events-none`, but content layering is inconsistent across `PrimaryActionCard`, `CardContent`, and custom hero wrappers.
- Dialog/sheet Radix overlays are conditionally rendered by state and no leak was found during static audit.
- Page-enter animation uses normal transform animation and does not create a persistent click blocker after animation completion.
