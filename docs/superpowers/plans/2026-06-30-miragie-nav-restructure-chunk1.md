# Nav Restructure (Chunk 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Miragie's flat sidebar with an area switcher (Digital Marketing / Creative), a global Overview landing, and a global Account footer — with placeholder pages for every not-yet-built feature so no nav link 404s.

**Architecture:** Nav becomes area-tagged config in `lib/nav.ts`. The active area is *derived from the URL* (`areaForPath`) — no client state, no route moves. The sidebar renders Overview (top) + the active area's menu + Account (footer), with a base-ui `Select` switcher that navigates to an area's first route on change. New features get trivial placeholder pages.

**Tech Stack:** Next.js 16.2.9 (App Router), React, TypeScript, Tailwind, base-ui components (`Select`, `Sidebar`), lucide-react icons, vitest + @testing-library/react.

## Global Constraints

- **Next.js 16.2.9 — differs from training data.** Before writing code, skim `node_modules/next/dist/docs/01-app`. Every routing API used here is already in this repo: `next/link`, `usePathname`/`useRouter` from `next/navigation` (see `components/app-topbar.tsx`, `app/(app)/sales/dashboard/controls.tsx`). Match those usages.
- **Do NOT move existing routes** (`/sales/dashboard`, `/sales/upload`, `/marketing/requests`, `/brands`). Area is nav metadata, not a path prefix.
- **Reuse repo patterns:** base-ui `Select` is controlled via `items={Record<value,label>}` + `value` + `onValueChange` (see `controls.tsx`). `SidebarMenuButton` links via `render={<Link href=… />}`. Page tops use `<PageHeader title description />`.
- **This chunk is nav + placeholders only.** No roles, auth, storage, or feature logic.
- **Commit after each task.** Verify with `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## File Structure

- **Modify** `lib/nav.ts` — area-tagged config (`OVERVIEW`, `AREAS`, `ACCOUNT`), helpers `areaForPath`, `primaryHref`, and a flat `NAV_ITEMS` (kept for the topbar title).
- **Create** `lib/__tests__/nav.test.ts` — unit tests for `areaForPath`, `primaryHref`, `NAV_ITEMS`.
- **Create** `components/area-switcher.tsx` — base-ui `Select` that navigates to an area's primary route.
- **Modify** `components/app-sidebar.tsx` — Overview + switcher + active-area groups + Account footer.
- **Create** `components/coming-soon.tsx` — shared placeholder body (DRY across 6 pages).
- **Modify** `app/(app)/page.tsx` — relabel the welcome hub to "Overview" (temporary; roadmap #7 replaces it).
- **Create** `app/(app)/tools/dokumen/page.tsx`, `app/(app)/tools/kalender-promo/page.tsx`, `app/(app)/tools/excel-csv/page.tsx`, `app/(app)/creative/library/page.tsx`, `app/(app)/creative/approval/page.tsx`, `app/(app)/settings/page.tsx` — placeholders.
- `components/app-topbar.tsx` — **unchanged**; it consumes `NAV_ITEMS` which still exists. Task 4 verifies the title resolves.

---

### Task 1: Area-based nav config + helpers

**Files:**
- Modify: `lib/nav.ts`
- Test: `lib/__tests__/nav.test.ts`

**Interfaces:**
- Produces:
  - `type Area = "dm" | "creative"`
  - `interface NavItem { href: string; label: string; icon: LucideIcon }`
  - `interface NavGroup { label?: string; items: NavItem[] }`
  - `interface AreaDef { id: Area; label: string; groups: NavGroup[] }`
  - `const OVERVIEW: NavItem`, `const ACCOUNT: NavGroup`, `const AREAS: AreaDef[]`, `const NAV_ITEMS: NavItem[]`
  - `function areaForPath(pathname: string): Area`
  - `function primaryHref(area: Area): string`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/nav.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { areaForPath, primaryHref, NAV_ITEMS } from "@/lib/nav";

describe("areaForPath", () => {
  it("maps Digital Marketing routes to dm", () => {
    expect(areaForPath("/sales/dashboard")).toBe("dm");
    expect(areaForPath("/sales/upload")).toBe("dm");
    expect(areaForPath("/tools/dokumen")).toBe("dm");
  });
  it("maps Creative routes to creative", () => {
    expect(areaForPath("/marketing/requests")).toBe("creative");
    expect(areaForPath("/creative/library")).toBe("creative");
  });
  it("resolves the shared /brands route to dm (first area that lists it)", () => {
    expect(areaForPath("/brands")).toBe("dm");
  });
  it("defaults global/unknown routes to dm", () => {
    expect(areaForPath("/")).toBe("dm");
    expect(areaForPath("/settings")).toBe("dm");
  });
});

describe("primaryHref", () => {
  it("returns each area's first route", () => {
    expect(primaryHref("dm")).toBe("/sales/dashboard");
    expect(primaryHref("creative")).toBe("/marketing/requests");
  });
});

describe("NAV_ITEMS", () => {
  it("includes the global Overview and Settings entries", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/settings");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npm run test -- nav`
