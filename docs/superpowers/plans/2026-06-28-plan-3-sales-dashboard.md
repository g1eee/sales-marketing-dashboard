# Sales: Dashboard Implementation Plan (Plan 3 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Sales analytics dashboard: brand + period + comparison + order-status controls, KPI cards with %-change, daily trend chart, sales-source composition, top-products table, and an ads panel — all reading data saved by Plan 2.

**Architecture:** Pure aggregation and comparison math lives in `lib/analytics/` (unit-tested). A server-side data layer (`lib/sales/dashboard-data.ts`) fetches a period (and its comparison period) from Supabase and hands plain objects to server components. Charts use Recharts inside small client components; everything else renders server-side.

**Tech Stack:** Recharts, Next.js server components + a few client components, Supabase, Vitest.

## Global Constraints

- Platform scope: **Shopee only** (filter UI shows Shopee; structure ready for more).
- All data scoped by **brand** and **period**; comparison is between two `report_periods`.
- Default order status = **`dibuat`** ("Pesanan Dibuat"); user can switch to `siap_dikirim` / `dibayar`.
- Money is integer rupiah; rates are fractions (`0.0274`) — format to `%` only in the UI.
- Percent-change formula: `(current - previous) / previous`; if previous is 0/absent → return `null` (render "—"), never divide by zero.
- Pure math in `lib/analytics/`; components do not compute aggregates.

---

## File Structure

```
lib/analytics/
├── aggregate.ts        # sumDailyTotals, pickStatus
├── compare.ts          # pctChange, compareTotals, compareRows
├── format.ts           # formatRupiah, formatPercent, formatDelta
└── __tests__/*.test.ts
lib/sales/
└── dashboard-data.ts   # getPeriods, getDashboardData (server)
app/(app)/sales/dashboard/
├── page.tsx            # reads searchParams, renders controls + sections
├── controls.tsx        # client: brand/period/compare/status selectors
├── kpi-cards.tsx       # server component
├── trend-chart.tsx     # client (Recharts)
├── source-chart.tsx    # client (Recharts)
├── product-table.tsx   # server component
└── ads-panel.tsx       # server component
```

---

## Task 1: Aggregation math — TDD

**Files:**
- Create: `lib/analytics/aggregate.ts`
- Test: `lib/analytics/__tests__/aggregate.test.ts`

**Interfaces:**
- Consumes: `GlobalDailyRow` from `lib/parsers/types`.
- Produces:
  - `interface Totals { omzet: number; pesanan: number; pengunjung: number; penjualan_per_pesanan: number; konversi: number | null; dibatalkan: number; }`
  - `pickStatus(rows: GlobalDailyRow[], status: GlobalDailyRow["status"]): GlobalDailyRow[]`
  - `sumDailyTotals(rows: GlobalDailyRow[]): Totals` — sums omzet/pesanan/pengunjung/dibatalkan, recomputes penjualan_per_pesanan = omzet/pesanan and konversi = pesanan/pengunjung.

- [ ] **Step 1: Write the failing test — `lib/analytics/__tests__/aggregate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { pickStatus, sumDailyTotals } from "@/lib/analytics/aggregate";
import type { GlobalDailyRow } from "@/lib/parsers/types";

const rows: GlobalDailyRow[] = [
  { date: "2026-06-01", status: "dibuat", total_penjualan: 1000, total_pesanan: 10, penjualan_per_pesanan: 100, produk_diklik: 5, total_pengunjung: 200, konversi: 0.05, pesanan_dibatalkan: 1 },
  { date: "2026-06-02", status: "dibuat", total_penjualan: 3000, total_pesanan: 30, penjualan_per_pesanan: 100, produk_diklik: 9, total_pengunjung: 300, konversi: 0.1, pesanan_dibatalkan: 2 },
  { date: "2026-06-01", status: "dibayar", total_penjualan: 999, total_pesanan: 9, penjualan_per_pesanan: 111, produk_diklik: 5, total_pengunjung: 200, konversi: 0.045, pesanan_dibatalkan: 0 },
];

describe("pickStatus", () => {
  it("filters by status", () => {
    expect(pickStatus(rows, "dibuat")).toHaveLength(2);
  });
});

describe("sumDailyTotals", () => {
  const t = sumDailyTotals(pickStatus(rows, "dibuat"));
  it("sums omzet and pesanan", () => {
    expect(t.omzet).toBe(4000);
    expect(t.pesanan).toBe(40);
    expect(t.pengunjung).toBe(500);
    expect(t.dibatalkan).toBe(3);
  });
  it("recomputes average order value", () => {
    expect(t.penjualan_per_pesanan).toBe(100);
  });
  it("recomputes conversion as pesanan/pengunjung", () => {
    expect(t.konversi).toBeCloseTo(40 / 500, 4);
  });
  it("handles empty input", () => {
    const e = sumDailyTotals([]);
    expect(e.omzet).toBe(0);
    expect(e.konversi).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- aggregate`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/analytics/aggregate.ts`**

```ts
import type { GlobalDailyRow } from "@/lib/parsers/types";

