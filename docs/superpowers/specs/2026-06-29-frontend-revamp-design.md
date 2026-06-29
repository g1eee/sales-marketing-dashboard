# Miragie Front-End Revamp — Design Spec

**Date:** 2026-06-29
**Status:** Approved (pending written-spec review)

## Goal

Raise the visual quality of the existing internal app ("**Miragie**" — sales &
marketing tool) to a polished, modern standard, inspired by the aesthetic of a
reference hero/landing component the user shared. We adopt the *look and techniques*
of that reference (balanced large headings, soft radial "glow" accents, dashed
borders, refined spacing, dark-mode polish) — **not** its literal marketing content.
Miragie is an internal tool behind login; there is **no public landing page**.

This revamp establishes a reusable design foundation (theme + app shell + shared
presentational primitives) that the not-yet-built Sales Dashboard (Plan 3) and
Marketing Task Tracker (Plan 4) will inherit.

## Decisions (from brainstorming)

- **Scope:** internal app only — restyle shell, login, and existing pages. No public/marketing pages.
- **Color:** stay **monochrome** (the existing grayscale OKLCH tokens). No brand color or gradient accent in the palette; glows are grayscale.
- **Dark mode:** **default dark**, with a light/dark toggle persisted per user (no flash).
- **Navigation:** **left sidebar + thin topbar.**
- **App name / wordmark:** "**Miragie**" — a simple monochrome **text** wordmark (no image logo).
- **Build approach:** use shadcn's official `sidebar` component family + `next-themes` (chosen over hand-rolling).

## Architecture

### 1. Theme foundation

- Add `next-themes`. A `ThemeProvider` (client component) wraps the app in the root
  layout. Root `<html>` gets `suppressHydrationWarning`; provider config:
  `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}` (default dark is
  a deliberate choice, not system-following), `disableTransitionOnChange`.
- The existing grayscale OKLCH tokens and `.dark` block in `app/globals.css` are kept
  as-is (they already define both themes + sidebar + chart + radius scales). No palette
  changes; only additive polish (consistent radii, soft shadows) applied at the
  component level.
- Update root `metadata` (title `"Miragie"`, a real description) — currently the
  create-next-app default.

### 2. Shared presentational primitives

Each is small, single-purpose, and independently usable:

- **`GlowBackground`** (`components/glow-background.tsx`) — absolutely-positioned,
  `aria-hidden`, pointer-events-none layer rendering grayscale radial-gradient glows
  (adapted from the reference's `hsla(0,0%,..)` glows). Props to vary intensity/placement.
  Used behind the login card and the dashboard page header.
- **`PageHeader`** (`components/page-header.tsx`) — `{ title, description?, actions? }`.
  Renders a `text-balance` heading with muted description and optional right-aligned
  actions slot. Standard top-of-page block for every internal page.

### 3. App shell

- Add shadcn **`sidebar`** component (and its dependencies: `sheet`, `tooltip`,
  `skeleton`, `separator`) plus **`avatar`**, via the shadcn CLI. These consume the
  sidebar tokens already present in `globals.css`.
- **`AppSidebar`** (`components/app-sidebar.tsx`) — replaces `app-nav.tsx`. Contains:
  - Header: "Miragie" wordmark.
  - Menu group with the existing routes: Ringkasan (`/`), Upload Data
    (`/sales/upload`), Dashboard Sales (`/sales/dashboard`), Request Desain
    (`/marketing/requests`), Brand (`/brands`). Active route highlighted.
  - Collapsible; on mobile it becomes a sheet (shadcn built-in).
- **`AppTopbar`** (`components/app-topbar.tsx`) — thin bar with: sidebar trigger
  (collapse/expand), current page title, and right side: **`ThemeToggle`** + **user
  menu** (dropdown showing full name + role, and a "Keluar" / sign-out action reusing
  the existing `signOut` server action).
- **`ThemeToggle`** (`components/theme-toggle.tsx`) — client button using `next-themes`
  `useTheme` to switch light/dark (sun/moon lucide icons).
- `app/(app)/layout.tsx` rebuilt: `requireUser()` guard kept; renders
  `SidebarProvider` → `AppSidebar` + a column with `AppTopbar` + `main` (padded,
  max-width content).

### 4. Page restyling (existing pages only)

- **Login** (`app/login/page.tsx`) — centered card over `GlowBackground`, "Miragie"
  wordmark above the form, refined inputs, softer error styling. Keeps `signIn` action
  and async `searchParams` (Next 16) intact.
- **Ringkasan** (`app/(app)/page.tsx`) — becomes a dashboard landing: `PageHeader` +
  a row of placeholder KPI/summary cards (static placeholders this pass; real data in
  Plan 3) + `GlowBackground` accent.
- **Brand** (`app/(app)/brands/page.tsx`) — `PageHeader`; brand list and add-form in
  polished cards. Functionality unchanged.
- **Upload Data** (`app/(app)/sales/upload/`) — `PageHeader`; the form (brand select,
  file input, preview, save) restyled into a cleaner card-based layout. The raw
  `<select>`/`<input type=file>` get nicer styling (shadcn `Select` for brand; styled
  file input). Behavior (preview → save, period auto-detect) unchanged.

## Data flow

No backend/data changes. This is presentational. The `signOut`/`signIn` server
actions, `requireUser`, `listBrands`, and the upload preview/commit actions are reused
unchanged. Theme preference lives client-side (localStorage via next-themes).

## Error handling

- No-flash theming via next-themes + `suppressHydrationWarning`.
- Login error message styling refined but logic identical.
- Upload errors continue to surface via the existing client form state.

## Responsive & accessibility

- Sidebar collapses to an off-canvas sheet on mobile (shadcn built-in); content uses
  consistent max-width + padding.
- Interactive elements use shadcn primitives (ARIA-correct). Theme toggle and user
  menu are keyboard-accessible. Contrast verified in both light and dark.

## Testing

This is a visual layer; verification is primarily build + manual:

- `npx tsc --noEmit` clean and `npm run build` succeeds.
- The existing 32 logic tests stay green.
- Add 1–2 lightweight render **smoke tests** (Vitest + jsdom, which are already set
  up) for the pure presentational primitives `PageHeader` and `GlowBackground`.
- Manual visual check: light & dark, desktop & mobile, all existing routes.

## New files / dependencies

- npm: `next-themes`.
- shadcn add: `sidebar` (+ `sheet`, `tooltip`, `skeleton`, `separator`), `avatar`.
- New files: `components/theme-provider.tsx`, `components/theme-toggle.tsx`,
  `components/app-sidebar.tsx`, `components/app-topbar.tsx`,
  `components/page-header.tsx`, `components/glow-background.tsx`.
- Removed: `components/app-nav.tsx` (superseded by `AppSidebar`).

## Out of scope (YAGNI)

- Public/marketing/landing pages.
- Brand colors, gradient palette, custom image logo.
- Per-role UI differences (all users still see all features).
- Restyling pages that don't exist yet (Sales Dashboard, Marketing Tracker) — they
  will be built on this foundation in Plans 3 & 4.
