-- Document-link registry (chunk 3): external doc links per brand + bulan/tahun.
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
