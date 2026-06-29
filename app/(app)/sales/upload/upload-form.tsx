"use client";

import { useState, useTransition } from "react";
import { previewUpload, commitUpload } from "./actions";
import type { UploadPreview } from "@/lib/sales/upload";
import type { Brand } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UploadForm({ brands }: { brands: Brand[] }) {
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
      <form action={onPreview} className="space-y-3">
        <select name="brandId" required className="w-full rounded border p-2">
          <option value="">Pilih brand…</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input type="file" name="files" multiple accept=".xlsx,.csv" required
               className="block w-full text-sm" />
        <Button type="submit">Proses & Pratinjau</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {preview && (
        <Card className="space-y-2 p-4 text-sm">
          <p>Periode: <b>{preview.period ? `${preview.period.start} → ${preview.period.end}` : "tidak terbaca"}</b></p>
          <p>Data global harian: <b>{preview.global?.daily.length ?? 0}</b> baris</p>
          <p>Produk: <b>{preview.product?.summary.length ?? 0}</b> (variasi {preview.product?.detail.length ?? 0})</p>
          <p>Iklan: <b>{preview.ads?.length ?? 0}</b></p>
          <Button onClick={onSave} disabled={pending || !preview.period}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
          {saved && <p className="text-sm text-green-600">Tersimpan. Data periode ini telah diperbarui.</p>}
        </Card>
      )}
    </div>
  );
}
