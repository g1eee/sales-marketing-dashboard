# Kalender Promo — Design Spec

**Date:** 2026-07-01
**Status:** Approved (pending written-spec review)
**Roadmap:** Chunk 5 of `2026-06-30-miragie-nav-restructure-design.md`
(Digital Marketing → Tools → Kalender Promo), replaces the `ComingSoon`
placeholder at `/tools/kalender-promo`.

## Goal

A calendar for **planning and tracking promo campaign schedules** — marketplace
promos (11.11, 12.12, flash sale, dll) and brand campaigns — so the team can
see at a glance what's running, when, for which brand(s) and marketplace(s).
Explicitly **not** a creative/content deadline tracker (that's a separate,
future feature).

## Decisions (from brainstorming)

- **Data per campaign:** nama, rentang tanggal, catatan, banyak **brand**
  (multi-select dari tabel `brands`), banyak **marketplace** (multi-select,
  teks bebas + datalist dari nilai yang sudah pernah dipakai — pola sama
  seperti field "Jenis" di Dokumen).
- **Status** (`planned` / `berjalan` / `selesai`) **dihitung otomatis** dari
  tanggal hari ini vs. rentang tanggal campaign — bukan field yang diisi manual.
- **Dua tampilan**, toggle: **Grid bulanan** (default) dan **List**, keduanya
  tunduk ke filter brand/marketplace/status yang sama. Tampilan aktif dan
  filter hidup di URL `searchParams` (pola sama Dokumen), bukan client state.
  Param `month`/`year` cuma berlaku buat **Grid** (nentuin bulan yang
  ditampilkan); **List** menampilkan semua campaign yang cocok filter,
  dikelompokkan per bulan — tidak dibatasi ke satu bulan.
- **Warna kategorikal per brand** (bukan per status atau netral) — cara utama
  bedain campaign yang tumpang tindih di grid.
- **Interaksi grid:** klik kotak tanggal kosong → buka dialog tambah campaign
  dengan tanggal itu ter-prefill. Klik pita campaign yang sudah ada → buka
  dialog edit campaign tersebut.
- Grid dibangun sebagai **komponen custom ringan** (CSS Grid + `date-fns`,
  keduanya sudah ada di stack) — bukan `components/ui/calendar.tsx`
  (react-day-picker, dirancang buat pilih tanggal, bukan nampilin banyak event
  multi-hari per kotak) dan bukan library kalender/scheduling baru (berat,
  gaya visual beda sendiri, overkill buat kebutuhan ini).
  `components/ui/calendar.tsx` tetap dipakai, tapi khusus buat input
  rentang tanggal di dalam dialog tambah/edit.

## Architecture

### 1. Data model — migration `supabase/migrations/0006_promo_campaigns.sql`

