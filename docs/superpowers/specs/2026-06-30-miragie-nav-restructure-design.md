# Miragie — Navigation Restructure & Feature Catalog

**Date:** 2026-06-30
**Status:** Approved (brainstorm) → implementation
**Supersedes nav portion of:** `2026-06-29-frontend-revamp-design.md`

## Goal

Reorganize Miragie's sidebar into two switchable **areas** — **Digital Marketing**
(analytics-focused) and **Creative** (task-tracker-focused) — plus a global
**Overview** landing and **Account** section. Keep every existing feature, and
catalog the new features so they can be built one at a time.

## 1. Navigation model — area switcher

The sidebar swaps wholesale between the two areas via a switcher control at the
top. One area's menu is visible at a time. Global items (Overview, Account)
live outside the switcher.

```
Overview                 ← landing default, global (top)
── [ switcher: DM ▼ ] ──
Digital Marketing
  Dashboard              reuse  /sales/dashboard
  Brand                  reuse  /brands   (shared)
  Data Integrasi         new
  Tools
    Dokumen              new
    Kalender Promo       new
    Excel/CSV Generator  new
Creative
  Briefs                 reuse  /marketing/requests
  Brand                  reuse  /brands   (shared)
  Library                new
  Approval               new
Account                  ← global (bottom)
  Settings               new
```

### Structural decisions

- **Overview** is the default landing after login (route `/`).
- **Account → Settings** is global, pinned to the bottom of the sidebar.
- **Brand** appears in both area menus; both link the same `/brands` page.
- The switcher toggles only **DM ↔ Creative**.
- **Active area is derived from the current route** via the nav config (each
  item is tagged with its area). Existing routes are **not** moved — area is
  metadata, not a path prefix. For global pages (Overview, Settings) the last
  selected area is remembered. Exact mechanism (cookie vs. localStorage) is a
  plan-time detail.

## 2. Feature catalog

Legend: **reuse** = already built · **new** = to build.

| Area | Feature | Status | Scope |
|---|---|---|---|
| global | **Overview** | new | Aggregate across **all brands**. Headline KPIs (revenue total + per brand), running campaigns (sourced from Kalender Promo), and a Creative task-status recap. Read-only summary + entry points into each area. |
| DM | Dashboard | reuse | `/sales/dashboard` (Ringkasan / Produk / Iklan tabs). |
| DM | Brand | reuse | `/brands`. Shared with Creative. |
| DM | **Data Integrasi** | new | Today's upload flow, **plus an upload history** grouped by brand + period. Sources: Shopee & TikTok Excel exports (others later). This is the data that feeds the Dashboard. |
| DM | **Dokumen** | new | Registry of external spreadsheet/doc links (store link only — no embed), split by **document type** (daily tracking, report spreadsheet, deck slides, …) and grouped by brand + period. |
| DM | **Kalender Promo** | new | Interactive monthly calendar grid. Holds marketplace promos **and** brand campaigns, with a view switch to separate marketplaces (Shopee/TikTok/…). Entry fields: brand, marketplace, promo name, date range, notes. |
| DM | **Excel/CSV Generator** | new | Pick a subset of ingested data → export to CSV/Excel using a template that mirrors the admins' manual tracking sheet. **Shopee template first.** |
| Creative | Briefs | reuse | `/marketing/requests` (current Request Desain). |
| Creative | Brand | reuse | `/brands`. Shared with DM. |
| Creative | **Library** | new | Storage of **final assets** produced from briefs. Real file upload (Supabase Storage). Grouped by brand + asset type + period. |
| Creative | **Approval** | new | Cross-brief queue of **design deliverables** awaiting review. Statuses: pending / revisi / approved / rejected. Reviewer can leave revision comments. **Approver = sales-team role only.** Approved items flow to Library. |
| Account | **Settings** | new | (a) account profile (name, password) — all users; (b) user + role management — **admin/owner only**; (c) app preferences (theme, etc.). |

## 3. Cross-cutting concerns (build once, reuse everywhere)

- **Roles:** `owner` / `admin` > `sales` > `creative`. Back it with Supabase
  auth + a `role` column and access checks — **not** a custom permission engine.
  Approval requires `sales`; Settings user-management requires `admin`/`owner`.
  Roles span areas (sales users act inside Creative).
- **Brand + period collection pattern:** Data Integrasi, Dokumen, and Library
  are all "collections grouped by brand + period (+ type)". Build this grouping
  UI/data shape **once** and reuse it.
- **File storage:** Supabase Storage (already in the stack — no new dependency).
- **Visual direction** is settled per-screen when the first real screen is
  built. The nav restructure mostly reuses the existing sidebar styling.

## 4. Build roadmap

1. **Nav restructure** — switcher + regrouped menus + Overview landing +
   global Account, with empty placeholder pages for each new feature. Cheap;
   foundation everything hangs on. *(First chunk.)*
2. **Data Integrasi** — establishes the brand+period collection pattern + storage.
3. **Dokumen + Library** — reuse the pattern from #2 (cheap once it exists).
4. **Kalender Promo.**
5. **Excel/CSV Generator.**
6. **Approval + roles + Settings** (user/role management).
7. **Overview** — last; it aggregates everything above.

Each chunk after #1 gets its own focused plan before coding.

## 5. Out of scope (explicitly cut)

Video Editor, Carousel builder, Client Pipeline, Analytics (standalone),
Personal Branding, MoM Generator, Financial Projection, Planning Board,
Content Request — dropped during brainstorm as out-of-proportion or not needed.
Revisit only if a real need appears.

## 6. Deferred details (resolve at each feature's build time)

- **Data Integrasi:** allowed actions on a history row (view / delete / replace / re-import).
- **Dokumen:** document types fixed enum vs. user-defined.
- **Kalender Promo:** exact switch axes + whether "interactive" = click-a-day to add/edit.
- **Excel/CSV Generator:** obtain an example Shopee template for column mapping; add real `.xlsx` only if formatting requires (CSV otherwise).
- **Library:** asset file types + whether thumbnails/preview are needed.
- **Approval:** notifications on status change.
- **Settings:** exact preference set; theme handling.
- **Overview:** exact KPI list + precise source for "running campaigns".
