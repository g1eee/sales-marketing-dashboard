# Dokumen (Chunk 3) Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** A document-link registry at `/tools/dokumen` — store external doc links (Google Sheet/Slide/etc.) grouped by user-defined **jenis** + **brand** + **bulan/tahun**, with full CRUD (add/edit/delete) and Brand/Bulan/Tahun filters.

**Architecture:** New `documents` table. Server page reads filters from `searchParams`, fetches filtered rows (+ brand names + distinct types). A client dialog (one component, add/edit) writes via server actions. Jenis = free text with a native `<datalist>` of existing types. Delete reuses the chunk-2 alert-dialog pattern.

**Tech Stack:** Next 16 App Router, Supabase, base-ui kit, vitest.

## Global Constraints / Decisions
- **Jenis dokumen = free text + `<datalist>` suggestions** (user-defined, no management UI). Upgrade path: a `document_types` table if curation is ever needed.
- **Periode = bulan (1–12) + tahun.** Filters: Brand · Bulan · Tahun, all optional (default shows everything, newest first). No "minggu" field.
- **Validation at the action boundary** (required fields, valid URL, month 1–12) — never skip.
- Match in-repo patterns: server actions in `actions.ts`, `requireUser`, `createClient`, base-ui `Select` (`items` + `onValueChange`), `revalidatePath`. Prefer kit components (`ui/dialog`, `ui/table`, `ui/badge`, `ui/empty`, `ui/input`, `ui/textarea`, `ui/select`, `ui/label`, `ui/button`, `ui/alert-dialog`).
- Migration is **applied by the user** in Supabase (hosted DB, anon key only).

## File Structure
- **Create** `supabase/migrations/0005_documents.sql`
- **Create** `lib/documents.ts` — types, `validateDocumentInput`, `parseDocumentFilters`, `getDocuments`, `getDocTypes`
- **Create test** `lib/__tests__/documents.test.ts`
- **Create** `app/(app)/tools/dokumen/actions.ts` — `createDocument`, `updateDocument`, `deleteDocument`
- **Create** `app/(app)/tools/dokumen/document-dialog.tsx` — client add/edit form
- **Create** `app/(app)/tools/dokumen/document-filters.tsx` — client filter bar
- **Create** `app/(app)/tools/dokumen/delete-document-button.tsx` — client delete (alert-dialog)
- **Rewrite** `app/(app)/tools/dokumen/page.tsx` — assemble (replaces the placeholder)

---

### Task 1: Migration + data layer + validation (TDD)

- [ ] **Step 1: Migration** `supabase/migrations/0005_documents.sql`:
```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  doc_type text not null,
  title text not null,
  url text not null,
  month smallint not null check (month between 1 and 12),
  year smallint not null,
  notes text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index documents_brand_period_idx on documents (brand_id, year, month);
alter table documents enable row level security;
create policy documents_authenticated_all on documents
  for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Failing test** `lib/__tests__/documents.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateDocumentInput, parseDocumentFilters } from "@/lib/documents";

const valid = {
  brandId: "b1", docType: "Tracking Harian", title: "Sheet Juni",
  url: "https://docs.google.com/x", month: 6, year: 2026, notes: "",
};

describe("validateDocumentInput", () => {
  it("returns null for valid input", () => {
    expect(validateDocumentInput(valid)).toBeNull();
  });
  it("requires brand, jenis, judul, link", () => {
    expect(validateDocumentInput({ ...valid, brandId: "" })).toMatch(/brand/i);
    expect(validateDocumentInput({ ...valid, docType: " " })).toMatch(/jenis/i);
    expect(validateDocumentInput({ ...valid, title: "" })).toMatch(/judul/i);
    expect(validateDocumentInput({ ...valid, url: "" })).toMatch(/link/i);
  });
  it("rejects a non-URL link", () => {
    expect(validateDocumentInput({ ...valid, url: "bukan-url" })).toMatch(/url/i);
  });
  it("rejects month out of range", () => {
    expect(validateDocumentInput({ ...valid, month: 13 })).toMatch(/bulan/i);
  });
});

