"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { X, CalendarIcon } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignRow, CampaignInput } from "@/lib/promo-campaigns";
import { createCampaign, updateCampaign } from "./actions";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function toRange(startDate?: string, endDate?: string): DateRange | undefined {
  if (!startDate) return undefined;
  return {
    from: new Date(`${startDate}T00:00:00`),
    to: new Date(`${endDate ?? startDate}T00:00:00`),
  };
}

export function CampaignDialog({
  brands,
  marketplaceOptions,
  campaign,
  defaultDate,
  trigger,
}: {
  brands: Brand[];
  marketplaceOptions: string[];
  campaign?: CampaignRow;
  defaultDate?: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [name, setName] = useState(campaign?.name ?? "");
  const [notes, setNotes] = useState(campaign?.notes ?? "");
  const [brandIds, setBrandIds] = useState<string[]>(campaign?.brands.map((b) => b.id) ?? []);
  const [marketplaces, setMarketplaces] = useState<string[]>(campaign?.marketplaces ?? []);
  const [marketplaceInput, setMarketplaceInput] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(
    toRange(campaign?.startDate ?? defaultDate, campaign?.endDate ?? defaultDate),
  );

  function toggleBrand(id: string) {
    setBrandIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function addMarketplace() {
    const v = marketplaceInput.trim();
    if (v && !marketplaces.includes(v)) setMarketplaces((prev) => [...prev, v]);
    setMarketplaceInput("");
  }

  function removeMarketplace(v: string) {
    setMarketplaces((prev) => prev.filter((m) => m !== v));
  }

  function submit() {
    setError(null);
    if (!range?.from) {
      setError("Tanggal mulai wajib diisi.");
      return;
    }
    const input: CampaignInput = {
      name,
      startDate: format(range.from, "yyyy-MM-dd"),
      endDate: format(range.to ?? range.from, "yyyy-MM-dd"),
      notes,
      brandIds,
      marketplaces,
    };
    start(async () => {
      try {
        if (campaign) await updateCampaign(campaign.id, input);
        else await createCampaign(input);
        setOpen(false);
        if (!campaign) {
          setName("");
          setNotes("");
          setBrandIds([]);
          setMarketplaces([]);
          setRange(undefined);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyimpan");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit Campaign" : "Tambah Campaign"}</DialogTitle>
          <DialogDescription>
            Jadwal promo untuk satu atau beberapa brand & marketplace.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nama Campaign</Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="11.11 Big Sale"
            />
          </div>

          <div className="space-y-2">
            <Label>Rentang Tanggal</Label>
            <Popover>
              <PopoverTrigger>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="size-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, "d MMM yyyy")} – ${format(range.to, "d MMM yyyy")}`
                      : format(range.from, "d MMM yyyy")
                    : "Pilih tanggal…"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar mode="range" selected={range} onSelect={setRange} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border p-2">
              {brands.map((b) => (
                <Field key={b.id} orientation="horizontal">
                  <FieldLabel>
                    <Checkbox
                      checked={brandIds.includes(b.id)}
                      onCheckedChange={() => toggleBrand(b.id)}
                    />
                    <FieldTitle>{b.name}</FieldTitle>
                  </FieldLabel>
                </Field>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace-input">Marketplace</Label>
            <div className="flex gap-2">
              <Input
                id="marketplace-input"
                list="marketplace-options"
                value={marketplaceInput}
                onChange={(e) => setMarketplaceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMarketplace();
                  }
                }}
                placeholder="Shopee, TikTok Shop, …"
              />
              <datalist id="marketplace-options">
                {marketplaceOptions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <Button type="button" variant="outline" onClick={addMarketplace}>
                Tambah
              </Button>
            </div>
            {marketplaces.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {marketplaces.map((m) => (
                  <Badge key={m} variant="secondary" className="gap-1">
                    {m}
                    <button type="button" onClick={() => removeMarketplace(m)} aria-label={`Hapus ${m}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-notes">Catatan</Label>
            <Textarea
              id="campaign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
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
