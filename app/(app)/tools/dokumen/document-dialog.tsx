"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import type { Brand } from "@/lib/brands";
import type { DocumentRow, DocumentInput } from "@/lib/documents";
import { createDocument, updateDocument } from "./actions";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const NOW = new Date();

export function DocumentDialog({
  brands,
  docTypes,
  doc,
  trigger,
}: {
  brands: Brand[];
  docTypes: string[];
  doc?: DocumentRow;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [brandId, setBrandId] = useState(doc?.brandId ?? "");
  const [docType, setDocType] = useState(doc?.docType ?? "");
  const [title, setTitle] = useState(doc?.title ?? "");
  const [url, setUrl] = useState(doc?.url ?? "");
  const [month, setMonth] = useState(String(doc?.month ?? NOW.getMonth() + 1));
  const [year, setYear] = useState(String(doc?.year ?? NOW.getFullYear()));
  const [notes, setNotes] = useState(doc?.notes ?? "");

  const brandItems = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const monthItems = Object.fromEntries(MONTHS.map((m, i) => [String(i + 1), m]));

  function submit() {
    setError(null);
    const input: DocumentInput = {
      brandId,
      docType,
      title,
      url,
      month: Number(month),
      year: Number(year),
      notes,
    };
    start(async () => {
      try {
        if (doc) await updateDocument(doc.id, input);
        else await createDocument(input);
        setOpen(false);
        if (!doc) {
          setDocType("");
          setTitle("");
          setUrl("");
          setNotes("");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{doc ? "Edit Dokumen" : "Tambah Dokumen"}</DialogTitle>
          <DialogDescription>Simpan link ke dokumen eksternal.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select items={brandItems} value={brandId} onValueChange={(v) => setBrandId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih brand…" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docType">Jenis</Label>
            <Input
              id="docType"
              list="doc-types"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="Tracking Harian, Report Spreadsheet, …"
            />
            <datalist id="doc-types">
              {docTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Link / URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bulan</Label>
              <Select items={monthItems} value={month} onValueChange={(v) => setMonth(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Tahun</Label>
              <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Batal</Button>} />
          <Button onClick={submit} disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
