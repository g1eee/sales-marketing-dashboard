-- Enums
create type user_role as enum ('admin', 'sales', 'marketing');
create type order_status as enum ('dibuat', 'siap_dikirim', 'dibayar');
create type design_status as enum ('baru', 'dikerjakan', 'review', 'revisi', 'selesai');

-- Profiles (1:1 with auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'sales',
  created_at timestamptz not null default now()
);

-- Auto-create a profile row on new auth user
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Brands (managed list)
create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Report periods (parent of all sales data for one upload)
create table report_periods (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  platform text not null default 'shopee',
  period_start date not null,
  period_end date not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (brand_id, platform, period_start, period_end)
);

-- Daily global metrics (per period, per date, per order status)
create table global_daily (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  date date not null,
  status order_status not null,
  total_penjualan bigint not null default 0,      -- rupiah
  total_pesanan integer not null default 0,
  penjualan_per_pesanan bigint not null default 0,-- rupiah
  produk_diklik integer,
  total_pengunjung integer,
  konversi numeric(7,4),                          -- fraction, e.g. 0.0274 = 2.74%
  pesanan_dibatalkan integer,
  unique (period_id, date, status)
);

-- Source breakdown (per period)
create table global_source (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  source text not null,            -- 'halaman_produk' | 'live' | 'video' | 'affiliate' | 'iklan_shopee'
  penjualan bigint not null default 0,
  unique (period_id, source)
);

-- Product summary (per period, per product)
create table product_summary (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  kode_produk text not null,
  product_name text not null default '',
  penjualan bigint not null default 0,
  dilihat integer,
  diklik integer,
  total_pesanan integer,
  persentase_klik numeric(7,4),
  konversi numeric(7,4),
  total_pembeli integer,
  extra jsonb not null default '{}'::jsonb,
  unique (period_id, kode_produk)
);

-- Product detail (per period, per product + variation)
create table product_detail (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  kode_produk text not null,
  kode_variasi text not null default '-',
  nama_variasi text not null default '-',
  sku_induk text,
  penjualan bigint not null default 0,
  dilihat integer,
  diklik integer,
  konversi numeric(7,4),
  extra jsonb not null default '{}'::jsonb,
  unique (period_id, kode_produk, kode_variasi)
);

-- Ads summary (per period, per ad)
create table ads_summary (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references report_periods(id) on delete cascade,
  nama_iklan text not null,
  status text,
  jenis_iklan text,
  dilihat integer,
  klik integer,
  ctr numeric(7,4),
  add_to_cart integer,
  konversi integer,
  cvr numeric(7,4),
  biaya_per_konversi bigint,
  produk_terjual integer,
  omzet bigint,
  biaya bigint,
  roas numeric(10,2),
  acos numeric(7,4),
  voucher bigint,
  extra jsonb not null default '{}'::jsonb,
  unique (period_id, nama_iklan)
);

-- Design requests (marketing task tracker)
create table design_requests (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete set null,
  asset_type text not null,
  title text not null,
  brief text not null default '',
  deadline date,
  status design_status not null default 'baru',
  result_link text,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
