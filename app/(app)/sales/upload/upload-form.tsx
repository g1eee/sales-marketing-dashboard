"use client";

import { useState, useTransition } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { previewUpload, commitUpload } from "./actions";
import type { UploadPreview } from "@/lib/sales/upload";
import type { Brand } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPeriodRange } from "@/lib/dates";

export function UploadForm({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  async function onPreview(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      setPreview(await previewUpload(formData));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses file");
    }
  }

  function onSave() {
    if (!preview) return;
    start(async () => {
      try {
        await commitUpload(preview);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  const brandItems = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-4">
      <Card className="p-6 shadow-soft">
        <form action={onPreview} className="space-y-5">
          <input type="hidden" name="brandId" value={brandId} />

          <div className="space-y-2">
            <Label>Brand</Label>
            <Select
              items={brandItems}
              value={brandId}
              onValueChange={(v) => setBrandId(v ?? "")}
            >
              <SelectTrigger className="w-full">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">File Shopee</Label>
            <div className="relative">
              <input
                id="files"
                type="file"
                name="files"
                multiple
                accept=".xlsx,.csv"
                required
                onChange={(e) =>
                  setFileNames(
                    Array.from(e.target.files ?? []).map((f) => f.name),
                  )
                }
                className="absolute inset-0 z-10 cursor-pointer opacity-0"
              />
              <div className="pointer-events-none flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UploadCloud className="size-5" />
                </span>
                <span className="text-sm font-medium">
                  Tarik file ke sini atau klik untuk pilih
                </span>
                <span className="text-xs text-muted-foreground">
                  Global, Produk, Ads · .xlsx atau .csv · urutan bebas
                </span>
              </div>
            </div>
            {fileNames.length > 0 && (
              <ul className="space-y-1 pt-1">
                {fileNames.map((n) => (
                  <li
                    key={n}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <FileSpreadsheet className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" disabled={!brandId || fileNames.length === 0}>
            Proses & Pratinjau
          </Button>
        </form>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {preview && (
        <Card className="p-6 shadow-soft">
          <h2 className="mb-3 font-heading text-base font-medium">Pratinjau</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Stat
              label="Periode"
              value={
                preview.period
                  ? formatPeriodRange(preview.period.start, preview.period.end)
                  : "tidak terbaca"
              }
              wide
            />
            <Stat
              label="Data harian"
              value={`${preview.global?.daily.length ?? 0} baris`}
            />
            <Stat label="Produk" value={`${preview.product?.summary.length ?? 0}`} />
            <Stat label="Iklan" value={`${preview.ads?.length ?? 0}`} />
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={onSave} disabled={pending || !preview.period}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-primary">
                <CheckCircle2 className="size-4" />
                Tersimpan — data periode ini diperbarui.
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