export interface Totals {
  omzet: number;
  pesanan: number;
  pengunjung: number;
  penjualan_per_pesanan: number;
  konversi: number | null;
  dibatalkan: number;
}

export function pickStatus(
  rows: GlobalDailyRow[],
  status: GlobalDailyRow["status"],
): GlobalDailyRow[] {
  return rows.filter((r) => r.status === status);
}

export function sumDailyTotals(rows: GlobalDailyRow[]): Totals {
  const omzet = rows.reduce((s, r) => s + r.total_penjualan, 0);
  const pesanan = rows.reduce((s, r) => s + r.total_pesanan, 0);
  const pengunjung = rows.reduce((s, r) => s + (r.total_pengunjung ?? 0), 0);
  const dibatalkan = rows.reduce((s, r) => s + (r.pesanan_dibatalkan ?? 0), 0);
  return {
    omzet,
    pesanan,
    pengunjung,
    dibatalkan,
    penjualan_per_pesanan: pesanan > 0 ? Math.round(omzet / pesanan) : 0,
    konversi: pengunjung > 0 ? pesanan / pengunjung : null,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- aggregate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add daily aggregation math with tests"
```

---

## Task 2: Comparison math — TDD

**Files:**
- Create: `lib/analytics/compare.ts`
- Test: `lib/analytics/__tests__/compare.test.ts`

**Interfaces:**
- Consumes: `Totals` from `aggregate.ts`.
- Produces:
  - `pctChange(current: number, previous: number | null): number | null` — `(c-p)/p`; null when previous is null/0.
  - `interface TotalsComparison { current: Totals; previous: Totals | null; delta: Record<keyof Totals, number | null>; }`
  - `compareTotals(current: Totals, previous: Totals | null): TotalsComparison`

- [ ] **Step 1: Write the failing test — `lib/analytics/__tests__/compare.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { pctChange, compareTotals } from "@/lib/analytics/compare";
import type { Totals } from "@/lib/analytics/aggregate";

const mk = (omzet: number, pesanan: number): Totals => ({
  omzet, pesanan, pengunjung: 100, penjualan_per_pesanan: 0, konversi: 0.1, dibatalkan: 0,
});

describe("pctChange", () => {
  it("computes growth", () => {
    expect(pctChange(150, 100)).toBeCloseTo(0.5, 4);
  });
  it("computes decline", () => {
    expect(pctChange(80, 100)).toBeCloseTo(-0.2, 4);
  });
  it("returns null when previous is 0 or null", () => {
    expect(pctChange(80, 0)).toBeNull();
    expect(pctChange(80, null)).toBeNull();
  });
});

describe("compareTotals", () => {
  it("produces deltas per metric", () => {
    const c = compareTotals(mk(150, 20), mk(100, 10));
    expect(c.delta.omzet).toBeCloseTo(0.5, 4);
    expect(c.delta.pesanan).toBeCloseTo(1.0, 4);
  });
  it("null deltas when no previous period", () => {
    const c = compareTotals(mk(150, 20), null);
    expect(c.previous).toBeNull();
    expect(c.delta.omzet).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- compare`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/analytics/compare.ts`**

```ts
import type { Totals } from "@/lib/analytics/aggregate";

export function pctChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

export interface TotalsComparison {
  current: Totals;
  previous: Totals | null;
  delta: Record<keyof Totals, number | null>;
}

const KEYS: (keyof Totals)[] = [
  "omzet", "pesanan", "pengunjung", "penjualan_per_pesanan", "konversi", "dibatalkan",
];

export function compareTotals(current: Totals, previous: Totals | null): TotalsComparison {
  const delta = {} as Record<keyof Totals, number | null>;
  for (const k of KEYS) {
    const cv = (current[k] ?? 0) as number;
    const pv = previous ? ((previous[k] ?? 0) as number) : null;
    delta[k] = pctChange(cv, pv);
  }
  return { current, previous, delta };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- compare`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add comparison math with tests"
```

---

## Task 3: Formatting helpers — TDD

**Files:**
- Create: `lib/analytics/format.ts`
- Test: `lib/analytics/__tests__/format.test.ts`

**Interfaces:**
- Produces:
  - `formatRupiah(n: number): string` → `"Rp 163.133.332"`.
  - `formatPercent(fraction: number | null, digits?: number): string` → `"2,74%"` or `"—"`.
  - `formatDelta(fraction: number | null): { text: string; direction: "up"|"down"|"flat"|"none" }`.

- [ ] **Step 1: Write the failing test — `lib/analytics/__tests__/format.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { formatRupiah, formatPercent, formatDelta } from "@/lib/analytics/format";

describe("formatRupiah", () => {
  it("formats with thousands separators", () => {
    expect(formatRupiah(163133332)).toBe("Rp 163.133.332");
  });
});

describe("formatPercent", () => {
  it("formats a fraction", () => {
    expect(formatPercent(0.0274)).toBe("2,74%");
  });
  it("renders dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatDelta", () => {
  it("marks growth up", () => {
    expect(formatDelta(0.5)).toEqual({ text: "+50,0%", direction: "up" });
  });
  it("marks decline down", () => {
    expect(formatDelta(-0.2)).toEqual({ text: "-20,0%", direction: "down" });
  });
  it("none when null", () => {
    expect(formatDelta(null)).toEqual({ text: "—", direction: "none" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- format`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/analytics/format.ts`**

```ts
const idNum = new Intl.NumberFormat("id-ID");

export function formatRupiah(n: number): string {
  return `Rp ${idNum.format(Math.round(n))}`;
}

export function formatPercent(fraction: number | null, digits = 2): string {
  if (fraction === null) return "—";
  return `${(fraction * 100).toFixed(digits).replace(".", ",")}%`;
}

export function formatDelta(
  fraction: number | null,
): { text: string; direction: "up" | "down" | "flat" | "none" } {
  if (fraction === null) return { text: "—", direction: "none" };
  const pct = (fraction * 100).toFixed(1).replace(".", ",");
  if (fraction > 0) return { text: `+${pct}%`, direction: "up" };
  if (fraction < 0) return { text: `${pct}%`, direction: "down" };
  return { text: `${pct}%`, direction: "flat" };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rupiah/percent/delta formatting with tests"
```

---

## Task 4: Dashboard data layer

**Files:**
- Create: `lib/sales/dashboard-data.ts`

**Interfaces:**
- Consumes: `createClient` (server), aggregate/compare, parser types.
- Produces:
  - `interface PeriodRef { id: string; period_start: string; period_end: string; }`
  - `getPeriods(brandId: string): Promise<PeriodRef[]>` — newest first.
  - `interface DashboardData { period: PeriodRef; comparison: TotalsComparison; daily: GlobalDailyRow[]; sources: SourceRow[]; products: ProductSummaryRow[]; ads: AdsRow[]; }`
  - `getDashboardData(opts: { periodId: string; comparePeriodId: string | null; status: GlobalDailyRow["status"] }): Promise<DashboardData>`

- [ ] **Step 1: Implement — `lib/sales/dashboard-data.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import { pickStatus, sumDailyTotals } from "@/lib/analytics/aggregate";
import { compareTotals, type TotalsComparison } from "@/lib/analytics/compare";
import type {
  GlobalDailyRow, SourceRow, ProductSummaryRow, AdsRow,
} from "@/lib/parsers/types";

export interface PeriodRef {
  id: string;
  period_start: string;
  period_end: string;
}

export async function getPeriods(brandId: string): Promise<PeriodRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_periods")
    .select("id, period_start, period_end")
    .eq("brand_id", brandId)
    .eq("platform", "shopee")
    .order("period_start", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchDaily(periodId: string): Promise<GlobalDailyRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("global_daily")
    .select("date, status, total_penjualan, total_pesanan, penjualan_per_pesanan, produk_diklik, total_pengunjung, konversi, pesanan_dibatalkan")
    .eq("period_id", periodId)
    .order("date");
  return (data ?? []) as GlobalDailyRow[];
}

export interface DashboardData {
  period: PeriodRef;
  comparison: TotalsComparison;
  daily: GlobalDailyRow[];
  sources: SourceRow[];
  products: ProductSummaryRow[];
  ads: AdsRow[];
}

export async function getDashboardData(opts: {
  periodId: string;
  comparePeriodId: string | null;
  status: GlobalDailyRow["status"];
}): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("report_periods")
    .select("id, period_start, period_end")
    .eq("id", opts.periodId)
    .single();

  const daily = await fetchDaily(opts.periodId);
  const currentRows = pickStatus(daily, opts.status);
  const currentTotals = sumDailyTotals(currentRows);

  let previousTotals = null;
  if (opts.comparePeriodId) {
    const prevDaily = await fetchDaily(opts.comparePeriodId);
    previousTotals = sumDailyTotals(pickStatus(prevDaily, opts.status));
  }

  const [{ data: sources }, { data: products }, { data: ads }] = await Promise.all([
    supabase.from("global_source").select("source, penjualan").eq("period_id", opts.periodId),
    supabase.from("product_summary").select("kode_produk, product_name, penjualan, dilihat, diklik, total_pesanan, persentase_klik, konversi, total_pembeli, extra").eq("period_id", opts.periodId).order("penjualan", { ascending: false }),
    supabase.from("ads_summary").select("*").eq("period_id", opts.periodId).order("omzet", { ascending: false }),
  ]);

  return {
    period: period as PeriodRef,
    comparison: compareTotals(currentTotals, previousTotals),
    daily: currentRows,
    sources: (sources ?? []) as SourceRow[],
    products: (products ?? []) as ProductSummaryRow[],
    ads: (ads ?? []) as AdsRow[],
  };
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dashboard data layer"
```

---

## Task 5: Dashboard controls (client) + page shell

**Files:**
- Create: `app/(app)/sales/dashboard/controls.tsx`, `app/(app)/sales/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getPeriods`, `getDashboardData`, `listBrands`.
- Produces: page reads `searchParams` (`brand`, `period`, `compare`, `status`) and renders controls + (later tasks') sections. Controls update the URL query.

- [ ] **Step 1: Create controls — `app/(app)/sales/dashboard/controls.tsx`**

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Brand } from "@/lib/brands";
import type { PeriodRef } from "@/lib/sales/dashboard-data";

export function Controls({
  brands, periods, brandId, periodId, compareId, status,
}: {
  brands: Brand[]; periods: PeriodRef[];
  brandId?: string; periodId?: string; compareId?: string; status: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "brand") { next.delete("period"); next.delete("compare"); }
    router.push(`/sales/dashboard?${next.toString()}`);
  }

  const label = (p: PeriodRef) => `${p.period_start} → ${p.period_end}`;

  return (
    <div className="flex flex-wrap gap-3">
      <select value={brandId ?? ""} onChange={(e) => set("brand", e.target.value)} className="rounded border p-2">
        <option value="">Pilih brand…</option>
        {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select value={periodId ?? ""} onChange={(e) => set("period", e.target.value)} className="rounded border p-2" disabled={!brandId}>
        <option value="">Pilih periode…</option>
        {periods.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
      </select>
      <select value={compareId ?? ""} onChange={(e) => set("compare", e.target.value)} className="rounded border p-2" disabled={!periodId}>
        <option value="">Tanpa pembanding</option>
        {periods.filter((p) => p.id !== periodId).map((p) => <option key={p.id} value={p.id}>vs {label(p)}</option>)}
      </select>
      <select value={status} onChange={(e) => set("status", e.target.value)} className="rounded border p-2">
        <option value="dibuat">Pesanan Dibuat</option>
        <option value="siap_dikirim">Siap Dikirim</option>
        <option value="dibayar">Dibayar</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Create the page — `app/(app)/sales/dashboard/page.tsx`**

```tsx
import { listBrands } from "@/lib/brands";
import { getPeriods, getDashboardData } from "@/lib/sales/dashboard-data";
import { Controls } from "./controls";
import { KpiCards } from "./kpi-cards";
import { TrendChart } from "./trend-chart";
import { SourceChart } from "./source-chart";
import { ProductTable } from "./product-table";
import { AdsPanel } from "./ads-panel";
import type { GlobalDailyRow } from "@/lib/parsers/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; period?: string; compare?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "dibuat") as GlobalDailyRow["status"];
  const brands = await listBrands();
  const periods = sp.brand ? await getPeriods(sp.brand) : [];
  const data = sp.period
    ? await getDashboardData({ periodId: sp.period, comparePeriodId: sp.compare ?? null, status })
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard Sales</h1>
      <Controls brands={brands} periods={periods} brandId={sp.brand} periodId={sp.period} compareId={sp.compare} status={status} />
      {!data && <p className="text-sm text-muted-foreground">Pilih brand & periode untuk melihat data.</p>}
      {data && (
        <>
          <KpiCards comparison={data.comparison} />
          <div className="grid gap-6 lg:grid-cols-2">
            <TrendChart daily={data.daily} />
            <SourceChart sources={data.sources} />
          </div>
          <ProductTable products={data.products} />
          <AdsPanel ads={data.ads} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit (page will fail to build until Tasks 6–9 add the components; commit after Task 9). For now create placeholder component files so the page builds:**

Create minimal placeholders that Tasks 6–9 replace:
```bash
for f in kpi-cards trend-chart source-chart product-table ads-panel; do
  printf 'export function %s() { return null; }\n' "$(echo $f | sed -r 's/(^|-)([a-z])/\U\2/g')" \
    > "app/(app)/sales/dashboard/$f.tsx"
done
```

(The exported names become `KpiCards`, `TrendChart`, `SourceChart`, `ProductTable`, `AdsPanel`.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: success (components are stubs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard controls and page shell with stub sections"
```

---

## Task 6: KPI cards

**Files:**
- Modify: `app/(app)/sales/dashboard/kpi-cards.tsx`

**Interfaces:**
- Consumes: `TotalsComparison`, `formatRupiah`, `formatPercent`, `formatDelta`.
- Produces: `KpiCards({ comparison }: { comparison: TotalsComparison })`.

- [ ] **Step 1: Implement — `app/(app)/sales/dashboard/kpi-cards.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import type { TotalsComparison } from "@/lib/analytics/compare";
import { formatRupiah, formatPercent, formatDelta } from "@/lib/analytics/format";

function Delta({ value }: { value: number | null }) {
  const d = formatDelta(value);
  const color =
    d.direction === "up" ? "text-green-600"
    : d.direction === "down" ? "text-red-600"
    : "text-muted-foreground";
  return <span className={`text-xs ${color}`}>{d.text}</span>;
}

export function KpiCards({ comparison }: { comparison: TotalsComparison }) {
  const { current, delta } = comparison;
  const cards = [
    { label: "Omzet", value: formatRupiah(current.omzet), d: delta.omzet },
    { label: "Total Pesanan", value: current.pesanan.toLocaleString("id-ID"), d: delta.pesanan },
    { label: "Pengunjung", value: current.pengunjung.toLocaleString("id-ID"), d: delta.pengunjung },
    { label: "Konversi", value: formatPercent(current.konversi), d: delta.konversi },
    { label: "Penjualan / Pesanan", value: formatRupiah(current.penjualan_per_pesanan), d: delta.penjualan_per_pesanan },
    { label: "Pesanan Dibatalkan", value: current.dibatalkan.toLocaleString("id-ID"), d: delta.dibatalkan },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <p className="text-sm text-muted-foreground">{c.label}</p>
          <p className="text-2xl font-semibold">{c.value}</p>
          <Delta value={c.d} />
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add KPI cards with percent-change badges"
```

---

## Task 7: Daily trend chart + source composition chart

**Files:**
- Modify: `app/(app)/sales/dashboard/trend-chart.tsx`, `app/(app)/sales/dashboard/source-chart.tsx`

**Interfaces:**
- Consumes: `GlobalDailyRow`, `SourceRow`, Recharts.
- Produces: `TrendChart({ daily })`, `SourceChart({ sources })`.

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Implement — `app/(app)/sales/dashboard/trend-chart.tsx`**

```tsx
"use client";

import { Card } from "@/components/ui/card";
import type { GlobalDailyRow } from "@/lib/parsers/types";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export function TrendChart({ daily }: { daily: GlobalDailyRow[] }) {
  const data = daily.map((d) => ({
    date: d.date.slice(5),
    omzet: d.total_penjualan,
    pesanan: d.total_pesanan,
  }));
  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium">Tren Harian</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis yAxisId="left" hide />
          <YAxis yAxisId="right" orientation="right" hide />
          <Tooltip />
          <Line yAxisId="left" type="monotone" dataKey="omzet" stroke="#2563eb" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="pesanan" stroke="#16a34a" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 3: Implement — `app/(app)/sales/dashboard/source-chart.tsx`**

```tsx
"use client";

import { Card } from "@/components/ui/card";
import type { SourceRow } from "@/lib/parsers/types";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const LABELS: Record<string, string> = {
  halaman_produk: "Halaman Produk", live: "Live", video: "Video",
  affiliate: "Affiliate", iklan_shopee: "Iklan Shopee",
};
const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#db2777", "#7c3aed"];

export function SourceChart({ sources }: { sources: SourceRow[] }) {
  const data = sources.map((s) => ({ name: LABELS[s.source] ?? s.source, value: s.penjualan }));
  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium">Komposisi Sumber Penjualan</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add daily trend and source composition charts"
```

---

## Task 8: Top-products table

**Files:**
- Modify: `app/(app)/sales/dashboard/product-table.tsx`

**Interfaces:**
- Consumes: `ProductSummaryRow`, `formatRupiah`, `formatPercent`.
- Produces: `ProductTable({ products })`.

- [ ] **Step 1: Implement — `app/(app)/sales/dashboard/product-table.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import {
  Table, Tablebody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ProductSummaryRow } from "@/lib/parsers/types";
import { formatRupiah, formatPercent } from "@/lib/analytics/format";

export function ProductTable({ products }: { products: ProductSummaryRow[] }) {
  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-medium">Produk Terlaris</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produk</TableHead>
            <TableHead className="text-right">Omzet</TableHead>
            <TableHead className="text-right">Dilihat</TableHead>
            <TableHead className="text-right">Konversi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-muted-foreground">Tidak ada data produk.</TableCell></TableRow>
          )}
          {products.slice(0, 20).map((p) => (
            <TableRow key={p.kode_produk}>
              <TableCell className="max-w-xs truncate">{p.product_name}</TableCell>
              <TableCell className="text-right">{formatRupiah(p.penjualan)}</TableCell>
              <TableCell className="text-right">{(p.dilihat ?? 0).toLocaleString("id-ID")}</TableCell>
              <TableCell className="text-right">{formatPercent(p.konversi)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
```

> Note: shadcn exports are `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell` — match the casing from `@/components/ui/table`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add top-products table"
```

---

## Task 9: Ads panel

**Files:**
- Modify: `app/(app)/sales/dashboard/ads-panel.tsx`

**Interfaces:**
- Consumes: `AdsRow`, `formatRupiah`, `formatPercent`.
- Produces: `AdsPanel({ ads })` — summary KPIs (total biaya, omzet iklan, blended ROAS, ACOS) + per-ad table.

- [ ] **Step 1: Implement — `app/(app)/sales/dashboard/ads-panel.tsx`**

```tsx
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { AdsRow } from "@/lib/parsers/types";
import { formatRupiah, formatPercent } from "@/lib/analytics/format";

export function AdsPanel({ ads }: { ads: AdsRow[] }) {
  const biaya = ads.reduce((s, a) => s + (a.biaya ?? 0), 0);
  const omzet = ads.reduce((s, a) => s + (a.omzet ?? 0), 0);
  const roas = biaya > 0 ? omzet / biaya : null;
  const acos = omzet > 0 ? biaya / omzet : null;

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-medium">Iklan</p>
      <div className="grid gap-4 sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Biaya Iklan</p><p className="text-lg font-semibold">{formatRupiah(biaya)}</p></div>
        <div><p className="text-xs text-muted-foreground">Omzet Iklan</p><p className="text-lg font-semibold">{formatRupiah(omzet)}</p></div>
        <div><p className="text-xs text-muted-foreground">ROAS</p><p className="text-lg font-semibold">{roas === null ? "—" : roas.toFixed(2)}</p></div>
        <div><p className="text-xs text-muted-foreground">ACOS</p><p className="text-lg font-semibold">{formatPercent(acos)}</p></div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Iklan</TableHead>
            <TableHead className="text-right">Biaya</TableHead>
            <TableHead className="text-right">Omzet</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">CTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-muted-foreground">Tidak ada data iklan.</TableCell></TableRow>
          )}
          {ads.map((a) => (
            <TableRow key={a.nama_iklan}>
              <TableCell className="max-w-xs truncate">{a.nama_iklan}</TableCell>
              <TableCell className="text-right">{formatRupiah(a.biaya ?? 0)}</TableCell>
              <TableCell className="text-right">{formatRupiah(a.omzet ?? 0)}</TableCell>
              <TableCell className="text-right">{a.roas === null ? "—" : a.roas.toFixed(2)}</TableCell>
              <TableCell className="text-right">{formatPercent(a.ctr)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual verification (end-to-end)**

Run `npm run dev`, sign in, open `/sales/dashboard`. Select the brand and the uploaded period, set a comparison period, toggle order status.
Expected: KPI cards show values with ▲/▼ %; trend chart shows daily omzet/pesanan; source pie renders; product & ads tables populate.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all analytics + parser tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ads panel and complete sales dashboard"
```

---

## Task 10: CSV export of tables

**Files:**
- Create: `lib/analytics/csv.ts`
- Test: `lib/analytics/__tests__/csv.test.ts`
- Modify: `app/(app)/sales/dashboard/product-table.tsx` (add an export button via a small client wrapper)

**Interfaces:**
- Produces: `toCsv(headers: string[], rows: (string | number | null)[][]): string` (pure, tested).

- [ ] **Step 1: Write the failing test — `lib/analytics/__tests__/csv.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/analytics/csv";

describe("toCsv", () => {
  it("builds a csv with header and rows", () => {
    const out = toCsv(["a", "b"], [[1, "x"], [2, null]]);
    expect(out).toBe("a,b\n1,x\n2,");
  });
  it("quotes values containing commas", () => {
    const out = toCsv(["name"], [["Kalova, Inc"]]);
    expect(out).toBe('name\n"Kalova, Inc"');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- csv`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/analytics/csv.ts`**

```ts
function cell(v: string | number | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(row.map(cell).join(","));
  return lines.join("\n");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- csv`
Expected: PASS.

- [ ] **Step 5: Add a client export button — create `app/(app)/sales/dashboard/export-button.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";

export function ExportButton({ filename, csv }: { filename: string; csv: string }) {
  function download() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return <Button variant="outline" size="sm" onClick={download}>Export CSV</Button>;
}
```

- [ ] **Step 6: Wire export into the product table**

In `product-table.tsx`, import `toCsv` and `ExportButton`, build the CSV from `products`, and render `<ExportButton filename="produk.csv" csv={csv} />` in the header row.

```tsx
import { toCsv } from "@/lib/analytics/csv";
import { ExportButton } from "./export-button";
// inside component, before return:
const csv = toCsv(
  ["Produk", "Omzet", "Dilihat", "Konversi"],
  products.map((p) => [p.product_name, p.penjualan, p.dilihat, p.konversi]),
);
// in the header area:
// <div className="flex items-center justify-between"><p ...>Produk Terlaris</p><ExportButton filename="produk.csv" csv={csv} /></div>
```

- [ ] **Step 7: Verify build + tests**

Run: `npm run build && npm test`
Expected: both succeed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add csv export for dashboard tables"
```

---

## Self-Review

**Spec coverage (Plan 3 portion):**
- Controls: brand / period / comparison / order-status toggle → Task 5. ✓
- KPI cards with Δ% → Task 6. ✓
- Daily trend chart → Task 7. ✓
- Source composition → Task 7. ✓
- Top-products table (+ click-to-detail is deferred; table + export delivered) → Tasks 8,10. ✓
- Ads panel (KPIs + per-ad table) → Task 9. ✓
- Period comparison %-change, divide-by-zero safe → Tasks 2,3. ✓
- Export CSV → Task 10. ✓
- Default status `dibuat` → Task 5 page default. ✓

**Placeholder scan:** Task 5 intentionally creates stub component files that Tasks 6–9 replace — each replacement step has full code. No lingering TBD/TODO. ✓

**Type consistency:** `Totals` (Task 1) → `compareTotals`/`TotalsComparison` (Task 2) → consumed in data layer (Task 4) and `KpiCards` (Task 6). `PeriodRef`, `DashboardData` (Task 4) consumed by page (Task 5). Parser types reused from Plan 2. `formatRupiah`/`formatPercent`/`formatDelta` names consistent across Tasks 3,6,8,9. shadcn table export casing flagged in Task 8 note. ✓

> Deferred from spec (acceptable, documented): product row click → variation detail drill-down. The data exists (`product_detail`); add a detail route in a later iteration if needed.
