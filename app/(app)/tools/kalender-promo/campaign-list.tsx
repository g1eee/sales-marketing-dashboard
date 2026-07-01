import { CalendarRange, Pencil } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignRow, CampaignStatus } from "@/lib/promo-campaigns";
import { formatPeriodRange } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CampaignDialog } from "./campaign-dialog";
import { DeleteCampaignButton } from "./delete-campaign-button";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const STATUS_LABEL: Record<CampaignStatus, string> = {
  planned: "Planned",
  berjalan: "Berjalan",
  selesai: "Selesai",
};
const STATUS_VARIANT: Record<CampaignStatus, "outline" | "default" | "secondary"> = {
  planned: "outline",
  berjalan: "default",
  selesai: "secondary",
};

export function CampaignList({
  campaigns,
  brands,
  marketplaceOptions,
  brandColors,
}: {
  campaigns: CampaignRow[];
  brands: Brand[];
  marketplaceOptions: string[];
  brandColors: Map<string, string>;
}) {
  if (campaigns.length === 0) {
    return (
      <Empty className="min-h-[40vh] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarRange />
          </EmptyMedia>
          <EmptyTitle>Belum ada campaign</EmptyTitle>
          <EmptyDescription>Tambah jadwal promo lewat tombol di atas.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = new Map<string, CampaignRow[]>();
  for (const c of campaigns) {
    const d = new Date(`${c.startDate}T00:00:00`);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([key, rows]) => {
        const [y, m] = key.split("-").map(Number);
        return (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {MONTHS[m]} {y}
            </h3>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Catatan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.brands.map((b) => (
                            <Badge
                              key={b.id}
                              style={{ backgroundColor: brandColors.get(b.id) ?? "#94a3b8" }}
                              className="text-white"
                            >
                              {b.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.marketplaces.map((mp) => (
                            <Badge key={mp} variant="outline">{mp}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPeriodRange(c.startDate, c.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-50 truncate text-muted-foreground">
                        {c.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CampaignDialog
                            brands={brands}
                            marketplaceOptions={marketplaceOptions}
                            campaign={c}
                            trigger={
                              <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`}>
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          <DeleteCampaignButton id={c.id} label={c.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