describe("parseDocumentFilters", () => {
  it("parses brand/month/year and ignores invalid", () => {
    expect(parseDocumentFilters({ brand: "b1", month: "6", year: "2026" }))
      .toEqual({ brandId: "b1", month: 6, year: 2026 });
    expect(parseDocumentFilters({ month: "13", year: "abc" })).toEqual({});
  });
});
```

- [ ] **Step 3:** Run `npm run test -- documents` → FAIL (module missing).

- [ ] **Step 4:** Implement `lib/documents.ts`:
```ts
import { createClient } from "@/lib/supabase/server";

export interface DocumentInput {
  brandId: string;
  docType: string;
  title: string;
  url: string;
  month: number;
  year: number;
  notes: string;
}

export interface DocumentRow {
  id: string;
  brandId: string;
  brandName: string;
  docType: string;
  title: string;
  url: string;
  month: number;
  year: number;
  notes: string;
  createdAt: string;
}

export interface DocumentFilters {
  brandId?: string;
  month?: number;
  year?: number;
}

export function validateDocumentInput(input: Partial<DocumentInput>): string | null {
  if (!input.brandId) return "Brand wajib dipilih.";
  if (!input.docType?.trim()) return "Jenis dokumen wajib diisi.";
  if (!input.title?.trim()) return "Judul wajib diisi.";
  if (!input.url?.trim()) return "Link wajib diisi.";
  try {
    new URL(input.url);
  } catch {
    return "Link harus URL yang valid (pakai https://).";
  }
  if (!input.month || input.month < 1 || input.month > 12) return "Bulan tidak valid.";
  if (!input.year || input.year < 2000 || input.year > 2100) return "Tahun tidak valid.";
  return null;
}

export function parseDocumentFilters(
  sp: Record<string, string | undefined>,
): DocumentFilters {
  const f: DocumentFilters = {};
  if (sp.brand) f.brandId = sp.brand;
  const m = Number(sp.month);
  if (Number.isInteger(m) && m >= 1 && m <= 12) f.month = m;
  const y = Number(sp.year);
  if (Number.isInteger(y) && y >= 2000 && y <= 2100) f.year = y;
  return f;
}

type RawDoc = {
  id: string; brand_id: string; doc_type: string; title: string; url: string;
  month: number; year: number; notes: string; created_at: string;
  brands: { name: string } | null;
};

export async function getDocuments(filters: DocumentFilters): Promise<DocumentRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("documents")
    .select("id, brand_id, doc_type, title, url, month, year, notes, created_at, brands(name)")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters.brandId) q = q.eq("brand_id", filters.brandId);
  if (filters.month) q = q.eq("month", filters.month);
  if (filters.year) q = q.eq("year", filters.year);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as RawDoc[]).map((d) => ({
    id: d.id,
    brandId: d.brand_id,
    brandName: d.brands?.name ?? "—",
    docType: d.doc_type,
    title: d.title,
    url: d.url,
    month: d.month,
    year: d.year,
    notes: d.notes,
    createdAt: d.created_at,
  }));
}

export async function getDocTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("doc_type");
  return [...new Set((data ?? []).map((r) => r.doc_type as string))].sort();
}
```

- [ ] **Step 5:** Run `npm run test -- documents` → PASS. Typecheck. Commit: `feat(dokumen): documents schema + data layer + validation`.

---

### Task 2: Server actions

- [ ] **Step 1:** `app/(app)/tools/dokumen/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateDocumentInput, type DocumentInput } from "@/lib/documents";

function row(input: DocumentInput) {
  return {
    brand_id: input.brandId,
    doc_type: input.docType.trim(),
    title: input.title.trim(),
    url: input.url.trim(),
    month: input.month,
    year: input.year,
    notes: input.notes.trim(),
  };
}

