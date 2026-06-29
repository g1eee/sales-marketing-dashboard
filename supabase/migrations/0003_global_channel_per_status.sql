-- Per-order-type per-channel performance (replaces 0002's global_channel).
-- Channel metrics come from the 3 visit-source sheets (Asal/Sumber Kunjungan),
-- one per order status, so Performance follows the status toggle.
-- Run in the Supabase SQL editor, then re-upload the 3 Shopee files.

drop table if exists global_channel;

create table global_channel (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  status order_status not null,
  channel text not null,           -- 'halaman_produk' | 'live' | 'video' | 'affiliate'
  penjualan bigint not null default 0,
  dilihat bigint,                  -- Jumlah Produk Dilihat
  diklik bigint,                   -- Produk Diklik
  unik_dilihat bigint,             -- Produk Unik Dilihat
  unik_diklik bigint,              -- Produk Unik Diklik
  ctr numeric(10,4),               -- Persentase Klik (can exceed 100% for Live)
  cvr numeric(7,4),                -- Tingkat Konversi Pesanan
  pesanan integer,
  pembeli integer,
  unique (period_id, status, channel)
);

alter table global_channel enable row level security;
create policy global_channel_authenticated_all on global_channel
  for all to authenticated using (true) with check (true);