Expected: FAIL — `areaForPath`/`primaryHref` not exported by `@/lib/nav`.

- [ ] **Step 3: Rewrite `lib/nav.ts`**

```ts
import {
  LayoutDashboard,
  BarChart3,
  Tag,
  Database,
  FileText,
  CalendarDays,
  FileSpreadsheet,
  PenTool,
  Library,
  CheckCircle2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Area = "dm" | "creative";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface AreaDef {
  id: Area;
  label: string;
  groups: NavGroup[];
}

// Global item shown above the area switcher.
export const OVERVIEW: NavItem = {
  href: "/",
  label: "Overview",
  icon: LayoutDashboard,
};

// Global group pinned to the sidebar footer.
export const ACCOUNT: NavGroup = {
  label: "Account",
  items: [{ href: "/settings", label: "Settings", icon: Settings }],
};

export const AREAS: AreaDef[] = [
  {
    id: "dm",
    label: "Digital Marketing",
    groups: [
      {
        items: [
          { href: "/sales/dashboard", label: "Dashboard", icon: BarChart3 },
          { href: "/brands", label: "Brand", icon: Tag },
          // Data Integrasi reuses today's upload flow; history is added in roadmap #2.
          { href: "/sales/upload", label: "Data Integrasi", icon: Database },
        ],
      },
      {
        label: "Tools",
        items: [
          { href: "/tools/dokumen", label: "Dokumen", icon: FileText },
          {
            href: "/tools/kalender-promo",
            label: "Kalender Promo",
            icon: CalendarDays,
          },
          {
            href: "/tools/excel-csv",
            label: "Excel/CSV Generator",
            icon: FileSpreadsheet,
          },
        ],
      },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    groups: [
      {
        items: [
          { href: "/marketing/requests", label: "Briefs", icon: PenTool },
          { href: "/brands", label: "Brand", icon: Tag },
          { href: "/creative/library", label: "Library", icon: Library },
          { href: "/creative/approval", label: "Approval", icon: CheckCircle2 },
        ],
      },
    ],
  },
];

// ponytail: area is derived from the URL, so a shared route (/brands) resolves to
// the first area that lists it (DM). Acceptable for v1; add last-area persistence
// (cookie) only if the menu flip on shared/global routes annoys users.
export function areaForPath(pathname: string): Area {
  for (const area of AREAS) {
    for (const group of area.groups) {
      for (const item of group.items) {
        if (item.href !== "/" && pathname.startsWith(item.href)) return area.id;
      }
    }
  }
  return "dm";
}

// First route of an area — where the switcher lands you when you pick it.
export function primaryHref(area: Area): string {
  const def = AREAS.find((a) => a.id === area) ?? AREAS[0];
  return def.groups[0].items[0].href;
}

// Flattened list for places that need every route (e.g. the topbar page title).
export const NAV_ITEMS: NavItem[] = [
  OVERVIEW,
  ...AREAS.flatMap((a) => a.groups.flatMap((g) => g.items)),
  ...ACCOUNT.items,
];
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npm run test -- nav`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add lib/nav.ts lib/__tests__/nav.test.ts
git commit -m "feat(nav): area-tagged nav config + areaForPath/primaryHref helpers"
```

---

### Task 2: Area switcher + sidebar rewrite

**Files:**
- Create: `components/area-switcher.tsx`
- Modify: `components/app-sidebar.tsx`

**Interfaces:**
- Consumes from Task 1: `AREAS`, `OVERVIEW`, `ACCOUNT`, `NavItem`, `Area`, `areaForPath`, `primaryHref`.
- Produces: `AreaSwitcher({ area: Area })` component.

- [ ] **Step 1: Create `components/area-switcher.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS, primaryHref, type Area } from "@/lib/nav";

