"use client";

import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/brands";
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

export function DocumentFilters({
  brands,
  brand,
  month,
  year,
}: {
  brands: Brand[];
  brand: string;
  month: string;
  year: string;
}) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

  function nav(next: { brand?: string; month?: string; year?: string }) {
    const m = { brand, month, year, ...next };
    const params = new URLSearchParams();
    if (m.brand !== ALL) params.set("brand", m.brand);
    if (m.month !== ALL) params.set("month", m.month);
    if (m.year !== ALL) params.set("year", m.year);
    const qs = params.toString();
    router.push(qs ? `/tools/dokumen?${qs}` : "/tools/dokumen");
  }

  const brandItems = { [ALL]: "Semua brand", ...Object.fromEntries(brands.map((b) => [b.id, b.name])) };
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
