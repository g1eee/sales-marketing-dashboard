# Data Integrasi (Chunk 2) Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the Shopee upload page into "Data Integrasi": keep the upload flow, add an **upload history** (metadata-only) per brand+period with View + Delete, and capture uploaded file names.

**Architecture:** History reads the existing `report_periods` table (already one row per upload). Add a `source_files text[]` column so each upload records its file names. A pure transform merges periods + uploader profiles into display rows. UI: a server-rendered table (ui/table, ui/empty, ui/badge) with a client delete button (ui/alert-dialog → server action).

**Tech Stack:** Next 16 App Router, Supabase, base-ui kit components, vitest.

## Global Constraints
- **Decisions (from brainstorm):** Shopee only (TikTok deferred to a later sub-chunk). **Metadata-only** — no raw file storage. History actions: **View** (→ dashboard) + **Delete**; re-import = re-upload (existing replace semantics). v1 has **no brand filter** (list sorted newest-first; add filter when it grows). `// ponytail:` mark that.
- Next 16 differs from training — match in-repo patterns (server actions in `actions.ts`, `createClient` from `@/lib/supabase/server`, `requireUser` from `@/lib/auth`).
- Prefer reui/shadcn kit components (CLAUDE.md): `ui/table`, `ui/alert-dialog`, `ui/badge`, `ui/empty`.
- Don't move the `/sales/upload` route (nav "Data Integrasi" already points there).

## File Structure
- **Create** `supabase/migrations/0004_report_period_source_files.sql` — add `source_files`.
- **Modify** `lib/sales/upload.ts` — `UploadPreview.sourceFiles`; write it in `saveUpload`.
- **Modify** `app/(app)/sales/upload/actions.ts` — set `sourceFiles` in `previewUpload`; add `deleteUpload` action.
- **Create** `lib/sales/history.ts` — `getUploadHistory()` + pure `toHistoryRows()`.
- **Create test** `lib/sales/__tests__/history.test.ts` — `toHistoryRows`.
- **Create** `app/(app)/sales/upload/upload-history.tsx` — server table.
- **Create** `app/(app)/sales/upload/delete-upload-button.tsx` — client alert-dialog + action.
- **Modify** `app/(app)/sales/upload/page.tsx` — title "Data Integrasi", render form + history.

---

### Task 1: Schema + capture file names

**Files:** Create `supabase/migrations/0004_report_period_source_files.sql`; Modify `lib/sales/upload.ts`, `app/(app)/sales/upload/actions.ts`.

- [ ] **Step 1: Migration** — `supabase/migrations/0004_report_period_source_files.sql`:
```sql
-- Record which file(s) produced each upload (history metadata).
alter table report_periods
  add column source_files text[] not null default '{}';
```
Apply it to the dev DB (Supabase). Run: `npx supabase db push` (or the project's migration command — confirm in README).

- [ ] **Step 2:** In `lib/sales/upload.ts`, add to `UploadPreview`:
```ts
  sourceFiles: string[];
```
and in `saveUpload`, include it on the `report_periods` insert:
```ts
      source_files: preview.sourceFiles ?? [],
```
(add alongside `uploaded_by`).

- [ ] **Step 3:** In `previewUpload` (`actions.ts`), collect names. Change the preview init and return:
```ts
  const files = formData.getAll("files") as File[];
  const preview: UploadPreview = {
    brandId,
    period: null,
    sourceFiles: files.map((f) => f.name),
  };
```

- [ ] **Step 4:** Typecheck. Run `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 5:** Commit: `feat(data-integrasi): capture uploaded file names on report_periods`.

---

### Task 2: History data layer (TDD)

**Files:** Create `lib/sales/history.ts`, `lib/sales/__tests__/history.test.ts`.

**Produces:**
- `interface UploadHistoryRow { id, brandName, platform, periodStart, periodEnd, sourceFiles, uploaderName, createdAt, brandId }`
- `toHistoryRows(periods, brandNameById, uploaderNameById): UploadHistoryRow[]` (pure)
- `getUploadHistory(): Promise<UploadHistoryRow[]>`

- [ ] **Step 1: Failing test** `lib/sales/__tests__/history.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toHistoryRows, type RawPeriod } from "@/lib/sales/history";

const periods: RawPeriod[] = [
  { id: "p1", brand_id: "b1", platform: "shopee", period_start: "2026-06-01", period_end: "2026-06-30", source_files: ["g.xlsx"], uploaded_by: "u1", created_at: "2026-06-30T10:00:00Z" },
  { id: "p2", brand_id: "b2", platform: "shopee", period_start: "2026-05-01", period_end: "2026-05-31", source_files: [], uploaded_by: null, created_at: "2026-05-31T10:00:00Z" },
];

