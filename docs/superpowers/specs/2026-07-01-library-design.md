# Library — Design Spec

**Date:** 2026-07-01
**Status:** Approved (pending written-spec review)
**Roadmap:** Chunk 4 of `2026-06-30-miragie-nav-restructure-design.md`
(Creative → Library), replaces the `ComingSoon` placeholder at
`/creative/library`.

## Goal

A gallery of **final creative assets**, auto-populated from **Briefs**
(`design_requests`) once they're marked **selesai** — no separate manual
entry. Grouped by brand + jenis asset + periode, same "collection" shape as
Dokumen/Kalender Promo. This also upgrades the Briefs result-submission flow
from a plain external link to a real uploaded preview image (kept alongside
the link, not replacing it).

## Decisions (from brainstorming)

- **Source of truth:** Library has no separate table — it's a filtered,
  grouped view of `design_requests` where `status = 'selesai'` **and** a
  preview image was uploaded. A finished brief with only a link (no
  uploaded preview) does not appear in the Library grid — nothing to show
  as a thumbnail. No separate management UI for Library; to change what
  shows up, edit the underlying Brief.
- **Two result fields, both optional, independent:** `result_link` (existing
  — external URL, e.g. Google Drive, for the real/original file) and a new
  **uploaded preview image** (`result_file_path`, Supabase Storage). The
  preview is explicitly a **preview**, not the deliverable: capped small so
  it's cheap to store/display; the link is for the actual full-size file
  when it's too big to practically upload (the brief author's own rule of
  thumb: "upload kalau ringan, link kalau file aslinya > beberapa MB").
- **Preview upload constraints:** images only (JPG/PNG/WEBP) — no video, even
  for the "Konten Video" asset type (a video's real file always goes via the
  link). **Max 5MB**, validated client-side (immediate feedback) and
  server-side (source of truth).
- **Uploaded image doubles as the grid thumbnail** — no separate thumbnail
  generation/resizing step.
- **Periode = `updated_at`** (when the brief was last saved as "selesai" with
  a result) — `design_requests` has no explicit month/year field like
  Dokumen does, and reusing the existing timestamp avoids adding one.
- **Storage bucket is public-read**, upload/update/delete restricted to
  authenticated users. Acceptable because this is an internal tool behind
  login; a public-read bucket means someone would need the *exact* object
  URL to view an image (not browsable/listable) — fine for marketing assets
  that mostly end up published anyway. Bucket + RLS policies created via one
  SQL script (Supabase supports `storage.buckets`/`storage.objects` DDL in
  the SQL editor), keeping the same "hand the user one script" workflow as
  every prior migration.

## Architecture

### 1. Migration `supabase/migrations/0007_library.sql`

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

### 2. Shared data layer — `lib/marketing/library.ts` (new)

- `MAX_PREVIEW_BYTES` (5 \* 1024 \* 1024), `ACCEPTED_PREVIEW_TYPES`
  (`image/jpeg`, `image/png`, `image/webp`).
- `validatePreviewFile({ type, size }): string | null` — pure, used both
  client-side (immediate feedback in `ResultForm`) and server-side (the
  action re-validates, never trusts the client).
- `LibraryAsset` type: `{ id, title, assetType, brandId, brandName,
  previewUrl, resultLink, updatedAt }`.
- `LibraryFilters` type: `{ brandId?, assetType?, month?, year? }` +
  `parseLibraryFilters(sp)`.
