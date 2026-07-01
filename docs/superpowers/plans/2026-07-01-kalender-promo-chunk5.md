# Kalender Promo (Chunk 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A promo campaign planning/tracking calendar at `/tools/kalender-promo` — grid (month) and list views, campaigns spanning multiple brands and marketplaces, status auto-derived from dates, one categorical color per brand. Replaces the `ComingSoon` placeholder.

**Architecture:** New `promo_campaigns` table plus two many-to-many junction tables (`promo_campaign_brands`, `promo_campaign_marketplaces`). A server page reads filters + active month from `searchParams`, fetches all matching campaigns once, and hands them to either a custom CSS-Grid month view or a table list view. A single client dialog (add/edit) is reused as the trigger for the header button, empty grid cells (prefilled date), and existing campaign bars/rows (edit).

**Tech Stack:** Next 16 App Router (server components + server actions), Supabase, `date-fns` (already installed), base-ui/shadcn kit components, Vitest + Testing Library.

## Global Constraints

- **Dates are always `"yyyy-MM-dd"` strings** at every boundary that isn't actively doing `date-fns` math on a `Date` object — never mix `Date` objects into filters, props, or DB payloads. When converting a `Date` built via local constructors (`new Date(y, m, d)` or `date-fns` helpers) to a string, use `date-fns`'s `format(date, "yyyy-MM-dd")`, **not** `.toISOString()` (which silently shifts the calendar day in non-UTC server timezones). `.toISOString().slice(0,10)` is fine only for "what is today's date right now" (`new Date()` with no args, an absolute instant, not a local-midnight construction).
- **RLS policy pattern** (copy exactly, matches every existing table): `for all to authenticated using (true) with check (true)`.
- **Server actions**: start with `"use server"`, call `requireUser()` from `@/lib/auth` first, validate, call `revalidatePath("/tools/kalender-promo")` after every write.
- **Migrations are applied manually by the user** in the Supabase SQL editor (hosted DB, anon key only in `.env.local`) — never attempt to run them.
- Prefer kit components from `@/components/ui/*` / `@/components/reui/*` over hand-rolled equivalents (project `CLAUDE.md`).
- **No new npm dependencies** — `date-fns`, `react-day-picker` (`components/ui/calendar.tsx`), `@testing-library/react` are already installed.
- Typecheck: `npx tsc --noEmit`. Tests: `npx vitest run`. Both must stay clean after every task.

---

## File Structure

- **Create** `supabase/migrations/0006_promo_campaigns.sql`
- **Create** `lib/promo-calendar-grid.ts` — pure month-grid + bar-layout math (no DB, no campaign types)
- **Create test** `lib/__tests__/promo-calendar-grid.test.ts`
- **Modify** `lib/chart-colors.ts` — add `BRAND_COLORS` + `assignBrandColors`
- **Create test** `lib/__tests__/chart-colors.test.ts`
- **Create** `lib/promo-campaigns.ts` — types, validation, filter parsing, status derivation, Supabase reads
- **Create test** `lib/__tests__/promo-campaigns.test.ts`
- **Create** `app/(app)/tools/kalender-promo/actions.ts` — `createCampaign`, `updateCampaign`, `deleteCampaign`
- **Create** `app/(app)/tools/kalender-promo/delete-campaign-button.tsx`
- **Create** `app/(app)/tools/kalender-promo/campaign-dialog.tsx` — add/edit form (client)
- **Create** `app/(app)/tools/kalender-promo/campaign-filters.tsx` — brand/marketplace/status filters + grid/list toggle (client)
- **Create** `app/(app)/tools/kalender-promo/month-grid.tsx` — grid view (server)
- **Create** `app/(app)/tools/kalender-promo/campaign-list.tsx` — list view (server)
- **Create test** `app/(app)/tools/kalender-promo/__tests__/kalender-promo.test.tsx` — smoke render for `MonthGrid`/`CampaignList`
- **Rewrite** `app/(app)/tools/kalender-promo/page.tsx` — assemble (replaces the placeholder)

No changes to `lib/nav.ts` — `/tools/kalender-promo` is already registered (see `lib/__tests__/nav.test.ts`).

---

### Task 1: Month-grid math (pure, TDD)

**Files:**
- Create: `lib/promo-calendar-grid.ts`
- Test: `lib/__tests__/promo-calendar-grid.test.ts`

**Interfaces:**
- Consumes: nothing (zero dependencies, pure functions).
- Produces:
  - `getMonthGrid(year: number, month: number): Date[][]` — array of weeks, each exactly 7 `Date`s (Sunday–Saturday), including leading/trailing days from adjacent months.
  - `campaignSpanInWeek(startDate: string, endDate: string, weekStart: string, weekEnd: string): { colStart: number; colSpan: number } | null` — `colStart`/`colSpan` are 1-indexed grid columns (1=Sunday…7=Saturday), clipped to the week; `null` if no overlap. All date args are `"yyyy-MM-dd"`.
  - `layoutWeekBars<T extends { id: string; colStart: number; colSpan: number }>(segments: T[], maxRows: number): { placed: (T & { row: number })[]; overflowByCol: number[] }` — greedy interval-partitioning stack (0-indexed `row`), caps at `maxRows`; `overflowByCol` is a 7-length array counting segments bumped past the cap, indexed by column-1.

