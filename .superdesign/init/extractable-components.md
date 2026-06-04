# Extractable Components

This file lists components from the codebase that can be extracted as reusable SuperDesign `DraftComponent` entities.

## AppSidebar
- Source: `src/app/components/root-layout/AppSidebar.tsx`
- Category: layout
- Description: Left navigation sidebar with user profile, theme toggle, and page links.
- Extractable props:
  - user (object, default: null)
  - resolvedTheme (string, default: "light")
- Hardcoded: Navigation items list, logo/app name, CSS.

## SyncStatusPill
- Source: `src/app/components/root-layout/SyncStatusPill.tsx`
- Category: layout
- Description: Small status pill indicating connection and cloud synchronization state.
- Extractable props:
  - compact (boolean, default: true)
- Hardcoded: Status labels (Synced, Syncing, Offline, Error), badge coloring.
