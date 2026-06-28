# Sales: Parsing & Upload Implementation Plan (Plan 2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse the three Shopee exports (Global multi-sheet xlsx, Product detail xlsx, Ads csv) into structured rows and let a user upload them per brand with auto-detected period, a preview, and a save that replaces any prior data for the same brand+period.

**Architecture:** Pure parsing logic lives in `lib/parsers/` (no I/O, fully unit-tested with fixtures mirroring the real files). SheetJS reads workbooks into raw cell arrays which the parsers consume. A server action orchestrates parse → preview → save, deleting then re-inserting rows for the matched `report_periods` (dedupe). UI uses shadcn components.

**Tech Stack:** SheetJS (`xlsx`), Next.js server actions, Supabase, Vitest.

## Global Constraints

- Platform scope: **Shopee only**; write `platform = 'shopee'` on `report_periods`.
- Every upload is scoped to a **brand** chosen from the managed dropdown (Plan 1 `brands`), never free-typed.
- Period is **auto-detected** from file content; manual correction only as fallback.
- Re-upload of the same (brand, platform, period) **replaces** existing rows, never duplicates.
- Number formats differ by source: **XLSX = Indonesian** (`163.133.332` → 163133332; `16,06%` → 0.1606; `80.315,80` → 80315.80). **Ads CSV = raw** (`134079`; `4.33%` → 0.0433; `2373.96`). Empty/`-` → `null`.
- Money stored as integer rupiah; rates stored as numeric fractions (e.g. `0.0274`).
- Headers are matched by **name**, not column position.
- Pure logic in `lib/parsers/`; UI does no parsing.

---

## File Structure

```
lib/parsers/
├── numbers.ts          # parseIDNumber, parseRawNumber, parseIDPercent, parseRawPercent, blankToNull
├── period.ts           # parsePeriodString -> {start,end}
├── detect.ts           # detectFileKind(headerCells) -> 'global'|'product'|'ads'|null
├── global.ts           # parseGlobalWorkbook(sheets) -> ParsedGlobal
├── product.ts          # parseProductRows(rows) -> { summary, detail }
├── ads.ts              # parseAdsCsv(text) -> ParsedAds[]
├── types.ts            # shared parser row types
└── __tests__/*.test.ts
lib/sales/
├── upload.ts           # readFile -> kind+parsed (uses SheetJS); saveUpload(...) server-side
app/(app)/sales/upload/
├── page.tsx            # brand dropdown + dropzone + preview + save
├── actions.ts          # parseFiles / commitUpload server actions
└── upload-form.tsx     # client component
```

---

## Task 1: Number & percent parsing utilities — TDD

**Files:**
- Create: `lib/parsers/numbers.ts`
- Test: `lib/parsers/__tests__/numbers.test.ts`

**Interfaces:**
- Produces:
  - `blankToNull(raw: string): string | null` — `''`/`'-'`/whitespace → null.
  - `parseIDNumber(raw: string): number | null` — Indonesian format (`.`=thousands, `,`=decimal).
  - `parseRawNumber(raw: string): number | null` — raw format (`.`=decimal, no thousands).
  - `parseIDPercent(raw: string): number | null` — `'16,06%'` → `0.1606`.
  - `parseRawPercent(raw: string): number | null` — `'4.33%'` → `0.0433`.

- [ ] **Step 1: Write the failing test — `lib/parsers/__tests__/numbers.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  blankToNull,
  parseIDNumber,
  parseRawNumber,
  parseIDPercent,
  parseRawPercent,
} from "@/lib/parsers/numbers";

describe("blankToNull", () => {
  it("maps empty/dash/space to null", () => {
    expect(blankToNull("")).toBeNull();
    expect(blankToNull("-")).toBeNull();
    expect(blankToNull("  ")).toBeNull();
  });
  it("keeps real values", () => {
    expect(blankToNull("0")).toBe("0");
  });
});

describe("parseIDNumber", () => {
  it("parses thousands with dots", () => {
    expect(parseIDNumber("163.133.332")).toBe(163133332);
  });
  it("parses decimals with comma", () => {
    expect(parseIDNumber("80.315,80")).toBeCloseTo(80315.8, 2);
  });
  it("returns null for dash", () => {
    expect(parseIDNumber("-")).toBeNull();
  });
});

describe("parseRawNumber", () => {
  it("parses integers", () => {
    expect(parseRawNumber("134079")).toBe(134079);
  });
  it("parses dot decimals", () => {
    expect(parseRawNumber("2373.96")).toBeCloseTo(2373.96, 2);
  });
});

describe("percent", () => {
  it("parses ID percent to fraction", () => {
    expect(parseIDPercent("16,06%")).toBeCloseTo(0.1606, 4);
  });
  it("parses raw percent to fraction", () => {
    expect(parseRawPercent("4.33%")).toBeCloseTo(0.0433, 4);
  });
  it("dash -> null", () => {
    expect(parseIDPercent("-")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- numbers`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement — `lib/parsers/numbers.ts`**