- [ ] **Step 1: Write the failing test** — create `lib/__tests__/promo-calendar-grid.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { getMonthGrid, campaignSpanInWeek, layoutWeekBars } from "@/lib/promo-calendar-grid";

describe("getMonthGrid", () => {
  it("includes leading/trailing days so every week has 7 days (Jul 2026 starts on a Wednesday)", () => {
    const weeks = getMonthGrid(2026, 7);
    expect(weeks).toHaveLength(5);
    for (const w of weeks) expect(w).toHaveLength(7);
    expect(format(weeks[0][0], "yyyy-MM-dd")).toBe("2026-06-28");
    expect(format(weeks[4][6], "yyyy-MM-dd")).toBe("2026-08-01");
  });

  it("covers the whole month with no gaps (Feb 2026 fits exactly, no leap day)", () => {
    const weeks = getMonthGrid(2026, 2);
    expect(weeks).toHaveLength(4);
    const flat = weeks.flat().map((d) => format(d, "yyyy-MM-dd"));
    expect(flat[0]).toBe("2026-02-01");
    expect(flat[flat.length - 1]).toBe("2026-02-28");
  });
});

describe("campaignSpanInWeek", () => {
  const weekStart = "2026-07-05"; // Sunday
  const weekEnd = "2026-07-11"; // Saturday

  it("returns null when the campaign doesn't overlap the week", () => {
    expect(campaignSpanInWeek("2026-06-01", "2026-06-30", weekStart, weekEnd)).toBeNull();
  });

  it("spans the full week when the campaign covers it entirely", () => {
    expect(campaignSpanInWeek("2026-07-01", "2026-07-20", weekStart, weekEnd)).toEqual({
      colStart: 1,
      colSpan: 7,
    });
  });

  it("clips to the week when the campaign starts mid-week (Tue = col 3)", () => {
    expect(campaignSpanInWeek("2026-07-07", "2026-07-20", weekStart, weekEnd)).toEqual({
      colStart: 3,
      colSpan: 5,
    });
  });

  it("handles a single-day campaign (Wed = col 4)", () => {
    expect(campaignSpanInWeek("2026-07-08", "2026-07-08", weekStart, weekEnd)).toEqual({
      colStart: 4,
      colSpan: 1,
    });
  });
});

describe("layoutWeekBars", () => {
  it("keeps non-overlapping segments on the same row", () => {
    const { placed, overflowByCol } = layoutWeekBars(
      [
        { id: "a", colStart: 1, colSpan: 2 },
        { id: "b", colStart: 3, colSpan: 2 },
      ],
      3,
    );
    expect(placed).toEqual([
      { id: "a", colStart: 1, colSpan: 2, row: 0 },
      { id: "b", colStart: 3, colSpan: 2, row: 0 },
    ]);
    expect(overflowByCol).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("stacks overlapping segments on separate rows", () => {
    const { placed } = layoutWeekBars(
      [
        { id: "a", colStart: 1, colSpan: 3 },
        { id: "b", colStart: 2, colSpan: 3 },
      ],
      3,
    );
    expect(placed.find((s) => s.id === "a")!.row).toBe(0);
    expect(placed.find((s) => s.id === "b")!.row).toBe(1);
  });

  it("overflows into overflowByCol once maxRows is exceeded", () => {
    const segments = ["a", "b", "c", "d"].map((id) => ({ id, colStart: 1, colSpan: 1 }));
    const { placed, overflowByCol } = layoutWeekBars(segments, 3);
    expect(placed).toHaveLength(3);
    expect(overflowByCol[0]).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run lib/__tests__/promo-calendar-grid.test.ts`
Expected: FAIL — `Cannot find module '@/lib/promo-calendar-grid'`

- [ ] **Step 3: Write the implementation** — create `lib/promo-calendar-grid.ts`:

```ts
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

/** Weeks (Sunday-first) covering the given month, including leading/trailing days. */
export function getMonthGrid(year: number, month: number): Date[][] {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/** 1-indexed grid column/span for a campaign clipped to one week, or null if no overlap. */
export function campaignSpanInWeek(
  startDate: string,
  endDate: string,
  weekStart: string,
  weekEnd: string,
): { colStart: number; colSpan: number } | null {
  if (endDate < weekStart || startDate > weekEnd) return null;
  const clippedStart = startDate > weekStart ? startDate : weekStart;
  const clippedEnd = endDate < weekEnd ? endDate : weekEnd;
  const colStart = daysBetween(weekStart, clippedStart) + 1;
  const colSpan = daysBetween(clippedStart, clippedEnd) + 1;
  return { colStart, colSpan };
}

/** Greedy interval-partitioning stack, capped at maxRows; overflow counted per column (0-indexed). */
export function layoutWeekBars<T extends { id: string; colStart: number; colSpan: number }>(
  segments: T[],
  maxRows: number,
): { placed: (T & { row: number })[]; overflowByCol: number[] } {
  const overflowByCol = new Array(7).fill(0);
  const rowEnds: number[] = [];
  const placed: (T & { row: number })[] = [];
  const sorted = [...segments].sort((a, b) => a.colStart - b.colStart);
  for (const seg of sorted) {
    const end = seg.colStart + seg.colSpan;
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= seg.colStart);
    if (row === -1) row = rowEnds.length;
    if (row >= maxRows) {
      for (let c = seg.colStart; c < end; c++) overflowByCol[c - 1]++;
      continue;
    }
    rowEnds[row] = end;
    placed.push({ ...seg, row });
  }
  return { placed, overflowByCol };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run lib/__tests__/promo-calendar-grid.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/promo-calendar-grid.ts lib/__tests__/promo-calendar-grid.test.ts
git commit -m "feat(kalender-promo): month-grid + bar-layout math"
```

---

### Task 2: Brand color palette (pure, TDD)

**Files:**
- Modify: `lib/chart-colors.ts`
- Test: `lib/__tests__/chart-colors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BRAND_COLORS: readonly string[]`, `assignBrandColors(brands: { id: string }[]): Map<string, string>` from `lib/chart-colors.ts`.

- [ ] **Step 1: Write the failing test** — create `lib/__tests__/chart-colors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { BRAND_COLORS, assignBrandColors } from "@/lib/chart-colors";

describe("assignBrandColors", () => {
  it("gives each brand a color from BRAND_COLORS, cycling by list order", () => {
    const brands = [{ id: "b1" }, { id: "b2" }, { id: "b3" }];
    const map = assignBrandColors(brands);
    expect(map.get("b1")).toBe(BRAND_COLORS[0]);
    expect(map.get("b2")).toBe(BRAND_COLORS[1]);
    expect(map.get("b3")).toBe(BRAND_COLORS[2]);
  });

  it("cycles back to the start when there are more brands than colors", () => {
    const brands = Array.from({ length: BRAND_COLORS.length + 2 }, (_, i) => ({ id: `b${i}` }));
    const map = assignBrandColors(brands);
    expect(map.get(`b${BRAND_COLORS.length}`)).toBe(BRAND_COLORS[0]);
    expect(map.get(`b${BRAND_COLORS.length + 1}`)).toBe(BRAND_COLORS[1]);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run lib/__tests__/chart-colors.test.ts`
