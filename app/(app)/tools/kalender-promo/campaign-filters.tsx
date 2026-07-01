"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignStatus } from "@/lib/promo-campaigns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ALL = "all";
const STATUS_LABEL: Record<CampaignStatus, string> = {
  planned: "Planned",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

export function CampaignFilters({
  brands,
  marketplaceOptions,
  brand,
  marketplace,
  status,
  view,
  year,
  month,
}: {
  brands: Brand[];
  marketplaceOptions: string[];
  brand: string;
  marketplace: string;
  status: string;
  view: string;
  year: number;
  month: number;
}) {
  const router = useRouter();

  function nav(next: Partial<{ brand: string; marketplace: string; status: string; view: string }>) {
    const m = { brand, marketplace, status, view, ...next };
    const params = new URLSearchParams();
    if (m.brand !== ALL) params.set("brand", m.brand);
    if (m.marketplace !== ALL) params.set("marketplace", m.marketplace);
    if (m.status !== ALL) params.set("status", m.status);
    params.set("view", m.view);
    params.set("year", String(year));
    params.set("month", String(month));
    router.push(`/tools/kalender-promo?${params.toString()}`);
  }

  const brandItems = { [ALL]: "Semua brand", ...Object.fromEntries(brands.map((b) => [b.id, b.name])) };
  const marketplaceItems = {
    [ALL]: "Semua marketplace",
    ...Object.fromEntries(marketplaceOptions.map((m) => [m, m])),
  };
  const statusItems = { [ALL]: "Semua status", ...STATUS_LABEL };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        <Select items={brandItems} value={brand} onValueChange={(v) => nav({ brand: v ?? ALL })}>
          <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua brand</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          items={marketplaceItems}
          value={marketplace}
          onValueChange={(v) => nav({ marketplace: v ?? ALL })}
        >
          <SelectTrigger className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua marketplace</SelectItem>
            {marketplaceOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select items={statusItems} value={status} onValueChange={(v) => nav({ status: v ?? ALL })}>
          <SelectTrigger className="min-w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Semua status</SelectItem>
            {(Object.keys(STATUS_LABEL) as CampaignStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-1 rounded-md border p-0.5">
        <Button variant={view === "list" ? "ghost" : "secondary"} size="sm" onClick={() => nav({ view: "grid" })}>
          <LayoutGrid className="size-4" /> Grid
        </Button>
        <Button variant={view === "list" ? "secondary" : "ghost"} size="sm" onClick={() => nav({ view: "list" })}>
          <List className="size-4" /> List
        </Button>
      </div>
    </div>
  );
}
