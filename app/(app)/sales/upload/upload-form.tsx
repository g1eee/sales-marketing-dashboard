"use client";

import { useState, useTransition } from "react";
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

export function UploadForm({ brands }: { brands: Brand[] }) {
  const [brandId, setBrandId] = useState("");
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

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form action={onPreview} className="space-y-4">
          <input type="hidden" name="brandId" value={brandId} />
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select
              value={brandId}
              onValueChange={(value) => setBrandId(value ?? "")}
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
            <Label htmlFor="files">File (Global, Produk, Ads)</Label>
            <input
              id="files"
              type="file"
              name="files"
              multiple
              accept=".xlsx,.csv"
              required
              className="border-input file:text-foreground block w-full rounded-md border bg-transparent text-sm file:mr-3 file:border-0 file:bg-transparent file:py-2 file:font-medium"
            />
          </div>
          <Button type="submit" disabled={!brandId}>
            Proses & Pratinjau
          </Button>
        </form>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {preview && (
        <Card className="space-y-2 p-5 text-sm">
          <p>
            Periode:{" "}
            <b>
              {preview.period
                ? `${preview.period.start} → ${preview.period.end}`
                : "tidak terbaca"}
            </b>
          </p>
          <p>
            Data global harian: <b>{preview.global?.daily.length ?? 0}</b> baris
          </p>
          <p>
            Produk: <b>{preview.product?.summary.length ?? 0}</b> (variasi{" "}
            {preview.product?.detail.length ?? 0})
          </p>
          <p>
            Iklan: <b>{preview.ads?.length ?? 0}</b>
          </p>
          <Button onClick={onSave} disabled={pending || !preview.period}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
          {saved && (
            <p className="text-sm text-green-600 dark:text-green-500">
              Tersimpan. Data periode ini telah diperbarui.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