describe("toHistoryRows", () => {
  it("maps brand and uploader names", () => {
    const rows = toHistoryRows(periods, { b1: "AMK", b2: "Brandz" }, { u1: "Gie" });
    expect(rows[0]).toMatchObject({ brandName: "AMK", uploaderName: "Gie", sourceFiles: ["g.xlsx"] });
  });
  it("falls back to em dash for unknown brand/uploader", () => {
    const rows = toHistoryRows(periods, {}, {});
    expect(rows[1].brandName).toBe("—");
    expect(rows[1].uploaderName).toBe("—");
  });
});
```

- [ ] **Step 2:** Run `npm run test -- history`. Expected: FAIL (module missing).

- [ ] **Step 3:** Implement `lib/sales/history.ts`:
```ts
import { createClient } from "@/lib/supabase/server";

export interface RawPeriod {
  id: string;
  brand_id: string;
  platform: string;
  period_start: string;
  period_end: string;
  source_files: string[];
  uploaded_by: string | null;
  created_at: string;
}

export interface UploadHistoryRow {
  id: string;
  brandId: string;
  brandName: string;
  platform: string;
  periodStart: string;
  periodEnd: string;
  sourceFiles: string[];
  uploaderName: string;
  createdAt: string;
}

export function toHistoryRows(
  periods: RawPeriod[],
  brandNameById: Record<string, string>,
  uploaderNameById: Record<string, string>,
): UploadHistoryRow[] {
  return periods.map((p) => ({
    id: p.id,
    brandId: p.brand_id,
    brandName: brandNameById[p.brand_id] ?? "—",
    platform: p.platform,
    periodStart: p.period_start,
    periodEnd: p.period_end,
    sourceFiles: p.source_files ?? [],
    uploaderName: (p.uploaded_by && uploaderNameById[p.uploaded_by]) || "—",
    createdAt: p.created_at,
  }));
}

// report_periods.uploaded_by → auth.users, and profiles.id → auth.users, so there
// is no direct FK to join on; fetch profiles separately and map by id.
export async function getUploadHistory(): Promise<UploadHistoryRow[]> {
  const supabase = await createClient();
  const { data: periods, error } = await supabase
    .from("report_periods")
    .select("id, brand_id, platform, period_start, period_end, source_files, uploaded_by, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (periods ?? []) as RawPeriod[];

  const [{ data: brands }, { data: profiles }] = await Promise.all([
    supabase.from("brands").select("id, name"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const brandNameById = Object.fromEntries((brands ?? []).map((b) => [b.id, b.name]));
  const uploaderNameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name]),
  );
  return toHistoryRows(rows, brandNameById, uploaderNameById);
}
```

- [ ] **Step 4:** Run `npm run test -- history`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(data-integrasi): upload history data layer`.

---

### Task 3: History UI + delete

**Files:** Modify `app/(app)/sales/upload/actions.ts`; Create `upload-history.tsx`, `delete-upload-button.tsx`; Modify `page.tsx`.

- [ ] **Step 1:** Add delete action to `actions.ts`:
```ts
import { revalidatePath } from "next/cache";
// ...
export async function deleteUpload(periodId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("report_periods").delete().eq("id", periodId);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
  revalidatePath("/sales/upload");
}
```
(Verify `revalidatePath` import path against `node_modules/next/dist/docs` before relying on it.)

- [ ] **Step 2:** `delete-upload-button.tsx` (client) — use `ui/alert-dialog` for confirm. **Read `components/ui/alert-dialog.tsx` first** for its exact base-ui API, then wire a destructive confirm that calls `deleteUpload(id)` inside `useTransition`.

- [ ] **Step 3:** `upload-history.tsx` (server) — `getUploadHistory()`, render `ui/table` with columns: Brand, Platform (`ui/badge`), Periode (`formatPeriodRange`), File (`source_files` joined), Diupload oleh, Tanggal, Aksi (View link → `/sales/dashboard?brand={brandId}&period={id}` + `<DeleteUploadButton id={id} />`). When empty, render `ui/empty` ("Belum ada upload"). `// ponytail: no brand filter v1`.

- [ ] **Step 4:** `page.tsx` — title `"Data Integrasi"`, description about upload + history; widen container (drop `max-w-xl`); render `<UploadForm />` then `<UploadHistory />`.

- [ ] **Step 5:** Typecheck + dev smoke (`/sales/upload`: upload still works, history lists, delete confirms + removes, View opens dashboard). Commit: `feat(data-integrasi): Data Integrasi page with upload history + delete`.

---

### Task 4: Verification
- [ ] `npm run test` (all pass incl. history), `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- [ ] Manual: upload a file → appears in history with file name + uploader; View → dashboard for that brand+period; Delete → confirm → row gone + that period's data removed.

## Self-Review
- Scope: history view + file-name capture + delete; Shopee-only, metadata-only — matches brainstorm. ✅
- `toHistoryRows` types match between Task 2 def and its test. ✅
- No raw-file storage, no TikTok, no brand filter (deferred + marked). ✅
- Migration is additive (`default '{}'`), safe on existing rows. ✅
