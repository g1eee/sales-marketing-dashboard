# Library (Chunk 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A gallery of final creative assets at `/creative/library`, auto-populated from Briefs (`design_requests`) once marked `selesai` with an uploaded preview image — no separate table, no manual entry. Also upgrades the Briefs result-submission flow with a real image upload alongside the existing external link. Replaces the `ComingSoon` placeholder at `/creative/library`.

**Architecture:** Library has no table of its own — `lib/marketing/library.ts` queries `design_requests` directly (`status = 'selesai'` and `result_file_path is not null`), grouped by month of `updated_at` and rendered as a card grid. The Briefs result form gains a drag-drop image upload (via the already-vendored `useFileUpload` hook) that stores into a new public-read Supabase Storage bucket (`library-assets`) and writes the resulting object path to a new `design_requests.result_file_path` column.

**Tech Stack:** Next 16 App Router (server components + server actions), Supabase (Postgres + Storage), the vendored `hooks/use-file-upload.ts`, base-ui/shadcn kit components, Vitest + Testing Library.

## Global Constraints

- **Plain `<img>`, never `next/image`** — no `next/image` remote-domain config exists anywhere in this app; adding one is out of scope. Every preview image (drop-zone thumbnail, brief detail thumbnail, Library grid card) uses a plain `<img>`.
- **Storage path convention:** `result_file_path` stores just the object path (e.g. `"3f2a....jpg"`), never a full URL and never includes the bucket name — the bucket name is only ever the argument to `.storage.from("library-assets")`. Turn a path into a displayable URL via `getPreviewUrl`/`getPublicUrl`, never store the URL itself.
- **Preview validation runs twice:** client-side via the `useFileUpload` hook's own `accept`/`maxSize` options (instant feedback, rejects before the file ever enters state) and server-side via `validatePreviewFile` inside `setResult` (authoritative — never trust the client).
- **RLS / Storage policy pattern** (copy exactly, matches every existing table/bucket): `for all to authenticated using (true) with check (true)` for tables; for the `library-assets` bucket, one policy per operation (`select` public, `insert`/`update`/`delete` authenticated) — see Task 1.
- **Server actions**: start with `"use server"`, call `requireUser()` from `@/lib/auth` first, validate, `revalidatePath` every path whose rendered data changed.
- **Migrations are applied manually by the user** in the Supabase SQL editor (hosted DB, anon key only in `.env.local`) — never attempt to run them yourself. Hand the user the SQL and say so explicitly.
- Prefer kit components from `@/components/ui/*` / `@/components/reui/*` over hand-rolled equivalents (project `CLAUDE.md`).
- **No new npm dependencies** — `hooks/use-file-upload.ts` is already vendored and unused until now; Storage is already available on the existing `createClient()`.
- Typecheck: `npx tsc --noEmit`. Tests: `npx vitest run`. Both must stay clean after every task.

---

## File Structure

- **Create** `supabase/migrations/0007_library.sql`
- **Create** `lib/marketing/library.ts` — constants, validation, filter parsing, `getLibraryAssets`, `getPreviewUrl`
- **Create test** `lib/marketing/__tests__/library.test.ts`
- **Modify** `lib/marketing/requests.ts` — add `result_file_path` to `DesignRequest`
- **Modify** `lib/marketing/data.ts` — add `result_file_path` to the `COLS` select list
- **Modify** `app/(app)/marketing/requests/actions.ts` — replace `setResultLink` with `setResult`
- **Modify** `app/(app)/marketing/requests/[id]/result-form.tsx` — becomes a client component with drag-drop image upload
- **Modify** `app/(app)/marketing/requests/[id]/page.tsx` — show the preview thumbnail next to the result link
- **Create** `app/(app)/creative/library/library-filters.tsx` — brand/jenis/bulan/tahun filters (client)
- **Create** `app/(app)/creative/library/library-card.tsx` — presentational grid card
- **Rewrite** `app/(app)/creative/library/page.tsx` — assemble (replaces the placeholder)

No changes to `lib/nav.ts` — `/creative/library` is already registered (see `lib/__tests__/nav.test.ts`).

---

### Task 1: Migration + Library data layer (TDD for pure functions)