Expected: FAIL — `BRAND_COLORS`/`assignBrandColors` not exported

- [ ] **Step 3: Write the implementation** — append to `lib/chart-colors.ts`:

```ts
// Categorical hues for per-brand identity on Kalender Promo (grid bars, list chips).
export const BRAND_COLORS = [
  "#5b9df0", // blue
  "#4cb782", // green
  "#d8a23a", // amber
  "#9b7fe0", // violet
  "#5fb0c4", // teal
  "#e0708f", // rose
  "#8fae4c", // lime
  "#e08a4c", // orange
] as const;

// Stable per-brand color keyed by id, computed from the full brand list (not a filtered
// subset) so a brand's color never changes depending on which filter is active.
export function assignBrandColors(brands: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  brands.forEach((b, i) => map.set(b.id, BRAND_COLORS[i % BRAND_COLORS.length]));
  return map;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run lib/__tests__/chart-colors.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/chart-colors.ts lib/__tests__/chart-colors.test.ts
git commit -m "feat(kalender-promo): per-brand categorical color palette"
```

---

### Task 3: Migration + campaign data layer (TDD for pure functions)

**Files:**
- Create: `supabase/migrations/0006_promo_campaigns.sql`
- Create: `lib/promo-campaigns.ts`
- Test: `lib/__tests__/promo-campaigns.test.ts`

**Interfaces:**
- Consumes: `Brand` type from `@/lib/brands`; `createClient` from `@/lib/supabase/server`.
- Produces (from `lib/promo-campaigns.ts`):
  - Types: `CampaignStatus = "planned" | "berjalan" | "selesai"`, `CampaignInput { name, startDate, endDate, notes, brandIds: string[], marketplaces: string[] }`, `CampaignRow { id, name, startDate, endDate, notes, brands: Brand[], marketplaces: string[], status: CampaignStatus, createdAt }`, `CampaignFilters { brandId?, marketplace?, status? }`.
  - `validateCampaignInput(input: Partial<CampaignInput>): string | null`
  - `parseCampaignFilters(sp: { brand?: string; marketplace?: string; status?: string }): CampaignFilters`
  - `deriveCampaignStatus(startDate: string, endDate: string, today: string): CampaignStatus`
  - `getCampaigns(filters: CampaignFilters): Promise<CampaignRow[]>` — ordered by `startDate` ascending, filtered in-memory (low volume, internal tool).
  - `getMarketplaces(): Promise<string[]>` — distinct, sorted.

- [ ] **Step 1: Migration** — create `supabase/migrations/0006_promo_campaigns.sql`:

```sql
-- Promo campaign calendar (chunk 5): campaigns spanning many brands + marketplaces.
create table promo_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index promo_campaigns_date_idx on promo_campaigns (start_date, end_date);

create table promo_campaign_brands (
  campaign_id uuid not null references promo_campaigns(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  primary key (campaign_id, brand_id)
);

create table promo_campaign_marketplaces (
  campaign_id uuid not null references promo_campaigns(id) on delete cascade,
  marketplace text not null,
  primary key (campaign_id, marketplace)
);

alter table promo_campaigns enable row level security;
alter table promo_campaign_brands enable row level security;
alter table promo_campaign_marketplaces enable row level security;

create policy promo_campaigns_authenticated_all on promo_campaigns
  for all to authenticated using (true) with check (true);
create policy promo_campaign_brands_authenticated_all on promo_campaign_brands
  for all to authenticated using (true) with check (true);
create policy promo_campaign_marketplaces_authenticated_all on promo_campaign_marketplaces
  for all to authenticated using (true) with check (true);
```

Hand this SQL to the user to run in the Supabase SQL editor — do not attempt to apply it.

- [ ] **Step 2: Write the failing test** — create `lib/__tests__/promo-campaigns.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  validateCampaignInput,
  parseCampaignFilters,
  deriveCampaignStatus,
} from "@/lib/promo-campaigns";

const valid = {
  name: "Promo 11.11",
  startDate: "2026-11-11",
  endDate: "2026-11-12",
  notes: "",
  brandIds: ["b1"],
  marketplaces: ["Shopee"],
};

describe("validateCampaignInput", () => {
  it("returns null for valid input", () => {
    expect(validateCampaignInput(valid)).toBeNull();
  });
  it("requires nama, tanggal mulai, tanggal selesai, minimal 1 brand", () => {
    expect(validateCampaignInput({ ...valid, name: " " })).toMatch(/nama/i);
    expect(validateCampaignInput({ ...valid, startDate: "" })).toMatch(/mulai/i);
    expect(validateCampaignInput({ ...valid, endDate: "" })).toMatch(/selesai/i);
    expect(validateCampaignInput({ ...valid, brandIds: [] })).toMatch(/brand/i);
  });
  it("rejects endDate before startDate", () => {
    expect(
      validateCampaignInput({ ...valid, startDate: "2026-11-12", endDate: "2026-11-11" }),
    ).toMatch(/tanggal selesai/i);
  });
});

describe("parseCampaignFilters", () => {
  it("parses brand/marketplace/status and ignores an invalid status", () => {
    expect(
      parseCampaignFilters({ brand: "b1", marketplace: "Shopee", status: "berjalan" }),
    ).toEqual({ brandId: "b1", marketplace: "Shopee", status: "berjalan" });
    expect(parseCampaignFilters({ status: "invalid" })).toEqual({});
  });
});

describe("deriveCampaignStatus", () => {
  it("is planned when today is before the start date", () => {
    expect(deriveCampaignStatus("2026-08-01", "2026-08-05", "2026-07-01")).toBe("planned");
  });
  it("is berjalan when today is within range, inclusive of both ends", () => {
    expect(deriveCampaignStatus("2026-07-01", "2026-07-05", "2026-07-01")).toBe("berjalan");
    expect(deriveCampaignStatus("2026-06-28", "2026-07-01", "2026-07-01")).toBe("berjalan");
  });
  it("is selesai when today is after the end date", () => {
    expect(deriveCampaignStatus("2026-06-01", "2026-06-05", "2026-07-01")).toBe("selesai");
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run lib/__tests__/promo-campaigns.test.ts`
Expected: FAIL — `Cannot find module '@/lib/promo-campaigns'`