// items lets base-ui's SelectValue render the area label instead of the raw id.
const areaItems = Object.fromEntries(AREAS.map((a) => [a.id, a.label]));

export function AreaSwitcher({ area }: { area: Area }) {
  const router = useRouter();
  return (
    <Select
      items={areaItems}
      value={area}
      onValueChange={(v) => router.push(primaryHref(v as Area))}
    >
      <SelectTrigger className="w-full" aria-label="Pilih area">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AREAS.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Rewrite `components/app-sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  OVERVIEW,
  ACCOUNT,
  AREAS,
  areaForPath,
  type NavItem,
} from "@/lib/nav";
import { AreaSwitcher } from "@/components/area-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const areaId = areaForPath(pathname);
  const area = AREAS.find((a) => a.id === areaId) ?? AREAS[0];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton
        isActive={isActive(item.href)}
        tooltip={item.label}
        render={<Link href={item.href} />}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="text-lg font-semibold tracking-tight">Miragie</span>
        </div>
        <AreaSwitcher area={areaId} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItem(OVERVIEW)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {area.groups.map((group, i) => (
          <SidebarGroup key={group.label ?? `group-${i}`}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          {ACCOUNT.label && <SidebarGroupLabel>{ACCOUNT.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{ACCOUNT.items.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Dev smoke test (manual — UI, no unit test)**

Run: `npm run dev`, open `http://localhost:3000/sales/dashboard`.
Expected: sidebar shows **Overview**, switcher reading **Digital Marketing**, the DM items + a **Tools** group, and **Account → Settings** pinned at the bottom. Pick **Creative** in the switcher → it navigates to `/marketing/requests` and the menu swaps to Briefs/Brand/Library/Approval.
*Known polish (not blocking): the switcher is full-width even when the sidebar collapses to icons — hide it in icon mode later if needed.*

- [ ] **Step 5: Commit**

```bash
git add components/area-switcher.tsx components/app-sidebar.tsx
git commit -m "feat(nav): area switcher + sidebar with Overview/Account + per-area menus"
```

---

### Task 3: Overview relabel + placeholder pages

**Files:**
- Create: `components/coming-soon.tsx`
- Modify: `app/(app)/page.tsx`
- Create: `app/(app)/tools/dokumen/page.tsx`, `app/(app)/tools/kalender-promo/page.tsx`, `app/(app)/tools/excel-csv/page.tsx`, `app/(app)/creative/library/page.tsx`, `app/(app)/creative/approval/page.tsx`, `app/(app)/settings/page.tsx`

**Interfaces:**
- Produces: `ComingSoon({ title: string; description?: string })`.

- [ ] **Step 1: Create `components/coming-soon.tsx`**

```tsx
import { PageHeader } from "@/components/page-header";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <p className="text-muted-foreground text-sm">
        Fitur ini lagi dirancang. Nantikan ya.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/(app)/page.tsx` as the Overview landing**

```tsx
import Link from "next/link";
import { ArrowRight, BarChart3, Database, PenTool, Tag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlowBackground } from "@/components/glow-background";
import { Card } from "@/components/ui/card";

// ponytail: temporary hub. Roadmap #7 replaces this with the aggregate KPI Overview.
const LINKS = [
  {
    href: "/sales/dashboard",
    label: "Dashboard",
    desc: "Analitik penjualan, produk & iklan per periode.",
    icon: BarChart3,
  },
  {
    href: "/sales/upload",
    label: "Data Integrasi",
    desc: "Tarik export Shopee/TikTok tiap periode.",
    icon: Database,
  },
  {
    href: "/marketing/requests",
    label: "Briefs",
    desc: "Task tracker aset kreatif untuk tim Creative.",
    icon: PenTool,
  },
  {
    href: "/brands",
    label: "Brand",
    desc: "Kelola daftar brand/toko.",
    icon: Tag,
  },
];

export default function OverviewPage() {
  return (
    <div className="relative">
      <GlowBackground />
      <PageHeader
        title="Overview"
        description="Ringkasan Digital Marketing & Creative. Pilih modul untuk mulai."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Card
            key={l.href}
            className="group/card p-0 shadow-soft transition-shadow hover:shadow-md"
          >
            <Link href={l.href} className="flex items-start gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <l.icon className="size-5" />
              </span>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1 font-medium">
                  {l.label}
                  <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100" />
                </div>
                <p className="text-sm text-muted-foreground">{l.desc}</p>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the six placeholder pages**

`app/(app)/tools/dokumen/page.tsx`:

```tsx
import { ComingSoon } from "@/components/coming-soon";

export default function DokumenPage() {
  return (
    <ComingSoon
      title="Dokumen"
      description="Registry link spreadsheet & dokumen per jenis, brand, dan periode."
    />
  );
}
```

`app/(app)/tools/kalender-promo/page.tsx`:

```tsx
import { ComingSoon } from "@/components/coming-soon";

export default function KalenderPromoPage() {
  return (
    <ComingSoon
      title="Kalender Promo"
      description="Kalender promo marketplace & campaign brand."
    />
  );
}
```

`app/(app)/tools/excel-csv/page.tsx`:

```tsx
import { ComingSoon } from "@/components/coming-soon";

export default function ExcelCsvPage() {
  return (
    <ComingSoon
      title="Excel/CSV Generator"
      description="Export data terpilih ke template CSV/Excel."
    />
  );
}
```

`app/(app)/creative/library/page.tsx`:

```tsx
import { ComingSoon } from "@/components/coming-soon";

export default function LibraryPage() {
  return (
    <ComingSoon
      title="Library"
      description="Aset final dari brief, per brand, jenis, dan periode."
    />
  );
}
```

`app/(app)/creative/approval/page.tsx`:

```tsx
import { ComingSoon } from "@/components/coming-soon";

export default function ApprovalPage() {
  return (
    <ComingSoon
      title="Approval"
      description="Review deliverable desain dari brief sebelum masuk Library."
    />
  );
}
```

`app/(app)/settings/page.tsx`:

```tsx
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Profil akun, manajemen user & role, dan preferensi."
    />
  );
}
```

- [ ] **Step 4: Dev smoke — every link resolves**

Run: `npm run dev`. Click every sidebar item in both areas + Overview + Settings.
Expected: no 404; each placeholder shows its title; the topbar title matches the active item (it reads `NAV_ITEMS`).

- [ ] **Step 5: Commit**

```bash
git add components/coming-soon.tsx app/\(app\)/page.tsx app/\(app\)/tools app/\(app\)/creative/library app/\(app\)/creative/approval app/\(app\)/settings
git commit -m "feat(nav): Overview landing + placeholder pages for new features"
```

---

### Task 4: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Unit tests**

Run: `npm run test`
Expected: all pass (incl. `lib/__tests__/nav.test.ts` and the existing component tests).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed (production build compiles all new routes).

- [ ] **Step 4: Manual end-to-end**

Log in, land on `/` (Overview). Walk DM items, switch to Creative, open Settings. Confirm: switcher value tracks the active area, active item is highlighted, Account stays pinned at the bottom, no 404, no console errors.

- [ ] **Step 5: Commit any fixups**

```bash
git add -A
git commit -m "chore(nav): verification fixups for restructure chunk 1"
```
(Skip if nothing changed.)

---

## Self-Review

**1. Spec coverage** (against `2026-06-30-miragie-nav-restructure-design.md` §1 + roadmap #1):
- Area switcher (DM/Creative) → Task 2. ✅
- Overview = default landing at `/` → Task 3 Step 2. ✅
- Account/Settings global at bottom → Task 1 (`ACCOUNT`) + Task 2 (`SidebarFooter`). ✅
- Brand shared in both menus → Task 1 (`/brands` in both areas). ✅
- Switcher toggles only DM↔Creative → Task 2 (`areaItems` from `AREAS`). ✅
- Active area derived from route, existing routes not moved → `areaForPath`, Data Integrasi → `/sales/upload`. ✅
- Placeholder pages for each new feature → Task 3. ✅
- Structural default "shared/global routes default to DM menu" → encoded + `ponytail:` note + tested. ✅

**2. Placeholder scan:** No "TBD/TODO/handle appropriately". The `ComingSoon` pages are intentional product placeholders, not plan placeholders — each has real title/description. ✅

**3. Type consistency:** `Area`, `NavItem`, `areaForPath`, `primaryHref`, `OVERVIEW`, `ACCOUNT`, `AREAS`, `NAV_ITEMS` are defined in Task 1 and consumed with identical names/signatures in Tasks 2–3. `AreaSwitcher({ area: Area })` produced in Task 2 Step 1, consumed in Step 2. ✅

**Out of scope (per spec §5/§6):** upload history, role logic, file storage, real Overview KPIs, collapsible Tools group, last-area persistence — all deferred to later chunks.