- `getLibraryAssets(filters)` — queries `design_requests` (`status =
  'selesai'`, `result_file_path is not null`), pushes `brandId`/`assetType`
  down as `.eq()` (real columns, unlike Kalender Promo's derived fields),
  filters `month`/`year` in-memory off `updated_at` (same reasoning as
  Kalender Promo: low volume, avoids a generated column). Builds
  `previewUrl` via `supabase.storage.from("library-assets").getPublicUrl(path)`
  (synchronous, no network call for a public bucket).

### 3. Briefs result flow — modify existing files

- **`app/(app)/marketing/requests/actions.ts`**: replace `setResultLink`
  with `setResult(id, formData: FormData)` — reads `link` and an optional
  `file` off the FormData, validates both (URL shape for the link,
  `validatePreviewFile` for the image), and when a file is present uploads
  it via `supabase.storage.from("library-assets").upload(path, file,
  {upsert: true})` where `path = "{id}.{ext}"` — the bucket name is never
  part of `path`, only the argument to `.from(...)`. `result_file_path`
  stores exactly that `path` value (e.g. `"3f2a-....jpg"`), not a full URL —
  `getLibraryAssets` turns it into a displayable URL later via
  `getPublicUrl(path)`. Updates `result_link`/`result_file_path`/
  `updated_at` in one write, revalidates both the request detail page and
  `/creative/library`.
- **`app/(app)/marketing/requests/[id]/result-form.tsx`**: becomes a client
  component (needs interactive drag-drop state from the existing
  `hooks/use-file-upload.ts`, which is already `"use client"` and vendored
  but unused until now). Keeps the link `Input`, adds an image drop-zone
  (accept `image/*`, client-side size/type check before submit), shows the
  current preview thumbnail if one exists, calls `setResult` via
  `useTransition` (same pattern as `CampaignDialog`/`DocumentDialog`:
  build the payload, call the action, surface thrown errors in local state).
- **`app/(app)/marketing/requests/[id]/page.tsx`**: minor update — show the
  preview thumbnail (if present) next to/above the existing result-link
  display.

### 4. Library page — `app/(app)/creative/library/`

- **`page.tsx`** (server, replaces the placeholder) — `PageHeader` (title +
  description only, no "add" action — Library has no direct entry point) +
  `LibraryFilters` (brand/jenis asset/bulan/tahun) + a grid of
  `LibraryCard`s grouped by month (same month-grouping shape as
  `CampaignList`, rendered as a card grid instead of a table).
- **`library-filters.tsx`** (client) — brand/assetType/month/year selects,
  same URL-driven nav pattern as `document-filters.tsx`/`campaign-filters.tsx`.
- **`library-card.tsx`** — small presentational component: preview image,
  title, brand + asset-type badges, periode, an "Asli ↗" link when
  `resultLink` is present, linking through to the brief's detail page
  (`/marketing/requests/{id}`) for full context.

## Data flow

`page.tsx` → `parseLibraryFilters(searchParams)` → `getLibraryAssets(filters)`
(pushes brand/assetType to the query, filters month/year in-memory) → group
by month of `updatedAt` → render `LibraryCard` grid. Submitting `ResultForm`
→ `setResult` (validate → optional Storage upload → update the
`design_requests` row) → `revalidatePath` on both the brief detail page and
`/creative/library` → both pages reflect the new preview immediately.

## Error handling

- Preview upload validated twice: client (`validatePreviewFile` before
  submit, for instant feedback) and server (same function, inside
  `setResult` — authoritative, since the client check is only UX).
  `ResultForm` surfaces thrown errors in local state, same pattern as
  `CampaignDialog`.
- Link validation unchanged (`isValidUrl`, already exists).

## Responsive & accessibility

Card grid reflows via standard Tailwind grid breakpoints (matches other
grid layouts already in the app, e.g. the Dashboard KPI cards). Filters are
the existing accessible `Select` kit components. Preview images get
`alt={title}`.

## Testing

- `lib/marketing/__tests__/library.test.ts` (new) — `validatePreviewFile`
  (accepts a valid small JPEG/PNG/WEBP, rejects wrong mime type, rejects
  over 5MB) and `parseLibraryFilters` (parses brand/assetType/month/year,
  ignores invalid month/year — same shape as `parseCampaignFilters`'s test).
- `getLibraryAssets`, `setResult` are DB/Storage-calling and intentionally
  **not** unit tested — matches the established convention (`getDocuments`,
  `getCampaigns`, and every existing server action in this codebase are
  untested; only pure functions get tests).
- No new smoke-render test — `LibraryCard`/`page.tsx` are presentationally
  simple enough (image + text + badges) that the existing coverage
  precedent (Dokumen has zero component tests) applies; Kalender Promo's
  smoke tests were added because that grid's *layout logic* was genuinely
  intricate, which doesn't apply here.

## New files / dependencies

No new npm dependencies — `hooks/use-file-upload.ts` is already vendored
and unused until now; `@supabase/supabase-js`'s Storage client is already
part of the existing `createClient()`. New files: `lib/marketing/library.ts`,
`app/(app)/creative/library/{page.tsx (rewrite),library-filters.tsx,
library-card.tsx}`. Modified: `app/(app)/marketing/requests/actions.ts`,
`app/(app)/marketing/requests/[id]/result-form.tsx`,
`app/(app)/marketing/requests/[id]/page.tsx`.

## Out of scope (YAGNI)

- No image resizing/compression on upload — the 5MB cap is the only guard.
- No cleanup of the old Storage object when a brief's extension changes
  between uploads (e.g. first a `.png`, later replaced with a `.jpg`) —
  `upsert` only overwrites when the path (and therefore extension) matches;
  a changed extension leaves one small orphaned file. Low-stakes, low-volume
  internal tool; revisit only if Storage usage actually grows into a
  problem.
- No bulk/multi-file upload — one preview image per brief.
- No direct add/edit/delete on Library itself — it's a derived view; changes
  happen on the underlying Brief.
- No video preview upload — video assets always rely on the external link.