**Files:**
- Create: `supabase/migrations/0007_library.sql`
- Create: `lib/marketing/library.ts`
- Test: `lib/marketing/__tests__/library.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `ASSET_TYPES` from `@/lib/marketing/requests`.
- Produces (from `lib/marketing/library.ts`):
  - `MAX_PREVIEW_BYTES = 5 * 1024 * 1024`
  - `ACCEPTED_PREVIEW_TYPES: string[]` = `["image/jpeg", "image/png", "image/webp"]`
  - `validatePreviewFile(file: { type: string; size: number }): string | null`
  - `extForType(type: string): string`
  - `LibraryAsset { id, title, assetType, brandId, brandName, previewUrl, resultLink, updatedAt }`
  - `LibraryFilters { brandId?, assetType?, month?, year? }`
  - `parseLibraryFilters(sp: { brand?: string; assetType?: string; month?: string; year?: string }): LibraryFilters`
  - `getLibraryAssets(filters: LibraryFilters): Promise<LibraryAsset[]>`
  - `getPreviewUrl(path: string | null): Promise<string | null>`

- [ ] **Step 1: Migration** — create `supabase/migrations/0007_library.sql`:

```sql
-- Library (chunk 4): public preview-image bucket + a column on design_requests
-- to hold the uploaded preview's storage path. Library itself has no table —
-- it's a derived, filtered view of design_requests (status = 'selesai' with
-- a preview uploaded).

alter table design_requests add column result_file_path text;

insert into storage.buckets (id, name, public)
values ('library-assets', 'library-assets', true);

create policy library_assets_public_read on storage.objects
  for select to public using (bucket_id = 'library-assets');
create policy library_assets_authenticated_write on storage.objects
  for insert to authenticated with check (bucket_id = 'library-assets');
create policy library_assets_authenticated_update on storage.objects
  for update to authenticated using (bucket_id = 'library-assets');
create policy library_assets_authenticated_delete on storage.objects
  for delete to authenticated using (bucket_id = 'library-assets');
```

Hand this SQL to the user to run in the Supabase SQL editor — do not attempt to apply it. The rest of this task does not depend on it having been applied yet (tests use fixtures, not the live DB).

- [ ] **Step 2: Write the failing test** — create `lib/marketing/__tests__/library.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validatePreviewFile, parseLibraryFilters } from "@/lib/marketing/library";

describe("validatePreviewFile", () => {
  it("accepts a valid small JPEG", () => {
    expect(validatePreviewFile({ type: "image/jpeg", size: 1024 })).toBeNull();
  });
  it("accepts PNG and WEBP", () => {
    expect(validatePreviewFile({ type: "image/png", size: 1024 })).toBeNull();
    expect(validatePreviewFile({ type: "image/webp", size: 1024 })).toBeNull();
  });
  it("rejects a non-image mime type", () => {
    expect(validatePreviewFile({ type: "video/mp4", size: 1024 })).toMatch(/format/i);
  });
  it("rejects a file over 5MB", () => {
    expect(
      validatePreviewFile({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }),
    ).toMatch(/5mb/i);
  });
});