- [ ] **Step 4: Write the implementation** — create `lib/promo-campaigns.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import type { Brand } from "@/lib/brands";

export type CampaignStatus = "planned" | "berjalan" | "selesai";

export interface CampaignInput {
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  brandIds: string[];
  marketplaces: string[];
}

export interface CampaignRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  brands: Brand[];
  marketplaces: string[];
  status: CampaignStatus;
  createdAt: string;
}

export interface CampaignFilters {
  brandId?: string;
  marketplace?: string;
  status?: CampaignStatus;
}

const STATUSES: CampaignStatus[] = ["planned", "berjalan", "selesai"];

export function validateCampaignInput(input: Partial<CampaignInput>): string | null {
  if (!input.name?.trim()) return "Nama campaign wajib diisi.";
  if (!input.startDate) return "Tanggal mulai wajib diisi.";
  if (!input.endDate) return "Tanggal selesai wajib diisi.";
  if (input.endDate < input.startDate) return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  if (!input.brandIds || input.brandIds.length === 0) return "Pilih minimal 1 brand.";
  return null;
}

export function parseCampaignFilters(sp: {
  brand?: string;
  marketplace?: string;
  status?: string;
}): CampaignFilters {
  const f: CampaignFilters = {};
  if (sp.brand) f.brandId = sp.brand;
  if (sp.marketplace) f.marketplace = sp.marketplace;
  if (sp.status && STATUSES.includes(sp.status as CampaignStatus)) {
    f.status = sp.status as CampaignStatus;
  }
  return f;
}

export function deriveCampaignStatus(
  startDate: string,
  endDate: string,
  today: string,
): CampaignStatus {
  if (today < startDate) return "planned";
  if (today > endDate) return "selesai";
  return "berjalan";
}

type RawCampaign = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  notes: string;
  created_at: string;
  promo_campaign_brands: { brands: { id: string; name: string } | null }[];
  promo_campaign_marketplaces: { marketplace: string }[];
};

export async function getCampaigns(filters: CampaignFilters): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_campaigns")
    .select(
      `id, name, start_date, end_date, notes, created_at,
       promo_campaign_brands ( brands ( id, name ) ),
       promo_campaign_marketplaces ( marketplace )`,
    )
    .order("start_date", { ascending: true });
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  let rows: CampaignRow[] = ((data ?? []) as unknown as RawCampaign[]).map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.start_date,
    endDate: c.end_date,
    notes: c.notes,
    createdAt: c.created_at,
    brands: c.promo_campaign_brands
      .map((j) => j.brands)
      .filter((b): b is { id: string; name: string } => b !== null),
    marketplaces: c.promo_campaign_marketplaces.map((j) => j.marketplace),
    status: deriveCampaignStatus(c.start_date, c.end_date, today),
  }));

  if (filters.brandId) {
    rows = rows.filter((r) => r.brands.some((b) => b.id === filters.brandId));
  }
  if (filters.marketplace) {
    rows = rows.filter((r) => r.marketplaces.includes(filters.marketplace!));
  }
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }
  return rows;
}

export async function getMarketplaces(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("promo_campaign_marketplaces").select("marketplace");
  return [...new Set((data ?? []).map((r) => r.marketplace as string))].sort();
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx vitest run lib/__tests__/promo-campaigns.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0006_promo_campaigns.sql lib/promo-campaigns.ts lib/__tests__/promo-campaigns.test.ts
git commit -m "feat(kalender-promo): migration + campaign data layer"
```

---

### Task 4: Server actions + delete button

**Files:**
- Create: `app/(app)/tools/kalender-promo/actions.ts`
- Create: `app/(app)/tools/kalender-promo/delete-campaign-button.tsx`

**Interfaces:**
- Consumes: `CampaignInput`, `validateCampaignInput` from `@/lib/promo-campaigns` (Task 3); `requireUser` from `@/lib/auth`; `createClient` from `@/lib/supabase/server`.
- Produces: `createCampaign(input: CampaignInput): Promise<void>`, `updateCampaign(id: string, input: CampaignInput): Promise<void>`, `deleteCampaign(id: string): Promise<void>` from `./actions`; `DeleteCampaignButton({ id, label }: { id: string; label: string })` from `./delete-campaign-button`.

- [ ] **Step 1: Create `app/(app)/tools/kalender-promo/actions.ts`**

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateCampaignInput, type CampaignInput } from "@/lib/promo-campaigns";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function replaceBrands(supabase: SupabaseClient, campaignId: string, brandIds: string[]) {
  const del = await supabase.from("promo_campaign_brands").delete().eq("campaign_id", campaignId);
  if (del.error) throw new Error(`Gagal menyimpan brand: ${del.error.message}`);
  if (brandIds.length === 0) return;
  const ins = await supabase
    .from("promo_campaign_brands")
    .insert(brandIds.map((brandId) => ({ campaign_id: campaignId, brand_id: brandId })));
  if (ins.error) throw new Error(`Gagal menyimpan brand: ${ins.error.message}`);
}

async function replaceMarketplaces(
  supabase: SupabaseClient,
  campaignId: string,
  marketplaces: string[],
) {
  const del = await supabase
    .from("promo_campaign_marketplaces")
    .delete()
    .eq("campaign_id", campaignId);
  if (del.error) throw new Error(`Gagal menyimpan marketplace: ${del.error.message}`);
  if (marketplaces.length === 0) return;
  const ins = await supabase
    .from("promo_campaign_marketplaces")
    .insert(marketplaces.map((marketplace) => ({ campaign_id: campaignId, marketplace })));
  if (ins.error) throw new Error(`Gagal menyimpan marketplace: ${ins.error.message}`);
}

function row(input: CampaignInput) {
  return {
    name: input.name.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes.trim(),
  };
}