```ts
export function blankToNull(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (t === "" || t === "-") return null;
  return t;
}

export function parseIDNumber(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  // remove thousands dots, convert decimal comma to dot
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseRawNumber(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseIDPercent(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  const n = parseIDNumber(t.replace("%", ""));
  return n === null ? null : n / 100;
}

export function parseRawPercent(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  const n = parseRawNumber(t.replace("%", ""));
  return n === null ? null : n / 100;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- numbers`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add number and percent parsing utilities with tests"
```

---

## Task 2: Period parsing — TDD

**Files:**
- Create: `lib/parsers/period.ts`
- Test: `lib/parsers/__tests__/period.test.ts`

**Interfaces:**
- Produces:
  - `parseDMY(s: string): string | null` — `'01-06-2026'` → ISO `'2026-06-01'`.
  - `parsePeriodString(s: string): { start: string; end: string } | null` — `'01-06-2026-27-06-2026'` → `{start:'2026-06-01', end:'2026-06-27'}`.

- [ ] **Step 1: Write the failing test — `lib/parsers/__tests__/period.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseDMY, parsePeriodString } from "@/lib/parsers/period";

describe("parseDMY", () => {
  it("converts dd-mm-yyyy to ISO", () => {
    expect(parseDMY("01-06-2026")).toBe("2026-06-01");
  });
  it("returns null for junk", () => {
    expect(parseDMY("not a date")).toBeNull();
  });
});

