"use client";

import Link from "next/link";
import { useState } from "react";
import { createRequest } from "../actions";
import { ASSET_TYPES } from "@/lib/marketing/requests";
import type { Brand } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewRequestForm({ brands }: { brands: Brand[] }) {
  const [assetType, setAssetType] = useState(ASSET_TYPES[0]);
  const [brandId, setBrandId] = useState("");

  const assetItems = Object.fromEntries(ASSET_TYPES.map((a) => [a, a]));
  const brandItems = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  return (
    <form action={createRequest} className="space-y-5">
      <input type="hidden" name="asset_type" value={assetType} />
      <input type="hidden" name="brand_id" value={brandId} />

      <div className="space-y-2">
        <Label>Jenis Aset</Label>
        <Select
          items={assetItems}
          value={assetType}
          onValueChange={(v) => setAssetType(v ?? ASSET_TYPES[0])}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Judul</Label>
        <Input id="title" name="title" required placeholder="mis. Banner Promo 6.6" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brief">Brief / Detail (opsional)</Label>
        <textarea
          id="brief"
          name="brief"
          rows={3}
          placeholder="Warna, ukuran, referensi, copy, dll."
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline (opsional)</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
        <div className="space-y-2">
          <Label>Brand (opsional)</Label>
          <Select
            items={brandItems}
            value={brandId}
            onValueChange={(v) => setBrandId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="—" />
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
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit">Buat Request</Button>
        <Button variant="ghost" render={<Link href="/marketing/requests" />}>
          Batal
        </Button>
      </div>
    </form>
  );
}
