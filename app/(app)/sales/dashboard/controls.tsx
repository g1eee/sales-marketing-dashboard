"use client";

import { useRouter } from "next/navigation";
import type { Brand } from "@/lib/brands";
import type { PeriodRef } from "@/lib/sales/dashboard-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPeriodRange } from "@/lib/dates";

const STATUS_LABELS: Record<string, string> = {
  dibuat: "Pesanan Dibuat",
  siap_dikirim: "Siap Dikirim",
  dibayar: "Dibayar",
};

const fmtPeriod = (p: PeriodRef) =>
  formatPeriodRange(p.period_start, p.period_end);

export function Controls({
  brands,
  periods,
  brandId,
  periodId,
  compareId,
  status,
}: {
  brands: Brand[];
  periods: PeriodRef[];
  brandId?: string;
  periodId?: string;
  compareId?: string;
  status: string;
}) {
  const router = useRouter();

  function navigate(next: {
    brand?: string | null;
    period?: string | null;
    compare?: string | null;
    status?: string | null;
  }) {
    const merged = {
      brand: next.brand !== undefined ? next.brand : brandId,
      period: next.period !== undefined ? next.period : periodId,
      compare: next.compare !== undefined ? next.compare : compareId,
      status: next.status !== undefined ? next.status : status,
    };
    // Cascade: a new brand invalidates period + comparison; a new period the comparison.
    if (next.brand !== undefined) {
      merged.period = null;
      merged.compare = null;
    }
    if (next.period !== undefined) merged.compare = null;

    const q = new URLSearchParams();
    if (merged.brand) q.set("brand", merged.brand);
    if (merged.period) q.set("period", merged.period);
    if (merged.compare) q.set("compare", merged.compare);
    if (merged.status && merged.status !== "dibuat") q.set("status", merged.status);
    router.push(`/sales/dashboard?${q.toString()}`);
  }

  const comparePeriods = periods.filter((p) => p.id !== periodId);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={brandId ?? ""} onValueChange={(v) => navigate({ brand: v })}>
        <SelectTrigger className="min-w-40">
          <SelectValue placeholder="Pilih brand…" />
        </SelectTrigger>
        <SelectContent>
          {brands.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={periodId ?? ""}
        onValueChange={(v) => navigate({ period: v })}
        disabled={!brandId}
      >
        <SelectTrigger className="min-w-48">
          <SelectValue placeholder="Pilih periode…" />
        </SelectTrigger>
        <SelectContent>
          {periods.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {fmtPeriod(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={compareId ?? ""}
        onValueChange={(v) => navigate({ compare: v })}
        disabled={!periodId}
      >
        <SelectTrigger className="min-w-48">
          <SelectValue placeholder="Tanpa pembanding" />
        </SelectTrigger>
        <SelectContent>
          {comparePeriods.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              vs {fmtPeriod(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => navigate({ status: v ?? "dibuat" })}>
        <SelectTrigger className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