describe("parsePeriodString", () => {
  it("splits a combined period string", () => {
    expect(parsePeriodString("01-06-2026-27-06-2026")).toEqual({
      start: "2026-06-01",
      end: "2026-06-27",
    });
  });
  it("returns null when not a period", () => {
    expect(parsePeriodString("01-06-2026")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- period`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/parsers/period.ts`**

```ts
export function parseDMY(s: string): string | null {
  const m = (s ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export function parsePeriodString(
  s: string,
): { start: string; end: string } | null {
  const m = (s ?? "")
    .trim()
    .match(/^(\d{2}-\d{2}-\d{4})-(\d{2}-\d{2}-\d{4})$/);
  if (!m) return null;
  const start = parseDMY(m[1]);
  const end = parseDMY(m[2]);
  if (!start || !end) return null;
  return { start, end };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- period`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add period string parsing with tests"
```

---

## Task 3: Shared types + file-kind detection — TDD

**Files:**
- Create: `lib/parsers/types.ts`, `lib/parsers/detect.ts`
- Test: `lib/parsers/__tests__/detect.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  - `type FileKind = "global" | "product" | "ads"`
  - `interface GlobalDailyRow { date: string; status: "dibuat"|"siap_dikirim"|"dibayar"; total_penjualan: number; total_pesanan: number; penjualan_per_pesanan: number; produk_diklik: number|null; total_pengunjung: number|null; konversi: number|null; pesanan_dibatalkan: number|null; }`
  - `interface SourceRow { source: string; penjualan: number; }`
  - `interface ProductSummaryRow { kode_produk: string; product_name: string; penjualan: number; dilihat: number|null; diklik: number|null; total_pesanan: number|null; persentase_klik: number|null; konversi: number|null; total_pembeli: number|null; extra: Record<string, string>; }`
  - `interface ProductDetailRow { kode_produk: string; kode_variasi: string; nama_variasi: string; sku_induk: string|null; penjualan: number; dilihat: number|null; diklik: number|null; konversi: number|null; extra: Record<string, string>; }`
  - `interface AdsRow { nama_iklan: string; status: string|null; jenis_iklan: string|null; dilihat: number|null; klik: number|null; ctr: number|null; add_to_cart: number|null; konversi: number|null; cvr: number|null; biaya_per_konversi: number|null; produk_terjual: number|null; omzet: number|null; biaya: number|null; roas: number|null; acos: number|null; voucher: number|null; extra: Record<string, string>; }`
  - `interface ParsedGlobal { period: { start: string; end: string } | null; daily: GlobalDailyRow[]; sources: SourceRow[]; }`
- Produces (`detect.ts`):
  - `detectFileKind(allHeaderText: string): FileKind | null` — classifies by signature header tokens found anywhere in the file's text.

- [ ] **Step 1: Create `lib/parsers/types.ts`**

Write exactly the interfaces listed under Interfaces above (one `export` each).

- [ ] **Step 2: Write the failing test — `lib/parsers/__tests__/detect.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { detectFileKind } from "@/lib/parsers/detect";

describe("detectFileKind", () => {
  it("detects ads csv", () => {
    expect(
      detectFileKind("Semua Laporan Iklan CPC Urutan Nama Iklan Mode Bidding"),
    ).toBe("ads");
  });
  it("detects product detail", () => {
    expect(detectFileKind("Kode Produk Kode Variasi SKU Induk Nama Variasi")).toBe(
      "product",
    );
  });
  it("detects global", () => {
    expect(
      detectFileKind("Tanggal Total Penjualan (IDR) Total Pesanan Total Pengunjung"),
    ).toBe("global");
  });
  it("returns null for unknown", () => {
    expect(detectFileKind("hello world")).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- detect`
Expected: FAIL.

- [ ] **Step 4: Implement — `lib/parsers/detect.ts`**

```ts
import type { FileKind } from "@/lib/parsers/types";

export function detectFileKind(allHeaderText: string): FileKind | null {
  const t = (allHeaderText ?? "").toLowerCase();
  if (t.includes("laporan iklan") || (t.includes("nama iklan") && t.includes("mode bidding")))
    return "ads";
  if (t.includes("kode variasi") && t.includes("sku induk")) return "product";
  if (t.includes("total penjualan") && t.includes("total pengunjung")) return "global";
  return null;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- detect`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add parser shared types and file-kind detection with tests"
```

---

## Task 4: Global workbook parser — TDD

**Files:**
- Create: `lib/parsers/global.ts`
- Test: `lib/parsers/__tests__/global.test.ts`

**Interfaces:**
- Consumes: `numbers.ts`, `period.ts`, types from `types.ts`.
- Produces: `parseGlobalWorkbook(sheets: { name: string; rows: string[][] }[]): ParsedGlobal`
  - Reads the three status sheets (`Pesanan Dibuat`/`Pesanan Siap Dikirim`/`Pesanan Dibayar`) for daily rows.
  - Reads the source-breakdown row (header contains "Penjualan dari halaman produk") for `sources`.
  - Derives `period` from the combined-period cell (e.g. `01-06-2026-27-06-2026`).

- [ ] **Step 1: Write the failing test — `lib/parsers/__tests__/global.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseGlobalWorkbook } from "@/lib/parsers/global";

const dailyHeader = [
  "Tanggal", "Total Penjualan (IDR)", "Total Pesanan", "Penjualan per Pesanan",
  "Produk Diklik", "Total Pengunjung", "Tingkat Konversi Pesanan", "Pesanan Dibatalkan",
];

const sheets = [
  {
    name: "Pesanan Dibuat",
    rows: [
      dailyHeader,
      ["01-06-2026-27-06-2026", "163.133.332", "2890", "56.447,52", "105455", "143765", "2,74%", "335"],
      dailyHeader,
      ["01-06-2026", "3.649.829", "66", "55.300,44", "3039", "7550", "2,17%", "13"],
      ["02-06-2026", "4.280.620", "81", "52.847,16", "3632", "7069", "2,23%", "5"],
    ],
  },
  {
    name: "Ringkasan",
    rows: [
      ["Tanggal", "Status Pesanan", "Penjualan (IDR)", "Penjualan dari halaman produk",
       "Penjualan dari Live Penjual", "Penjualan dari Video Penjual",
       "Penjualan dari Affiliate", "Penjualan dari Iklan Shopee"],
      ["01-06-2026-27-06-2026", "Pesanan Dibuat", "163.133.332", "102.546.770",
       "43.804.349", "3.602.857", "13.179.356", "141.056.789"],
    ],
  },
];

describe("parseGlobalWorkbook", () => {
  const result = parseGlobalWorkbook(sheets);

  it("reads the period from the combined cell", () => {
    expect(result.period).toEqual({ start: "2026-06-01", end: "2026-06-27" });
  });

  it("extracts daily rows (skipping the period-total row)", () => {
    const dibuat = result.daily.filter((d) => d.status === "dibuat");
    expect(dibuat).toHaveLength(2);
    expect(dibuat[0]).toMatchObject({
      date: "2026-06-01",
      total_penjualan: 3649829,
      total_pesanan: 66,
      total_pengunjung: 7550,
    });
    expect(dibuat[0].konversi).toBeCloseTo(0.0217, 4);
  });

  it("extracts sources", () => {
    const map = Object.fromEntries(result.sources.map((s) => [s.source, s.penjualan]));
    expect(map["halaman_produk"]).toBe(102546770);
    expect(map["iklan_shopee"]).toBe(141056789);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- global`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/parsers/global.ts`**

```ts
import { parseIDNumber, parseIDPercent } from "@/lib/parsers/numbers";
import { parsePeriodString, parseDMY } from "@/lib/parsers/period";
import type { ParsedGlobal, GlobalDailyRow, SourceRow } from "@/lib/parsers/types";

const STATUS_BY_SHEET: Record<string, GlobalDailyRow["status"]> = {
  "pesanan dibuat": "dibuat",
  "pesanan siap dikirim": "siap_dikirim",
  "pesanan dibayar": "dibayar",
};

const SOURCE_COLUMNS: { header: string; key: string }[] = [
  { header: "penjualan dari halaman produk", key: "halaman_produk" },
  { header: "penjualan dari live penjual", key: "live" },
  { header: "penjualan dari video penjual", key: "video" },
  { header: "penjualan dari affiliate", key: "affiliate" },
  { header: "penjualan dari iklan shopee", key: "iklan_shopee" },
];

function isDailyHeader(row: string[]): boolean {
  const t = row.map((c) => (c ?? "").toLowerCase());
  return t[0] === "tanggal" && t.some((c) => c.includes("total penjualan"));
}

export function parseGlobalWorkbook(
  sheets: { name: string; rows: string[][] }[],
): ParsedGlobal {
  const daily: GlobalDailyRow[] = [];
  let period: ParsedGlobal["period"] = null;
  let sources: SourceRow[] = [];

  for (const sheet of sheets) {
    const status = STATUS_BY_SHEET[sheet.name.trim().toLowerCase()];
    if (status) {
      for (const row of sheet.rows) {
        const first = (row[0] ?? "").trim();
        if (isDailyHeader(row)) continue;
        const periodHit = parsePeriodString(first);
        if (periodHit) {
          period ??= periodHit;
          continue; // period-total row, not a day
        }
        const iso = parseDMY(first);
        if (!iso) continue;
        daily.push({
          date: iso,
          status,
          total_penjualan: parseIDNumber(row[1]) ?? 0,
          total_pesanan: parseIDNumber(row[2]) ?? 0,
          penjualan_per_pesanan: parseIDNumber(row[3]) ?? 0,
          produk_diklik: parseIDNumber(row[4]),
          total_pengunjung: parseIDNumber(row[5]),
          konversi: parseIDPercent(row[6]),
          pesanan_dibatalkan: parseIDNumber(row[7]),
        });
      }
    }

    if (sources.length === 0) {
      const headerIdx = sheet.rows.findIndex((r) =>
        r.some((c) => (c ?? "").toLowerCase().includes("penjualan dari halaman produk")),
      );
      if (headerIdx >= 0) {
        const header = sheet.rows[headerIdx].map((c) => (c ?? "").toLowerCase().trim());
        const dataRow = sheet.rows[headerIdx + 1];
        if (dataRow) {
          if (!period) {
            const hit = parsePeriodString((dataRow[0] ?? "").trim());
            if (hit) period = hit;
          }
          sources = SOURCE_COLUMNS.flatMap(({ header: h, key }) => {
            const col = header.findIndex((c) => c === h);
            if (col < 0) return [];
            return [{ source: key, penjualan: parseIDNumber(dataRow[col]) ?? 0 }];
          });
        }
      }
    }
  }

  return { period, daily, sources };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- global`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add global workbook parser with tests"
```

---

## Task 5: Product parser — TDD

**Files:**
- Create: `lib/parsers/product.ts`
- Test: `lib/parsers/__tests__/product.test.ts`

**Interfaces:**
- Consumes: `numbers.ts`, types.
- Produces: `parseProductRows(rows: string[][]): { summary: ProductSummaryRow[]; detail: ProductDetailRow[] }`
  - First row is the header (matched by name). Parent rows (`Kode Variasi` blank/`-`) → `summary`; variation rows → `detail`.

- [ ] **Step 1: Write the failing test — `lib/parsers/__tests__/product.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseProductRows } from "@/lib/parsers/product";

const header = [
  "Kode Produk", "Produk", "Status Produk Saat Ini", "Kode Variasi", "Nama Variasi",
  "Status Variasi Saat Ini", "Kode Variasi", "SKU Induk",
  "Total Penjualan (Pesanan Dibuat) (IDR)", "Penjualan (Pesanan Siap Dikirim) (IDR)",
  "Jumlah Produk Dilihat", "Produk Diklik", "Persentase Klik",
  "Tingkat Konversi Pesanan (Pesanan Dibuat)",
];

const rows = [
  header,
  ["44418220234", "Jilbab Anak", "Normal", "-", "-", "-", "-", "KALUNA ZEEVA RAYON",
   "28.489.657", "27.601.677", "363940", "13046", "3,58%", "3,30%"],
  ["44418220234", "Jilbab Anak", "Normal", "286497756019", "Black", "Normal",
   "kalunablack", "KALUNA ZEEVA RAYON", "7.358.614", "7.185.024", "-", "-", "-", "-"],
];

describe("parseProductRows", () => {
  const { summary, detail } = parseProductRows(rows);

  it("puts parent rows in summary", () => {
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      kode_produk: "44418220234",
      product_name: "Jilbab Anak",
      penjualan: 28489657,
      dilihat: 363940,
    });
    expect(summary[0].persentase_klik).toBeCloseTo(0.0358, 4);
  });

  it("puts variation rows in detail", () => {
    expect(detail).toHaveLength(1);
    expect(detail[0]).toMatchObject({
      kode_produk: "44418220234",
      kode_variasi: "286497756019",
      nama_variasi: "Black",
      sku_induk: "KALUNA ZEEVA RAYON",
      penjualan: 7358614,
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- product`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/parsers/product.ts`**

```ts
import { parseIDNumber, parseIDPercent, blankToNull } from "@/lib/parsers/numbers";
import type { ProductSummaryRow, ProductDetailRow } from "@/lib/parsers/types";

function indexOfHeader(header: string[], needle: string): number {
  return header.findIndex((h) => (h ?? "").toLowerCase().includes(needle));
}

export function parseProductRows(rows: string[][]): {
  summary: ProductSummaryRow[];
  detail: ProductDetailRow[];
} {
  if (rows.length === 0) return { summary: [], detail: [] };
  const header = rows[0].map((h) => (h ?? "").toLowerCase());

  const col = {
    kode: indexOfHeader(header, "kode produk"),
    produk: indexOfHeader(header, "produk"),
    variasiKode: header.findIndex((h) => h.includes("kode variasi")),
    variasiNama: indexOfHeader(header, "nama variasi"),
    sku: indexOfHeader(header, "sku induk"),
    penjualan: indexOfHeader(header, "total penjualan"),
    dilihat: indexOfHeader(header, "jumlah produk dilihat"),
    diklik: indexOfHeader(header, "produk diklik"),
    persenKlik: indexOfHeader(header, "persentase klik"),
    konversi: indexOfHeader(header, "tingkat konversi pesanan"),
  };

  const summary: ProductSummaryRow[] = [];
  const detail: ProductDetailRow[] = [];

  for (const row of rows.slice(1)) {
    const kode = (row[col.kode] ?? "").trim();
    if (!kode) continue;
    const variasi = blankToNull(row[col.variasiKode] ?? "");
    if (variasi === null) {
      summary.push({
        kode_produk: kode,
        product_name: (row[col.produk] ?? "").trim(),
        penjualan: parseIDNumber(row[col.penjualan]) ?? 0,
        dilihat: parseIDNumber(row[col.dilihat]),
        diklik: parseIDNumber(row[col.diklik]),
        total_pesanan: null,
        persentase_klik: parseIDPercent(row[col.persenKlik]),
        konversi: parseIDPercent(row[col.konversi]),
        total_pembeli: null,
        extra: {},
      });
    } else {
      detail.push({
        kode_produk: kode,
        kode_variasi: variasi,
        nama_variasi: (row[col.variasiNama] ?? "-").trim() || "-",
        sku_induk: blankToNull(row[col.sku] ?? ""),
        penjualan: parseIDNumber(row[col.penjualan]) ?? 0,
        dilihat: parseIDNumber(row[col.dilihat]),
        diklik: parseIDNumber(row[col.diklik]),
        konversi: parseIDPercent(row[col.konversi]),
        extra: {},
      });
    }
  }

  return { summary, detail };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- product`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add product detail/summary parser with tests"
```

---

## Task 6: Ads CSV parser — TDD

**Files:**
- Create: `lib/parsers/ads.ts`
- Test: `lib/parsers/__tests__/ads.test.ts`

**Interfaces:**
- Consumes: `numbers.ts` (raw format), types.
- Produces: `parseAdsCsv(text: string): AdsRow[]` — skips metadata lines, finds the header line starting with `Urutan,Nama Iklan`, parses the rest.

- [ ] **Step 1: Write the failing test — `lib/parsers/__tests__/ads.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseAdsCsv } from "@/lib/parsers/ads";

const csv = [
  "Semua Laporan Iklan CPC - Shopee Indonesia",
  "Username,kalovaofficial",
  "Periode,01/06/2026 - 27/06/2026",
  "",
  "Urutan,Nama Iklan,Status,Jenis Iklan,Kode Produk,Tampilan Iklan,Mode Bidding,Penempatan Iklan,Tanggal Mulai,Tanggal Selesai,Dilihat,Jumlah Klik,Persentase Klik,Add to Cart,Add to Cart Rate,Konversi,Konversi Langsung,Tingkat konversi,Tingkat Konversi Langsung,Biaya per Konversi,Biaya per Konversi Langsung,Produk Terjual,Terjual Langsung,Omzet Penjualan,Penjualan Langsung (GMV Langsung),Biaya,Efektifitas Iklan,Efektivitas Langsung,ACOS,ACOS Langsung,Jumlah Produk Dilihat,Jumlah Klik Produk,Persentase Klik Produk,Voucher Amount,Vouchered Sales",
  "1,Grup Iklan A,Berjalan,Iklan Produk,-,-,GMV Max ROAS,-,29/04/2026 00:00:00,Tidak Terbatas,134079,5799,4.33%,-,-,313,183,5.40%,3.16%,2373.96,4060.39,422,246,12312632,7267461,743051,16.57,9.78,6.03%,10.22%,-,-,-,114534,747340",
].join("\n");

describe("parseAdsCsv", () => {
  const rows = parseAdsCsv(csv);
  it("parses one ad row, skipping metadata", () => {
    expect(rows).toHaveLength(1);
  });
  it("parses fields with raw number format", () => {
    expect(rows[0]).toMatchObject({
      nama_iklan: "Grup Iklan A",
      status: "Berjalan",
      dilihat: 134079,
      klik: 5799,
      omzet: 12312632,
      biaya: 743051,
      roas: 16.57,
    });
    expect(rows[0].ctr).toBeCloseTo(0.0433, 4);
    expect(rows[0].acos).toBeCloseTo(0.0603, 4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- ads`
Expected: FAIL.

- [ ] **Step 3: Implement — `lib/parsers/ads.ts`**

```ts
import { parseRawNumber, parseRawPercent, blankToNull } from "@/lib/parsers/numbers";
import type { AdsRow } from "@/lib/parsers/types";

// Minimal CSV splitter (Shopee ads export uses simple comma rows, no quoted commas).
function splitCsvLine(line: string): string[] {
  return line.split(",");
}

export function parseAdsCsv(text: string): AdsRow[] {
  const lines = (text ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.toLowerCase().startsWith("urutan,nama iklan"));
  if (headerIdx < 0) return [];
  const header = splitCsvLine(lines[headerIdx]).map((h) => h.toLowerCase().trim());
  const idx = (needle: string) => header.findIndex((h) => h.includes(needle));

  const c = {
    nama: idx("nama iklan"),
    status: idx("status"),
    jenis: idx("jenis iklan"),
    dilihat: idx("dilihat"),
    klik: header.findIndex((h) => h === "jumlah klik"),
    ctr: header.findIndex((h) => h === "persentase klik"),
    atc: idx("add to cart"),
    konversi: header.findIndex((h) => h === "konversi"),
    cvr: header.findIndex((h) => h === "tingkat konversi"),
    biayaPerKonversi: header.findIndex((h) => h === "biaya per konversi"),
    produkTerjual: idx("produk terjual"),
    omzet: idx("omzet penjualan"),
    biaya: header.findIndex((h) => h === "biaya"),
    roas: idx("efektifitas iklan"),
    acos: header.findIndex((h) => h === "acos"),
    voucher: idx("voucher amount"),
  };

  const out: AdsRow[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (line.trim() === "") continue;
    const f = splitCsvLine(line);
    const nama = (f[c.nama] ?? "").trim();
    if (!nama) continue;
    out.push({
      nama_iklan: nama,
      status: blankToNull(f[c.status] ?? ""),
      jenis_iklan: blankToNull(f[c.jenis] ?? ""),
      dilihat: parseRawNumber(f[c.dilihat] ?? ""),
      klik: parseRawNumber(f[c.klik] ?? ""),
      ctr: parseRawPercent(f[c.ctr] ?? ""),
      add_to_cart: parseRawNumber(f[c.atc] ?? ""),
      konversi: parseRawNumber(f[c.konversi] ?? ""),
      cvr: parseRawPercent(f[c.cvr] ?? ""),
      biaya_per_konversi: parseRawNumber(f[c.biayaPerKonversi] ?? ""),
      produk_terjual: parseRawNumber(f[c.produkTerjual] ?? ""),
      omzet: parseRawNumber(f[c.omzet] ?? ""),
      biaya: parseRawNumber(f[c.biaya] ?? ""),
      roas: parseRawNumber(f[c.roas] ?? ""),
      acos: parseRawPercent(f[c.acos] ?? ""),
      voucher: parseRawNumber(f[c.voucher] ?? ""),
      extra: {},
    });
  }
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- ads`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ads csv parser with tests"
```

---

## Task 7: File reading (SheetJS) + upload orchestration

**Files:**
- Create: `lib/sales/upload.ts`
- Test: `lib/parsers/__tests__/` (already cover pure logic; this task wires I/O — verified via the upload UI in Task 8)

**Interfaces:**
- Consumes: all parsers; `detectFileKind`; SheetJS.
- Produces:
  - `readWorkbookSheets(buf: ArrayBuffer): { name: string; rows: string[][] }[]`
  - `classifyAndParse(file: { name: string; buffer: ArrayBuffer; text?: string }): { kind: FileKind; parsed: unknown }` — returns parsed payload per kind.
  - `type UploadPreview = { brandId: string; period: {start:string;end:string}|null; global?: ParsedGlobal; product?: {summary; detail}; ads?: AdsRow[]; }`
  - `saveUpload(supabase, preview): Promise<{ periodId: string }>` — upsert `report_periods` (delete existing rows for brand+platform+period, then insert).

- [ ] **Step 1: Install SheetJS**

```bash
npm install xlsx
```

- [ ] **Step 2: Implement — `lib/sales/upload.ts`**

```ts
import * as XLSX from "xlsx";
import { detectFileKind } from "@/lib/parsers/detect";
import { parseGlobalWorkbook } from "@/lib/parsers/global";
import { parseProductRows } from "@/lib/parsers/product";
import { parseAdsCsv } from "@/lib/parsers/ads";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileKind, ParsedGlobal, AdsRow, ProductSummaryRow, ProductDetailRow } from "@/lib/parsers/types";

export function readWorkbookSheets(buf: ArrayBuffer): { name: string; rows: string[][] }[] {
  const wb = XLSX.read(buf, { type: "array" });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
    }),
  }));
}

export interface UploadPreview {
  brandId: string;
  period: { start: string; end: string } | null;
  global?: ParsedGlobal;
  product?: { summary: ProductSummaryRow[]; detail: ProductDetailRow[] };
  ads?: AdsRow[];
}

export function classifyAndParse(file: {
  name: string;
  buffer?: ArrayBuffer;
  text?: string;
}): { kind: FileKind | null; payload: unknown } {
  if (file.text !== undefined) {
    const kind = detectFileKind(file.text.slice(0, 2000));
    if (kind === "ads") return { kind, payload: parseAdsCsv(file.text) };
    return { kind, payload: null };
  }
  const sheets = readWorkbookSheets(file.buffer!);
  const headerText = sheets
    .flatMap((s) => s.rows.slice(0, 4).flat())
    .join(" ");
  const kind = detectFileKind(headerText);
  if (kind === "global") return { kind, payload: parseGlobalWorkbook(sheets) };
  if (kind === "product") return { kind, payload: parseProductRows(sheets[0]?.rows ?? []) };
  return { kind, payload: null };
}

export async function saveUpload(
  supabase: SupabaseClient,
  preview: UploadPreview,
  uploadedBy: string,
): Promise<{ periodId: string }> {
  if (!preview.period) throw new Error("Periode tidak terbaca dari file.");
  const { brandId, period } = preview;

  // Replace: delete existing period (cascade removes child rows), then re-create.
  await supabase
    .from("report_periods")
    .delete()
    .match({ brand_id: brandId, platform: "shopee", period_start: period.start, period_end: period.end });

  const { data: rp, error: rpErr } = await supabase
    .from("report_periods")
    .insert({
      brand_id: brandId,
      platform: "shopee",
      period_start: period.start,
      period_end: period.end,
      uploaded_by: uploadedBy,
    })
    .select("id")
    .single();
  if (rpErr) throw rpErr;
  const periodId = rp.id as string;

  if (preview.global) {
    if (preview.global.daily.length)
      await supabase.from("global_daily").insert(
        preview.global.daily.map((d) => ({ period_id: periodId, ...d })),
      );
    if (preview.global.sources.length)
      await supabase.from("global_source").insert(
        preview.global.sources.map((s) => ({ period_id: periodId, ...s })),
      );
  }
  if (preview.product) {
    if (preview.product.summary.length)
      await supabase.from("product_summary").insert(
        preview.product.summary.map((p) => ({ period_id: periodId, ...p })),
      );
    if (preview.product.detail.length)
      await supabase.from("product_detail").insert(
        preview.product.detail.map((p) => ({ period_id: periodId, ...p })),
      );
  }
  if (preview.ads?.length)
    await supabase.from("ads_summary").insert(
      preview.ads.map((a) => ({ period_id: periodId, ...a })),
    );

  return { periodId };
}
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add sheetjs reader and upload orchestration"
```

---

## Task 8: Upload UI (brand dropdown, dropzone, preview, save)

**Files:**
- Create: `app/(app)/sales/upload/page.tsx`, `app/(app)/sales/upload/actions.ts`, `app/(app)/sales/upload/upload-form.tsx`

**Interfaces:**
- Consumes: `listBrands` (Plan 1), `classifyAndParse`, `saveUpload`, `requireUser`.
- Produces: server actions `previewUpload(formData)` and `commitUpload(payload)`.

- [ ] **Step 1: Create actions — `app/(app)/sales/upload/actions.ts`**

```ts
"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { classifyAndParse, saveUpload, type UploadPreview } from "@/lib/sales/upload";
import type { ParsedGlobal, AdsRow } from "@/lib/parsers/types";

export async function previewUpload(formData: FormData): Promise<UploadPreview> {
  await requireUser();
  const brandId = String(formData.get("brandId") ?? "");
  if (!brandId) throw new Error("Pilih brand terlebih dahulu.");
  const files = formData.getAll("files") as File[];

  const preview: UploadPreview = { brandId, period: null };
  for (const file of files) {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const result = isCsv
      ? classifyAndParse({ name: file.name, text: await file.text() })
      : classifyAndParse({ name: file.name, buffer: await file.arrayBuffer() });

    if (result.kind === "global") {
      preview.global = result.payload as ParsedGlobal;
      preview.period ??= (result.payload as ParsedGlobal).period;
    } else if (result.kind === "product") {
      preview.product = result.payload as UploadPreview["product"];
    } else if (result.kind === "ads") {
      preview.ads = result.payload as AdsRow[];
    } else {
      throw new Error(`File "${file.name}" tidak dikenali sebagai export Shopee.`);
    }
  }
  return preview;
}

export async function commitUpload(preview: UploadPreview): Promise<{ periodId: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  return saveUpload(supabase, preview, user.id);
}
```

- [ ] **Step 2: Create the client form — `app/(app)/sales/upload/upload-form.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { previewUpload, commitUpload } from "./actions";
import type { UploadPreview } from "@/lib/sales/upload";
import type { Brand } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UploadForm({ brands }: { brands: Brand[] }) {
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  async function onPreview(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      setPreview(await previewUpload(formData));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses file");
    }
  }

  function onSave() {
    if (!preview) return;
    start(async () => {
      try {
        await commitUpload(preview);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form action={onPreview} className="space-y-3">
        <select name="brandId" required className="w-full rounded border p-2">
          <option value="">Pilih brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input type="file" name="files" multiple accept=".xlsx,.csv" required
               className="block w-full text-sm" />
        <Button type="submit">Proses & Pratinjau</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <Card className="space-y-2 p-4 text-sm">
          <p>Periode: <b>{preview.period ? `${preview.period.start} → ${preview.period.end}` : "tidak terbaca"}</b></p>
          <p>Data global harian: <b>{preview.global?.daily.length ?? 0}</b> baris</p>
          <p>Produk: <b>{preview.product?.summary.length ?? 0}</b> (variasi {preview.product?.detail.length ?? 0})</p>
          <p>Iklan: <b>{preview.ads?.length ?? 0}</b></p>
          <Button onClick={onSave} disabled={pending || !preview.period}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
          {saved && <p className="text-sm text-green-600">Tersimpan. Data periode ini telah diperbarui.</p>}
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the page — `app/(app)/sales/upload/page.tsx`**

```tsx
import { listBrands } from "@/lib/brands";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Upload Data Shopee</h1>
      <p className="text-sm text-muted-foreground">
        Pilih brand, lalu tarik file Global, Produk, dan Ads. Periode terbaca otomatis.
      </p>
      <UploadForm brands={brands} />
    </div>
  );
}
```

- [ ] **Step 4: Manual verification with real files**

Run `npm run dev`, sign in, go to `/sales/upload`. Select a brand, upload the three real files
(`kalovaofficial.shopee-shop-stats...xlsx`, `parentskudetail...xlsx`, `Data+...Iklan...csv`).
Expected: preview shows period `2026-06-01 → 2026-06-27`, ~24+ daily rows, product + variation counts, ad count. Click Simpan → success. Verify rows in Supabase tables. Re-upload the same files → counts stay the same (replace, not duplicate).

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all parser tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add sales upload page with preview and save"
```

---

## Self-Review

**Spec coverage (Plan 2 portion):**
- Parse Global (daily + sources + period), Product (summary+detail), Ads → Tasks 4,5,6. ✓
- Two number formats + `-`/blank → null → Task 1; used throughout. ✓
- Period auto-detect → Task 2 + global parser; manual fallback surfaced (save disabled when period null) → Task 8. ✓
- File-kind detection by content → Task 3, used in Task 7. ✓
- Header-by-name matching → Tasks 4,5,6. ✓
- Brand dropdown (managed list, not free-typed) → Task 8. ✓
- Replace-on-re-upload dedupe → Task 7 `saveUpload`. ✓
- Preview before save → Task 8. ✓
- Unrecognized file error → Task 8 `previewUpload` throw. ✓

**Placeholder scan:** No TBD/TODO; every step has concrete code/commands. ✓

**Type consistency:** `ParsedGlobal`, `AdsRow`, `ProductSummaryRow`, `ProductDetailRow`, `FileKind` defined in `types.ts` (Task 3) and consumed unchanged in Tasks 4–8. `UploadPreview` defined in Task 7, consumed in Task 8. `Brand` from Plan 1 Task 5. ✓

> **Note on CSV parsing:** Task 6 uses a simple comma splitter because the Shopee ads export has no quoted commas. If a future export quotes fields, swap `splitCsvLine` for a real CSV parser (e.g. `papaparse`) — isolated to one function.