```sql
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

Two junction tables (bukan array column) supaya query filter-by-brand dan
filter-by-marketplace tetap simpel pakai join biasa, konsisten sama gaya
relasional yang sudah dipakai di tabel lain.

### 2. Data layer — `lib/promo-campaigns.ts`

- **Types:** `PromoCampaign` (id, name, startDate, endDate, notes, brands:
  `Brand[]`, marketplaces: `string[]`, status: derived), `CampaignFilters`
  (brand, marketplace, status, month, year, view).
- `validateCampaignInput` — nama wajib, `endDate >= startDate`, minimal 1 brand.
- `parseCampaignFilters(searchParams)` — sama pola `parseDocumentFilters`.
- `getCampaigns(filters)` — Supabase nested select yang join kedua tabel
  junction (`promo_campaign_brands(brands(id,name))`,
  `promo_campaign_marketplaces(marketplace)`). Filter brand/marketplace/status
  diterapkan **di memori** setelah fetch (bukan query builder bertingkat) —
  volume data rendah (internal tool, per-bulan), jadi ini paling simpel dan
  cukup cepat; upgrade ke filter di level query kalau datanya sudah besar.
- `getMarketplaces()` — nilai `marketplace` yang distinct dari
  `promo_campaign_marketplaces`, buat datalist di dialog.
- `deriveCampaignStatus(startDate, endDate, today)` — pure function:
  `today < startDate` → `planned`; `today > endDate` → `selesai`; selainnya →
  `berjalan`.

### 3. Warna per brand — extend `lib/chart-colors.ts`

Tambah palet kategorikal (`BRAND_COLORS`, ~8 hue, perluasan dari
`SOURCE_COLORS` yang sudah ada) + `assignBrandColors(brands: Brand[])` yang
mengembalikan `Map<brandId, color>`. Dihitung dari **daftar brand lengkap**
(`listBrands()`, urutan alfabetis tetap), bukan hasil filter — supaya warna
brand yang sama tidak berubah-ubah tergantung filter apa yang sedang aktif.

### 4. Month-grid math — extend `lib/dates.ts`

Tambah `getMonthGrid(year, month)`: pure function pakai `date-fns`
(`startOfMonth`, `endOfWeek`, dst.) yang mengembalikan array minggu, tiap
minggu array 7 tanggal (termasuk leading/trailing days dari bulan
sebelum/sesudahnya, konvensi grid kalender standar).

### 5. Halaman & komponen — `app/(app)/tools/kalender-promo/`

- **`page.tsx`** (server) — baca `searchParams`, `PageHeader` (judul + tombol
  "+ Tambah Campaign" → `CampaignDialog` tanpa prefill) + `CampaignFilters` +
  render `MonthGrid` atau `CampaignList` sesuai param `view`.
- **`month-grid.tsx`** (server) — nav ‹ bulan › + "Hari ini" (Link yang ganti
  `searchParams`, no client JS). Grid 7 kolom; tiap baris minggu pakai CSS
  Grid supaya pita multi-hari bisa `grid-column: start / end` mengikuti kolom
  tanggal yang tepat, diklip per baris minggu kalau campaign membentang lebih
  dari satu minggu. Tiap campaign → satu pita per brand (warna dari
  `assignBrandColors`), ditumpuk vertikal max ~3 baris lalu "+N lainnya".
  Kotak tanggal kosong dibungkus `CampaignDialog` (trigger = seluruh kotak,
  prefilled tanggal itu); klik pita buka `CampaignDialog` mode edit.
- **`campaign-list.tsx`** (server) — tabel dikelompokkan per bulan: kolom
  Campaign, Brand (chip warna sama kayak grid), Marketplace (badge), Periode,
  Status (badge), Catatan, Aksi — pola sama `dokumen/page.tsx`.
- **`campaign-dialog.tsx`** (client) — satu komponen buat tambah & edit (pola
  `DocumentDialog`): nama, date-range (`components/ui/calendar.tsx` mode
  range), checkbox list brand (multi), combobox/datalist marketplace (multi,
  bisa tambah baru), textarea catatan.
- **`campaign-filters.tsx`** (client) — filter brand/marketplace/status +
  toggle Grid/List, update `searchParams` (pola sama `document-filters.tsx`).
- **`delete-campaign-button.tsx`** — alert-dialog, pola sama
  `delete-document-button.tsx`.
- **`actions.ts`** — `createCampaign`, `updateCampaign`, `deleteCampaign`:
  validasi → insert/update baris `promo_campaigns` → replace baris di kedua
  tabel junction → `revalidatePath`.

## Data flow

`page.tsx` → `parseCampaignFilters` → `getCampaigns(filters)` (join brand +
marketplace) → `deriveCampaignStatus` per baris → `assignBrandColors(await
listBrands())` → `MonthGrid` (pakai `getMonthGrid` buat kerangka tanggal bulan
aktif, overlay campaign yang overlap bulan itu) atau `CampaignList`. Submit
dialog → server action (validate → tulis 3 tabel) → `revalidatePath` → dialog
close, halaman re-render dengan data baru.

## Error handling

Validasi di action boundary: nama wajib, `endDate >= startDate`, minimal 1
brand dipilih. Error tampil di form state dalam dialog, pola sama
`DocumentDialog`.

## Responsive & accessibility

Grid 7-kolom kurang kebaca di layar sempit — default ke **List view** di
mobile (masih bisa toggle manual ke Grid). Dialog, checkbox, combobox pakai
komponen kit yang sudah accessible (`Dialog`, `Checkbox`, `Command`/
`Popover` buat combobox).

## Testing

- `lib/__tests__/promo-campaigns.test.ts` — `validateCampaignInput`,
  `parseCampaignFilters`, `deriveCampaignStatus` (3 kondisi status + edge
  case tanggal sama dengan hari ini).
- `lib/__tests__/dates.test.ts` (baru) — `getMonthGrid` (jumlah minggu benar,
  leading/trailing days dari bulan sebelum/sesudah benar).
- Smoke render test buat `MonthGrid`/`CampaignList`, pola sama
  `smoke.test.ts` yang sudah ada.

## New files / dependencies

Tidak ada npm dependency baru — `date-fns` dan `components/ui/calendar.tsx`
(react-day-picker) sudah terpasang. File baru sesuai daftar di atas.
`lib/chart-colors.ts` dan `lib/dates.ts` di-**extend**, bukan diganti.

## Out of scope (YAGNI)

- Campaign berulang/tahunan (mis. auto-generate "11.11" tiap tahun) — input
  manual tiap kali dulu.
- Notifikasi/reminder H-sekian-hari sebelum campaign mulai.
- Drag-to-resize atau drag-to-move pita langsung di grid — edit tanggal lewat
  form di dialog.
- Collision-packing ala Google Calendar buat pita brand yang **sama**
  bertumpuk (misal 2 campaign brand sama, tanggal overlap) — kasus jarang di
  skala harian, cukup ditumpuk vertikal berurutan tanggal mulai.
- Kalender deadline konten/kreatif — fitur terpisah, di luar scope ini.