export async function createDocument(input: DocumentInput): Promise<void> {
  const user = await requireUser();
  const err = validateDocumentInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .insert({ ...row(input), created_by: user.id });
  if (error) throw new Error(`Gagal menyimpan: ${error.message}`);
  revalidatePath("/tools/dokumen");
}

export async function updateDocument(id: string, input: DocumentInput): Promise<void> {
  await requireUser();
  const err = validateDocumentInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update(row(input)).eq("id", id);
  if (error) throw new Error(`Gagal mengubah: ${error.message}`);
  revalidatePath("/tools/dokumen");
}

export async function deleteDocument(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
  revalidatePath("/tools/dokumen");
}
```
- [ ] **Step 2:** Typecheck. Commit: `feat(dokumen): create/update/delete server actions`.

---

### Task 3: Add/edit dialog (client)

**Read `components/ui/dialog.tsx` first** for the base-ui Dialog API (controlled `open`/`onOpenChange`).

- [ ] **Step 1:** `app/(app)/tools/dokumen/document-dialog.tsx` — one component for add & edit:
  - Props: `{ brands: Brand[]; docTypes: string[]; doc?: DocumentRow; trigger: React.ReactNode }`.
  - Controlled `open` state; close on successful submit (`useTransition`).
  - Fields: Brand (`Select`), **Jenis** (`Input` with `list="doc-types"` + a `<datalist id="doc-types">` of `docTypes`), Judul (`Input`), Link (`Input type="url"`), Bulan (`Select` Jan–Des), Tahun (`Input type="number"`), Catatan (`Textarea`). Labels via `ui/label`.
  - Submit: build `DocumentInput`, call `doc ? updateDocument(doc.id, input) : createDocument(input)`; on error show message; on success close.
  - Bulan options: array `["Januari", …, "Desember"]` → value `1..12`.
- [ ] **Step 2:** Typecheck. Commit: `feat(dokumen): add/edit document dialog`.

---

### Task 4: Filters + table + delete + page

- [ ] **Step 1:** `delete-document-button.tsx` — same shape as chunk-2's `delete-upload-button.tsx` but calling `deleteDocument(id)`; confirm copy "Hapus dokumen ini?".
- [ ] **Step 2:** `document-filters.tsx` (client) — Brand/Bulan/Tahun `Select`s (each with an "All" option = clear), navigating via `useRouter().push("/tools/dokumen?…")` (pattern from `app/(app)/sales/dashboard/controls.tsx`). Years: current year and the 3 prior.
- [ ] **Step 3:** Rewrite `page.tsx` (server): `searchParams` → `parseDocumentFilters` → `getDocuments` + `listBrands` + `getDocTypes`. Render `PageHeader "Dokumen"`, `<DocumentFilters>`, an add `<DocumentDialog trigger={<Button>+ Tambah Dokumen</Button>}>`, then the table (Jenis `Badge` · Judul · Link `↗` external · Bulan/Tahun · Catatan · Aksi[edit dialog + delete]) or `ui/empty` when none.
  - `page.tsx` receives `searchParams` as a Promise in Next 16 — `await props.searchParams`. **Confirm this in `node_modules/next/dist/docs` before coding.**
- [ ] **Step 4:** Typecheck + dev smoke: add a doc → appears; edit → changes; delete → confirm → gone; filters narrow the list; link opens in new tab. Commit: `feat(dokumen): filters, table, and page assembly`.

---

### Task 5: Verification
- [ ] `npm run test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` — all green.
- [ ] Manual: full CRUD + filters + datalist suggestions (type a new jenis → next add shows it as a suggestion).

## Self-Review
- Jenis free-text + datalist; periode bulan+tahun; full CRUD; no minggu — matches the agreed design. ✅
- Validation lives in the action (trust boundary) + is unit-tested. ✅
- `DocumentInput` shape consistent across `documents.ts`, `actions.ts`, `document-dialog.tsx`. ✅
- Migration applied by user (note in handoff). ✅