export async function createCampaign(input: CampaignInput): Promise<void> {
  const user = await requireUser();
  const err = validateCampaignInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_campaigns")
    .insert({ ...row(input), created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(`Gagal menyimpan: ${error.message}`);
  await replaceBrands(supabase, data.id, input.brandIds);
  await replaceMarketplaces(supabase, data.id, input.marketplaces);
  revalidatePath("/tools/kalender-promo");
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<void> {
  await requireUser();
  const err = validateCampaignInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { error } = await supabase.from("promo_campaigns").update(row(input)).eq("id", id);
  if (error) throw new Error(`Gagal mengubah: ${error.message}`);
  await replaceBrands(supabase, id, input.brandIds);
  await replaceMarketplaces(supabase, id, input.marketplaces);
  revalidatePath("/tools/kalender-promo");
}

export async function deleteCampaign(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("promo_campaigns").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
  revalidatePath("/tools/kalender-promo");
}
```

- [ ] **Step 2: Create `app/(app)/tools/kalender-promo/delete-campaign-button.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCampaign } from "./actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteCampaignButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`Hapus ${label}`}>
            <Trash2 className="size-4" />
          </Button>
        }
      />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Hapus campaign ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Menghapus <b>{label}</b> dari kalender promo. Tindakan ini permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost">Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() => start(async () => { await deleteCampaign(id); })}
          >
            {pending ? "Menghapus…" : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in either new file

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/tools/kalender-promo/actions.ts" "app/(app)/tools/kalender-promo/delete-campaign-button.tsx"
git commit -m "feat(kalender-promo): create/update/delete server actions"
```

---

### Task 5: Campaign dialog (add/edit)

**Files:**
- Create: `app/(app)/tools/kalender-promo/campaign-dialog.tsx`

**Interfaces:**
- Consumes: `Brand` from `@/lib/brands`; `CampaignRow`, `CampaignInput` from `@/lib/promo-campaigns` (Task 3); `createCampaign`, `updateCampaign` from `./actions` (Task 4).
- Produces: `CampaignDialog({ brands, marketplaceOptions, campaign?, defaultDate?, trigger }): JSX.Element` — `campaign` present = edit mode; `defaultDate` (a `"yyyy-MM-dd"` string) prefills both ends of the date range when adding from an empty grid cell.

- [ ] **Step 1: Create `app/(app)/tools/kalender-promo/campaign-dialog.tsx`**

```tsx
"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { X, CalendarIcon } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignRow, CampaignInput } from "@/lib/promo-campaigns";
import { createCampaign, updateCampaign } from "./actions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function toRange(startDate?: string, endDate?: string): DateRange | undefined {
  if (!startDate) return undefined;
  return {
    from: new Date(`${startDate}T00:00:00`),
    to: new Date(`${endDate ?? startDate}T00:00:00`),
  };
}

export function CampaignDialog({
  brands,
  marketplaceOptions,
  campaign,
  defaultDate,
  trigger,
}: {
  brands: Brand[];
  marketplaceOptions: string[];
  campaign?: CampaignRow;
  defaultDate?: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [name, setName] = useState(campaign?.name ?? "");
  const [notes, setNotes] = useState(campaign?.notes ?? "");
  const [brandIds, setBrandIds] = useState<string[]>(campaign?.brands.map((b) => b.id) ?? []);
  const [marketplaces, setMarketplaces] = useState<string[]>(campaign?.marketplaces ?? []);
  const [marketplaceInput, setMarketplaceInput] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(
    toRange(campaign?.startDate ?? defaultDate, campaign?.endDate ?? defaultDate),
  );

  function toggleBrand(id: string) {
    setBrandIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addMarketplace() {
    const v = marketplaceInput.trim();
    if (v && !marketplaces.includes(v)) setMarketplaces((prev) => [...prev, v]);
    setMarketplaceInput("");
  }

  function removeMarketplace(v: string) {
    setMarketplaces((prev) => prev.filter((m) => m !== v));
  }

  function submit() {
    setError(null);
    if (!range?.from) {
      setError("Tanggal mulai wajib diisi.");
      return;
    }
    const input: CampaignInput = {
      name,
      startDate: format(range.from, "yyyy-MM-dd"),
      endDate: format(range.to ?? range.from, "yyyy-MM-dd"),
      notes,
      brandIds,
      marketplaces,
    };
    start(async () => {
      try {
        if (campaign) await updateCampaign(campaign.id, input);
        else await createCampaign(input);
        setOpen(false);
        if (!campaign) {
          setName("");
          setNotes("");
          setBrandIds([]);
          setMarketplaces([]);
          setRange(undefined);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit Campaign" : "Tambah Campaign"}</DialogTitle>
          <DialogDescription>
            Jadwal promo untuk satu atau beberapa brand & marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nama Campaign</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="11.11 Big Sale"
            />
          </div>

          <div className="space-y-2">
            <Label>Rentang Tanggal</Label>
            <Popover>
              <PopoverTrigger>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="size-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`
                      : format(range.from, "d MMM yyyy")
                    : "Pilih tanggal…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar mode="range" selected={range} onSelect={setRange} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
              {brands.map((b) => (
                <Field key={b.id} orientation="horizontal">
                  <FieldLabel>
                    <Checkbox
                      checked={brandIds.includes(b.id)}
                      onCheckedChange={() => toggleBrand(b.id)}
                    />
                    <FieldTitle>{b.name}</FieldTitle>
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace-input">Marketplace</Label>
            <div className="flex gap-2">
              <Input
                id="marketplace-input"
                list="marketplace-options"
                value={marketplaceInput}
                onChange={(e) => setMarketplaceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMarketplace();
                  }
                }}
                placeholder="Shopee, TikTok Shop, …"
              />
              <datalist id="marketplace-options">
                {marketplaceOptions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <Button type="button" variant="outline" onClick={addMarketplace}>
                Tambah
              </Button>
            </div>
            {marketplaces.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {marketplaces.map((m) => (
                  <Badge key={m} variant="secondary" className="gap-1">
                    {m}
                    <button type="button" onClick={() => removeMarketplace(m)} aria-label={`Hapus ${m}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-notes">Catatan</Label>
            <Textarea
              id="campaign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Batal</Button>} />
          <Button onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `campaign-dialog.tsx`

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/kalender-promo/campaign-dialog.tsx"
git commit -m "feat(kalender-promo): add/edit campaign dialog"
```

---

### Task 6: Filters + grid/list toggle

**Files:**
- Create: `app/(app)/tools/kalender-promo/campaign-filters.tsx`

**Interfaces:**
- Consumes: `Brand` from `@/lib/brands`; `CampaignStatus` from `@/lib/promo-campaigns` (Task 3).
- Produces: `CampaignFilters({ brands, marketplaceOptions, brand, marketplace, status, view, year, month }): JSX.Element` — a client component that navigates via `router.push`, always re-emitting `year`/`month`/`view` so switching a filter never resets which month is showing.

- [ ] **Step 1: Create `app/(app)/tools/kalender-promo/campaign-filters.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignStatus } from "@/lib/promo-campaigns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ALL = "all";
const STATUS_LABEL: Record<CampaignStatus, string> = {
  planned: "Planned",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

export function CampaignFilters({
  brands,
  marketplaceOptions,
  brand,
  marketplace,
  status,
  view,
  year,
  month,
}: {
  brands: Brand[];
  marketplaceOptions: string[];
  brand: string;
  marketplace: string;
  status: string;
  view: string;
  year: number;
  month: number;
}) {
  const router = useRouter();

  function nav(next: Partial<{ brand: string; marketplace: string; status: string; view: string }>) {
    const m = { brand, marketplace, status, view, ...next };
    const params = new URLSearchParams();
    if (m.brand !== ALL) params.set("brand", m.brand);
    if (m.marketplace !== ALL) params.set("marketplace", m.marketplace);
    if (m.status !== ALL) params.set("status", m.status);
    params.set("view", m.view);
    params.set("year", String(year));
    params.set("month", String(month));
    router.push(`/tools/kalender-promo?${params.toString()}`);
  }

  const brandItems = { [ALL]: "Semua brand", ...Object.fromEntries(brands.map((b) => [b.id, b.name])) };
  const marketplaceItems = {
    [ALL]: "Semua marketplace",
    ...Object.fromEntries(marketplaceOptions.map((m) => [m, m])),
  };
  const statusItems = { [ALL]: "Semua status", ...STATUS_LABEL };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        <Select items={brandItems} value={brand} onValueChange={(v) => nav({ brand: v ?? ALL })}>
          <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua brand</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          items={marketplaceItems}
          value={marketplace}
          onValueChange={(v) => nav({ marketplace: v ?? ALL })}
        >
          <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua marketplace</SelectItem>
            {marketplaceOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={statusItems} value={status} onValueChange={(v) => nav({ status: v ?? ALL })}>
          <SelectTrigger className="min-w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            {(Object.keys(STATUS_LABEL) as CampaignStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-1 rounded-md border p-0.5">
        <Button variant={view === "list" ? "ghost" : "secondary"} size="sm" onClick={() => nav({ view: "grid" })}>
          <LayoutGrid className="size-4" /> Grid
        </Button>
        <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => nav({ view: "list" })}>
          <List className="size-4" /> List
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `campaign-filters.tsx`

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/kalender-promo/campaign-filters.tsx"
git commit -m "feat(kalender-promo): brand/marketplace/status filters + view toggle"
```

---

### Task 7: Month grid view

**Files:**
- Create: `app/(app)/tools/kalender-promo/month-grid.tsx`

**Interfaces:**
- Consumes: `getMonthGrid`, `campaignSpanInWeek`, `layoutWeekBars` from `@/lib/promo-calendar-grid` (Task 1); `CampaignRow` from `@/lib/promo-campaigns` (Task 3); `Brand` from `@/lib/brands`; `CampaignDialog` from `./campaign-dialog` (Task 5).
- Produces: `MonthGrid({ year, month, campaigns, brands, marketplaceOptions, brandColors, filterBrand, filterMarketplace, filterStatus }): JSX.Element`. `campaigns` is the **full filtered list** (not pre-restricted to the active month) — `MonthGrid` picks out whatever overlaps each visible week itself via `campaignSpanInWeek`.

- [ ] **Step 1: Create `app/(app)/tools/kalender-promo/month-grid.tsx`**

```tsx
import Link from "next/link";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignRow } from "@/lib/promo-campaigns";
import { getMonthGrid, campaignSpanInWeek, layoutWeekBars } from "@/lib/promo-calendar-grid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CampaignDialog } from "./campaign-dialog";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MAX_ROWS = 3;

export function MonthGrid({
  year,
  month,
  campaigns,
  brands,
  marketplaceOptions,
  brandColors,
  filterBrand,
  filterMarketplace,
  filterStatus,
}: {
  year: number;
  month: number;
  campaigns: CampaignRow[];
  brands: Brand[];
  marketplaceOptions: string[];
  brandColors: Map<string, string>;
  filterBrand: string;
  filterMarketplace: string;
  filterStatus: string;
}) {
  const active = new Date(year, month - 1, 1);
  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");

  function hrefFor(target: Date, view: "grid" | "list" = "grid") {
    const params = new URLSearchParams();
    if (filterBrand !== "all") params.set("brand", filterBrand);
    if (filterMarketplace !== "all") params.set("marketplace", filterMarketplace);
    if (filterStatus !== "all") params.set("status", filterStatus);
    params.set("view", view);
    params.set("year", String(target.getFullYear()));
    params.set("month", String(target.getMonth() + 1));
    return `/tools/kalender-promo?${params.toString()}`;
  }

  const weeks = getMonthGrid(year, month);

  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bulan sebelumnya"
            render={<Link href={hrefFor(subMonths(active, 1))} />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {MONTHS[month - 1]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bulan berikutnya"
            render={<Link href={hrefFor(addMonths(active, 1))} />}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" render={<Link href={hrefFor(today)} />}>
          Hari ini
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="p-2">{d}</div>
        ))}
      </div>

      {/* ponytail: horizontal scroll on narrow screens instead of an auto grid/list
          switch — the manual toggle above already covers mobile, and this avoids
          double-fetching/double-rendering both views on every request. */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {weeks.map((week, weekIdx) => {
            const weekStart = format(week[0], "yyyy-MM-dd");
            const weekEnd = format(week[6], "yyyy-MM-dd");
            const segments = campaigns
              .flatMap((c) =>
                c.brands.map((b) => {
                  const span = campaignSpanInWeek(c.startDate, c.endDate, weekStart, weekEnd);
                  if (!span) return null;
                  return { id: `${c.id}:${b.id}`, ...span, campaign: c, brandId: b.id };
                }),
              )
              .filter((s): s is NonNullable<typeof s> => s !== null);
            const { placed, overflowByCol } = layoutWeekBars(segments, MAX_ROWS);

            return (
              <div
                key={weekIdx}
                className="grid grid-cols-7 border-b last:border-b-0"
                style={{ gridTemplateRows: `auto repeat(${MAX_ROWS}, auto) auto` }}
              >
                {week.map((day, i) => {
                  const iso = format(day, "yyyy-MM-dd");
                  const inMonth = day.getMonth() === month - 1;
                  const isToday = iso === todayIso;
                  const occupied =
                    placed.some((p) => i + 1 >= p.colStart && i + 1 < p.colStart + p.colSpan) ||
                    overflowByCol[i] > 0;

                  return (
                    <div key={iso} style={{ gridColumn: i + 1, gridRow: 1 }} className="border-r p-1 last:border-r-0">
                      {occupied ? (
                        <span
                          className={cn(
                            "text-xs",
                            isToday && "font-semibold text-primary",
                            !inMonth && "text-muted-foreground",
                          )}
                        >
                          {day.getDate()}
                        </span>
                      ) : (
                        <CampaignDialog
                          brands={brands}
                          marketplaceOptions={marketplaceOptions}
                          defaultDate={iso}
                          trigger={
                            <button
                              type="button"
                              className={cn(
                                "block h-full min-h-16 w-full text-left align-top text-xs hover:bg-muted/50",
                                isToday && "font-semibold text-primary",
                                !inMonth && "text-muted-foreground",
                              )}
                            >
                              {day.getDate()}
                            </button>
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {placed.map((bar) => (
                  <div
                    key={bar.id}
                    style={{ gridColumn: `${bar.colStart} / span ${bar.colSpan}`, gridRow: bar.row + 2 }}
                    className="px-0.5 pb-0.5"
                  >
                    <CampaignDialog
                      brands={brands}
                      marketplaceOptions={marketplaceOptions}
                      campaign={bar.campaign}
                      trigger={
                        <button
                          type="button"
                          style={{ backgroundColor: brandColors.get(bar.brandId) }}
                          className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-white"
                        >
                          {bar.campaign.name}
                        </button>
                      }
                    />
                  </div>
                ))}

                {overflowByCol.map((count, i) =>
                  count > 0 ? (
                    <Link
                      key={i}
                      href={hrefFor(active, "list")}
                      style={{ gridColumn: i + 1, gridRow: MAX_ROWS + 2 }}
                      className="px-1.5 pb-1 text-[11px] text-muted-foreground hover:underline"
                    >
                      +{count} lainnya
                    </Link>
                  ) : null,
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `month-grid.tsx`

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/kalender-promo/month-grid.tsx"
git commit -m "feat(kalender-promo): month grid view with per-brand campaign bars"
```

---

### Task 8: Campaign list view

**Files:**
- Create: `app/(app)/tools/kalender-promo/campaign-list.tsx`

**Interfaces:**
- Consumes: `CampaignRow`, `CampaignStatus` from `@/lib/promo-campaigns` (Task 3); `Brand` from `@/lib/brands`; `formatPeriodRange` from `@/lib/dates`; `CampaignDialog` from `./campaign-dialog` (Task 5); `DeleteCampaignButton` from `./delete-campaign-button` (Task 4).
- Produces: `CampaignList({ campaigns, brands, marketplaceOptions, brandColors }): JSX.Element` — groups by the month of `startDate`; shows every campaign matching the active filters (not limited to one month).

- [ ] **Step 1: Create `app/(app)/tools/kalender-promo/campaign-list.tsx`**

```tsx
import { CalendarRange, Pencil } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignRow, CampaignStatus } from "@/lib/promo-campaigns";
import { formatPeriodRange } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CampaignDialog } from "./campaign-dialog";
import { DeleteCampaignButton } from "./delete-campaign-button";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const STATUS_LABEL: Record<CampaignStatus, string> = {
  planned: "Planned",
  berjalan: "Berjalan",
  selesai: "Selesai",
};
const STATUS_VARIANT: Record<CampaignStatus, "outline" | "default" | "secondary"> = {
  planned: "outline",
  berjalan: "default",
  selesai: "secondary",
};

export function CampaignList({
  campaigns,
  brands,
  marketplaceOptions,
  brandColors,
}: {
  campaigns: CampaignRow[];
  brands: Brand[];
  marketplaceOptions: string[];
  brandColors: Map<string, string>;
}) {
  if (campaigns.length === 0) {
    return (
      <Empty className="min-h-[40vh] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarRange />
          </EmptyMedia>
          <EmptyTitle>Belum ada campaign</EmptyTitle>
          <EmptyDescription>Tambah jadwal promo lewat tombol di atas.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = new Map<string, CampaignRow[]>();
  for (const c of campaigns) {
    const d = new Date(`${c.startDate}T00:00:00`);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([key, rows]) => {
        const [y, m] = key.split("-").map(Number);
        return (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {MONTHS[m]} {y}
            </h3>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.brands.map((b) => (
                            <Badge
                              key={b.id}
                              style={{ backgroundColor: brandColors.get(b.id) }}
                              className="text-white"
                            >
                              {b.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.marketplaces.map((mp) => (
                            <Badge key={mp} variant="outline">{mp}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPeriodRange(c.startDate, c.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-50 truncate text-muted-foreground">
                        {c.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CampaignDialog
                            brands={brands}
                            marketplaceOptions={marketplaceOptions}
                            campaign={c}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label="Edit">
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          <DeleteCampaignButton id={c.id} label={c.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `campaign-list.tsx`

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/tools/kalender-promo/campaign-list.tsx"
git commit -m "feat(kalender-promo): campaign list view grouped by month"
```

---

### Task 9: Page assembly + smoke tests

**Files:**
- Rewrite: `app/(app)/tools/kalender-promo/page.tsx`
- Test: `app/(app)/tools/kalender-promo/__tests__/kalender-promo.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–8, plus `listBrands` from `@/lib/brands`, `PageHeader` from `@/components/page-header`.
- Produces: the assembled page (default export), and a smoke-render test for `MonthGrid`/`CampaignList`.

- [ ] **Step 1: Write the failing test** — create `app/(app)/tools/kalender-promo/__tests__/kalender-promo.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthGrid } from "../month-grid";
import { CampaignList } from "../campaign-list";
import type { CampaignRow } from "@/lib/promo-campaigns";
import type { Brand } from "@/lib/brands";

const brands: Brand[] = [{ id: "b1", name: "Brand A" }];
const campaign: CampaignRow = {
  id: "c1",
  name: "11.11 Big Sale",
  startDate: "2026-07-11",
  endDate: "2026-07-12",
  notes: "",
  brands,
  marketplaces: ["Shopee"],
  status: "planned",
  createdAt: "2026-07-01T00:00:00.000Z",
};
const brandColors = new Map([["b1", "#5b9df0"]]);

describe("MonthGrid", () => {
  it("renders the active month label and weekday headers", () => {
    render(
      <MonthGrid
        year={2026}
        month={7}
        campaigns={[campaign]}
        brands={brands}
        marketplaceOptions={["Shopee"]}
        brandColors={brandColors}
        filterBrand="all"
        filterMarketplace="all"
        filterStatus="all"
      />,
    );
    expect(screen.getByText("Juli 2026")).toBeTruthy();
    expect(screen.getByText("Min")).toBeTruthy();
  });

  it("renders a bar for a campaign that falls in the visible month", () => {
    render(
      <MonthGrid
        year={2026}
        month={7}
        campaigns={[campaign]}
        brands={brands}
        marketplaceOptions={["Shopee"]}
        brandColors={brandColors}
        filterBrand="all"
        filterMarketplace="all"
        filterStatus="all"
      />,
    );
    expect(screen.getByText("11.11 Big Sale")).toBeTruthy();
  });
});

describe("CampaignList", () => {
  it("shows the empty state when there are no campaigns", () => {
    render(
      <CampaignList campaigns={[]} brands={brands} marketplaceOptions={["Shopee"]} brandColors={brandColors} />,
    );
    expect(screen.getByText("Belum ada campaign")).toBeTruthy();
  });

  it("lists a campaign with its brand chip and status", () => {
    render(
      <CampaignList
        campaigns={[campaign]}
        brands={brands}
        marketplaceOptions={["Shopee"]}
        brandColors={brandColors}
      />,
    );
    expect(screen.getByText("11.11 Big Sale")).toBeTruthy();
    expect(screen.getByText("Brand A")).toBeTruthy();
    expect(screen.getByText("Planned")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run app/\(app\)/tools/kalender-promo/__tests__/kalender-promo.test.tsx`
Expected: FAIL — `../month-grid` / `../campaign-list` not found (page.tsx still the old placeholder doesn't affect this, but confirms the test file runs)

- [ ] **Step 3: Rewrite `app/(app)/tools/kalender-promo/page.tsx`**

```tsx
import { listBrands } from "@/lib/brands";
import { getCampaigns, getMarketplaces, parseCampaignFilters } from "@/lib/promo-campaigns";
import { assignBrandColors } from "@/lib/chart-colors";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CampaignDialog } from "./campaign-dialog";
import { CampaignFilters } from "./campaign-filters";
import { MonthGrid } from "./month-grid";
import { CampaignList } from "./campaign-list";

export default async function KalenderPromoPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string;
    marketplace?: string;
    status?: string;
    view?: string;
    year?: string;
    month?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters = parseCampaignFilters(sp);
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;
  const view = sp.view === "list" ? "list" : "grid";

  const [campaigns, brands, marketplaceOptions] = await Promise.all([
    getCampaigns(filters),
    listBrands(),
    getMarketplaces(),
  ]);
  const brandColors = assignBrandColors(brands);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kalender Promo"
        description="Jadwal promo marketplace & campaign brand."
        actions={
          <CampaignDialog
            brands={brands}
            marketplaceOptions={marketplaceOptions}
            trigger={<Button>+ Tambah Campaign</Button>}
          />
        }
      />

      <CampaignFilters
        brands={brands}
        marketplaceOptions={marketplaceOptions}
        brand={sp.brand ?? "all"}
        marketplace={sp.marketplace ?? "all"}
        status={sp.status ?? "all"}
        view={view}
        year={year}
        month={month}
      />

      {view === "list" ? (
        <CampaignList
          campaigns={campaigns}
          brands={brands}
          marketplaceOptions={marketplaceOptions}
          brandColors={brandColors}
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          campaigns={campaigns}
          brands={brands}
          marketplaceOptions={marketplaceOptions}
          brandColors={brandColors}
          filterBrand={sp.brand ?? "all"}
          filterMarketplace={sp.marketplace ?? "all"}
          filterStatus={sp.status ?? "all"}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run app/\(app\)/tools/kalender-promo/__tests__/kalender-promo.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Full verification**

Run, in order:
1. `npx tsc --noEmit` — Expected: no errors
2. `npx vitest run` — Expected: every test file passes (existing suite + the new ones from Tasks 1, 2, 3, 9)
3. `npm run build` — Expected: production build succeeds

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/tools/kalender-promo/page.tsx" "app/(app)/tools/kalender-promo/__tests__/kalender-promo.test.tsx"
git commit -m "feat(kalender-promo): page assembly + smoke tests"
```

---

## After implementation

Hand the user the SQL from Task 3 Step 1 to run in the Supabase SQL editor (if not already applied) before the page will show real data. Manually verify in the browser: add a campaign spanning multiple brands/marketplaces and multiple weeks, confirm the bar renders correctly across week rows, confirm status badges match today's date, confirm the List view groups by month, confirm filters preserve the active month.
