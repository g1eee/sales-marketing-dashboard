-- Promo campaign calendar (chunk 5): campaigns spanning many brands + marketplaces.
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