describe("parseLibraryFilters", () => {
  it("parses brand/assetType/month/year", () => {
    expect(
      parseLibraryFilters({ brand: "b1", assetType: "IG Feed", month: "7", year: "2026" }),
    ).toEqual({ brandId: "b1", assetType: "IG Feed", month: 7, year: 2026 });
  });
  it("ignores an invalid asset type", () => {
    expect(parseLibraryFilters({ assetType: "Hologram" })).toEqual({});
  });
  it("ignores invalid month/year", () => {
    expect(parseLibraryFilters({ month: "13", year: "1999" })).toEqual({});
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run lib/marketing/__tests__/library.test.ts`
Expected: FAIL — `Cannot find module '@/lib/marketing/library'`

- [ ] **Step 4: Write the implementation** — create `lib/marketing/library.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { ASSET_TYPES } from "@/lib/marketing/requests";

export const MAX_PREVIEW_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PREVIEW_TYPES: string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validatePreviewFile(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_PREVIEW_TYPES.includes(file.type)) {
    return "Format gambar harus JPG, PNG, atau WEBP.";
  }
  if (file.size > MAX_PREVIEW_BYTES) {
    return "Ukuran gambar maksimal 5MB.";
  }
  return null;
}

export function extForType(type: string): string {
  return EXT_BY_TYPE[type] ?? "jpg";
}

export interface LibraryAsset {
  id: string;
  title: string;
  assetType: string;
  brandId: string | null;
  brandName: string;
  previewUrl: string;
  resultLink: string | null;
  updatedAt: string;
}

export interface LibraryFilters {
  brandId?: string;
  assetType?: string;
  month?: number;
  year?: number;
}

export function parseLibraryFilters(sp: {
  brand?: string;
  assetType?: string;
  month?: string;
  year?: string;
}): LibraryFilters {
  const f: LibraryFilters = {};
  if (sp.brand) f.brandId = sp.brand;
  if (sp.assetType && ASSET_TYPES.includes(sp.assetType)) f.assetType = sp.assetType;
  const m = Number(sp.month);
  if (Number.isInteger(m) && m >= 1 && m <= 12) f.month = m;
  const y = Number(sp.year);
  if (Number.isInteger(y) && y >= 2000 && y <= 2100) f.year = y;
  return f;
}

type RawLibraryAsset = {
  id: string;
  title: string;
  asset_type: string;
  brand_id: string | null;
  result_link: string | null;
  result_file_path: string;
  updated_at: string;
  brands: { name: string } | null;
};

export async function getLibraryAssets(filters: LibraryFilters): Promise<LibraryAsset[]> {
  const supabase = await createClient();
  let q = supabase
    .from("design_requests")
    .select(
      "id, title, asset_type, brand_id, result_link, result_file_path, updated_at, brands(name)",
    )
    .eq("status", "selesai")
    .not("result_file_path", "is", null)
    .order("updated_at", { ascending: false });
  if (filters.brandId) q = q.eq("brand_id", filters.brandId);
  if (filters.assetType) q = q.eq("asset_type", filters.assetType);
  const { data, error } = await q;
  if (error) throw error;

  let rows: LibraryAsset[] = ((data ?? []) as unknown as RawLibraryAsset[]).map((r) => ({
    id: r.id,
    title: r.title,
    assetType: r.asset_type,
    brandId: r.brand_id,
    brandName: r.brands?.name ?? "—",
    previewUrl: supabase.storage
      .from("library-assets")
      .getPublicUrl(r.result_file_path).data.publicUrl,
    resultLink: r.result_link,
    updatedAt: r.updated_at,
  }));

  if (filters.month || filters.year) {
    rows = rows.filter((r) => {
      const d = new Date(r.updatedAt);
      if (filters.year && d.getFullYear() !== filters.year) return false;
      if (filters.month && d.getMonth() + 1 !== filters.month) return false;
      return true;
    });
  }
  return rows;
}

export async function getPreviewUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  return supabase.storage.from("library-assets").getPublicUrl(path).data.publicUrl;
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx vitest run lib/marketing/__tests__/library.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_library.sql lib/marketing/library.ts lib/marketing/__tests__/library.test.ts
git commit -m "feat(library): migration + data layer"
```

---

### Task 2: Briefs result flow — image upload

**Files:**
- Modify: `lib/marketing/requests.ts`
- Modify: `lib/marketing/data.ts`
- Modify: `app/(app)/marketing/requests/actions.ts`
- Modify: `app/(app)/marketing/requests/[id]/result-form.tsx`
- Modify: `app/(app)/marketing/requests/[id]/page.tsx`

**Interfaces:**
- Consumes: `validatePreviewFile`, `extForType`, `getPreviewUrl`, `ACCEPTED_PREVIEW_TYPES`, `MAX_PREVIEW_BYTES` from `@/lib/marketing/library` (Task 1); `isValidUrl` from `@/lib/marketing/requests`; `useFileUpload`, `type FileMetadata` from `@/hooks/use-file-upload`; `requireUser` from `@/lib/auth`; `createClient` from `@/lib/supabase/server`.
- Produces: `setResult(id: string, formData: FormData): Promise<void>` (replaces `setResultLink`); `ResultForm({ id, currentLink, currentPreviewUrl }: { id: string; currentLink: string | null; currentPreviewUrl: string | null })`; `DesignRequest.result_file_path: string | null`.

This task is DB/Storage-calling glue code, not pure logic — it isn't TDD'd with a red/green cycle (matches the established convention: `getRequest`, `createRequest`, `updateStatus`, and every existing server action in this codebase are untested; only pure functions get tests, and Task 1 already covers the pure functions this task uses). Verify with `tsc` and a full test-suite run instead.

- [ ] **Step 1: Add `result_file_path` to `DesignRequest`** — in `lib/marketing/requests.ts`, extend the interface:

```ts
export interface DesignRequest {
  id: string;
  asset_type: string;
  title: string;
  brief: string;
  deadline: string | null;
  status: DesignStatus;
  result_link: string | null;
  result_file_path: string | null;
  brand_id: string | null;
  created_at: string;
}
```

(This replaces the existing `DesignRequest` interface — same fields plus `result_file_path`.)

- [ ] **Step 2: Select the new column** — in `lib/marketing/data.ts`, update `COLS`:

```ts
const COLS =
  "id, asset_type, title, brief, deadline, status, result_link, result_file_path, brand_id, created_at";
```

(Replaces the existing `COLS` line; `listRequests`/`getRequest` below it are unchanged.)

- [ ] **Step 3: Replace `setResultLink` with `setResult`** — in `app/(app)/marketing/requests/actions.ts`:

Replace the imports at the top:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  validateRequestInput,
  isValidUrl,
  STATUSES,
  type DesignStatus,
} from "@/lib/marketing/requests";
import { validatePreviewFile, extForType } from "@/lib/marketing/library";
```

Keep `createRequest` and `updateStatus` exactly as they are. Replace `setResultLink` with:

```ts
export async function setResult(id: string, formData: FormData): Promise<void> {
  await requireUser();
  const link = String(formData.get("link") ?? "").trim();
  if (link && !isValidUrl(link)) {
    throw new Error("Link harus berupa URL http(s) yang valid");
  }

  const update: {
    result_link: string | null;
    updated_at: string;
    result_file_path?: string;
  } = {
    result_link: link || null,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createClient();
  const file = formData.get("file");
  if (file instanceof File) {
    const err = validatePreviewFile(file);
    if (err) throw new Error(err);
    const path = `${id}.${extForType(file.type)}`;
    const { error: uploadError } = await supabase.storage
      .from("library-assets")
      .upload(path, file, { upsert: true });
    if (uploadError) throw new Error(`Gagal mengunggah gambar: ${uploadError.message}`);
    update.result_file_path = path;
  }

  const { error } = await supabase
    .from("design_requests")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(`Gagal menyimpan: ${error.message}`);

  revalidatePath(`/marketing/requests/${id}`);
  revalidatePath("/creative/library");
}
```

- [ ] **Step 4: Rewrite `result-form.tsx` as a client component** — replace the full contents of `app/(app)/marketing/requests/[id]/result-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { ImageIcon } from "lucide-react";
import { useFileUpload, type FileMetadata } from "@/hooks/use-file-upload";
import { ACCEPTED_PREVIEW_TYPES, MAX_PREVIEW_BYTES } from "@/lib/marketing/library";
import { cn } from "@/lib/utils";
import { setResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResultForm({
  id,
  currentLink,
  currentPreviewUrl,
}: {
  id: string;
  currentLink: string | null;
  currentPreviewUrl: string | null;
}) {
  const [link, setLink] = useState(currentLink ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const initialFiles: FileMetadata[] = currentPreviewUrl
    ? [{ id: "current", name: "preview", size: 0, type: "image/*", url: currentPreviewUrl }]
    : [];

  const [
    { files, isDragging },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, getInputProps },
  ] = useFileUpload({
    accept: ACCEPTED_PREVIEW_TYPES.join(","),
    maxSize: MAX_PREVIEW_BYTES,
    multiple: false,
    initialFiles,
    onError: (errors) => setError(errors[0]),
  });

  const preview = files[0];

  function submit() {
    setError(null);
    const formData = new FormData();
    formData.set("link", link);
    if (preview?.file instanceof File) {
      formData.set("file", preview.file);
    }
    start(async () => {
      try {
        await setResult(id, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Input
        name="link"
        type="url"
        placeholder="https://drive.google.com/…"
        value={link}
        onChange={(e) => setLink(e.target.value)}
      />

      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
        onClick={openFileDialog}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openFileDialog();
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />
        {preview?.preview ? (
          <img
            src={preview.preview}
            alt="Preview"
            className="size-16 shrink-0 rounded-md border object-cover"
          />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted">
            <ImageIcon className="size-5 text-muted-foreground" />
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          {preview
            ? "Klik atau seret untuk ganti gambar"
            : "Klik atau seret gambar preview (JPG/PNG/WEBP, maks 5MB)"}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Show the preview thumbnail on the brief detail page** — replace the full contents of `app/(app)/marketing/requests/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getRequest } from "@/lib/marketing/data";
import { getPreviewUrl } from "@/lib/marketing/library";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDateShort } from "@/lib/dates";
import { StatusSelect } from "../status-select";
import { ResultForm } from "./result-form";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const req = await getRequest(id);
  if (!req) notFound();
  const previewUrl = await getPreviewUrl(req.result_file_path);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/marketing/requests"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>
      <PageHeader title={req.title} description={req.asset_type} />
      <Card className="space-y-5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Status
            </p>
            <StatusSelect id={req.id} status={req.status} size="default" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Deadline
            </p>
            <p className="text-sm font-medium">
              {req.deadline ? formatDateShort(req.deadline) : "—"}
            </p>
          </div>
        </div>

        {req.brief && (
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Brief
            </p>
            <p className="text-sm whitespace-pre-wrap">{req.brief}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Hasil
          </p>
          <div className="flex items-start gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={req.title}
                className="size-20 shrink-0 rounded-md border object-cover"
              />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              {req.result_link && (
                <a
                  href={req.result_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
                >
                  <ExternalLink className="size-3.5" />
                  {req.result_link}
                </a>
              )}
              <ResultForm id={req.id} currentLink={req.result_link} currentPreviewUrl={previewUrl} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in any of the 5 files touched by this task

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — every existing test file plus Task 1's `library.test.ts` (the `DesignRequest`/`COLS` changes are additive, so `lib/marketing/__tests__/requests.test.ts` keeps passing unchanged)

- [ ] **Step 8: Commit**

```bash
git add lib/marketing/requests.ts lib/marketing/data.ts "app/(app)/marketing/requests/actions.ts" "app/(app)/marketing/requests/[id]/result-form.tsx" "app/(app)/marketing/requests/[id]/page.tsx"
git commit -m "feat(library): preview image upload on brief results"
```

---

### Task 3: Library page — filters + card + page assembly

**Files:**
- Create: `app/(app)/creative/library/library-filters.tsx`
- Create: `app/(app)/creative/library/library-card.tsx`
- Modify (rewrite): `app/(app)/creative/library/page.tsx`

**Interfaces:**
- Consumes: `listBrands`, `type Brand` from `@/lib/brands`; `ASSET_TYPES` from `@/lib/marketing/requests`; `getLibraryAssets`, `parseLibraryFilters`, `type LibraryAsset` from `@/lib/marketing/library` (Task 1); `PageHeader` from `@/components/page-header`; `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` from `@/components/ui/card`; `Badge` from `@/components/ui/badge`; `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription` from `@/components/ui/empty`; `formatDateShort` from `@/lib/dates`.
- Produces: `LibraryFilters` component, `LibraryCard` component, the assembled `LibraryPage`.

No new test file — per the design spec (`docs/superpowers/specs/2026-07-01-library-design.md`, Testing section), `LibraryCard`/`page.tsx` are presentationally simple (image + text + badges, plain grouping-by-month with no geometric layout math), matching the existing precedent that Dokumen has zero component tests. Verify with `tsc` + the full suite + a production build instead.

- [ ] **Step 1: Filters** — create `app/(app)/creative/library/library-filters.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/brands";
import { ASSET_TYPES } from "@/lib/marketing/requests";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const ALL = "all";

export function LibraryFilters({
  brands,
  brand,
  assetType,
  month,
  year,
}: {
  brands: Brand[];
  brand: string;
  assetType: string;
  month: string;
  year: string;
}) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

  function nav(next: { brand?: string; assetType?: string; month?: string; year?: string }) {
    const m = { brand, assetType, month, year, ...next };
    const params = new URLSearchParams();
    if (m.brand !== ALL) params.set("brand", m.brand);
    if (m.assetType !== ALL) params.set("assetType", m.assetType);
    if (m.month !== ALL) params.set("month", m.month);
    if (m.year !== ALL) params.set("year", m.year);
    const qs = params.toString();
    router.push(qs ? `/creative/library?${qs}` : "/creative/library");
  }

  const brandItems = { [ALL]: "Semua brand", ...Object.fromEntries(brands.map((b) => [b.id, b.name])) };
  const assetTypeItems = { [ALL]: "Semua jenis", ...Object.fromEntries(ASSET_TYPES.map((t) => [t, t])) };
  const monthItems = { [ALL]: "Semua bulan", ...Object.fromEntries(MONTHS.map((mo, i) => [String(i + 1), mo])) };
  const yearItems = { [ALL]: "Semua tahun", ...Object.fromEntries(years.map((y) => [String(y), String(y)])) };

  return (
    <div className="flex flex-wrap gap-2">
      <Select items={brandItems} value={brand} onValueChange={(v) => nav({ brand: v ?? ALL })}>
        <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua brand</SelectItem>
          {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={assetTypeItems} value={assetType} onValueChange={(v) => nav({ assetType: v ?? ALL })}>
        <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua jenis</SelectItem>
          {ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={monthItems} value={month} onValueChange={(v) => nav({ month: v ?? ALL })}>
        <SelectTrigger className="min-w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua bulan</SelectItem>
          {MONTHS.map((mo, i) => <SelectItem key={i} value={String(i + 1)}>{mo}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={yearItems} value={year} onValueChange={(v) => nav({ year: v ?? ALL })}>
        <SelectTrigger className="min-w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua tahun</SelectItem>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Card** — create `app/(app)/creative/library/library-card.tsx`:

```tsx
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LibraryAsset } from "@/lib/marketing/library";
import { formatDateShort } from "@/lib/dates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LibraryCard({ asset }: { asset: LibraryAsset }) {
  return (
    <Card className="shadow-soft">
      <img
        src={asset.previewUrl}
        alt={asset.title}
        className="aspect-video w-full object-cover"
      />
      <CardHeader>
        <CardTitle className="truncate">{asset.title}</CardTitle>
        <CardDescription>{formatDateShort(asset.updatedAt.slice(0, 10))}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{asset.brandName}</Badge>
        <Badge variant="outline">{asset.assetType}</Badge>
        {asset.resultLink && (
          <Link
            href={`/marketing/requests/${asset.id}`}
            className="ml-auto inline-flex items-center gap-0.5 text-xs underline underline-offset-4"
          >
            Asli <ArrowUpRight className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Page assembly** — replace the full contents of `app/(app)/creative/library/page.tsx`:

```tsx
import { listBrands } from "@/lib/brands";
import { getLibraryAssets, parseLibraryFilters, type LibraryAsset } from "@/lib/marketing/library";
import { PageHeader } from "@/components/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ImageIcon } from "lucide-react";
import { LibraryFilters } from "./library-filters";
import { LibraryCard } from "./library-card";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string;
    assetType?: string;
    month?: string;
    year?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters = parseLibraryFilters(sp);
  const [assets, brands] = await Promise.all([getLibraryAssets(filters), listBrands()]);

  const groups = new Map<string, LibraryAsset[]>();
  for (const a of assets) {
    const d = new Date(a.updatedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Library"
        description="Aset final dari brief, per brand, jenis, dan periode."
      />

      <LibraryFilters
        brands={brands}
        brand={sp.brand ?? "all"}
        assetType={sp.assetType ?? "all"}
        month={sp.month ?? "all"}
        year={sp.year ?? "all"}
      />

      {assets.length === 0 ? (
        <Empty className="min-h-[40vh] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>Belum ada aset</EmptyTitle>
            <EmptyDescription>
              Aset muncul di sini setelah brief ditandai selesai dengan gambar preview.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([key, rows]) => {
            const [y, m] = key.split("-").map(Number);
            return (
              <div key={key} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {MONTHS[m]} {y}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {rows.map((a) => (
                    <LibraryCard key={a.id} asset={a} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Full verification**

Run, in order:
1. `npx tsc --noEmit` — Expected: no errors
2. `npx vitest run` — Expected: every test file passes (existing suite + Task 1's `library.test.ts`)
3. `npm run build` — Expected: production build succeeds

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/creative/library/library-filters.tsx" "app/(app)/creative/library/library-card.tsx" "app/(app)/creative/library/page.tsx"
git commit -m "feat(library): filters, card, and page assembly"
```

---

## After implementation

Tell the user to run `supabase/migrations/0007_library.sql` (from Task 1) in the Supabase SQL editor before the feature will show real data — the build/tests pass without it, but every live query against `result_file_path` or the `library-assets` bucket will error until it's applied. Then verify locally with `npm run dev`: mark a brief `selesai`, upload a preview image on its result form, and confirm it shows up grouped by month at `/creative/library`.
