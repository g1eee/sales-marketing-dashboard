-- Phase 2 of the Ringkasan tab: per-channel performance + funnel buyer breakdown.
-- Run this in the Supabase SQL editor, then re-upload the 3 Shopee files.

-- 1) Funnel buyers per day per order status (from the daily sheets' columns
--    "Total Pembeli Baru" / "Total Pembeli Saat Ini" / "Total Potensi Pembeli").
alter table global_daily
  add column if not exists pembeli_baru integer,
  add column if not exists pembeli_lama integer,
  add column if not exists potensi_pembeli integer;

-- 2) Per-channel performance (Halaman Produk / Live / Video / Affiliate), parsed
--    from the "Asal Penjualan" sheet's per-channel total rows.
create table if not exists global_channel (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  channel text not null,          -- 'halaman_produk' | 'live' | 'video' | 'affiliate'
  penjualan bigint not null default 0,
  dilihat bigint,                 -- impresi (Jumlah Produk Dilihat)
  diklik bigint,                  -- Produk Diklik
  ctr numeric(7,4),               -- Persentase Klik
  cvr numeric(7,4),               -- Tingkat Konversi Pesanan
  pesanan integer,                -- Total Pesanan
  pembeli integer,                -- Total Pembeli
  unique (period_id, channel)
);

alter table global_channel enable row level security;
create policy global_channel_authenticated_all on global_channel
  for all to authenticated using (true) with check (true);
