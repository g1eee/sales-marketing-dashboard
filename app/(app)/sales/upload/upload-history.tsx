import Link from "next/link";
import { Database, ExternalLink } from "lucide-react";
import { getUploadHistory } from "@/lib/sales/history";
import { formatPeriodRange } from "@/lib/dates";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { DeleteUploadButton } from "./delete-upload-button";

// ponytail: no brand filter in v1 — list is sorted newest-first and brands are
// few. Add a filter (reui/filters) once the history grows long enough to need it.
export async function UploadHistory() {
  const rows = await getUploadHistory();

  if (rows.length === 0) {
    return (
      <Empty className="min-h-[30vh] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Database />
          </EmptyMedia>
          <EmptyTitle>Belum ada upload</EmptyTitle>
          <EmptyDescription>
            Upload file Shopee di atas — riwayatnya muncul di sini.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Brand</TableHead>
            <TableHead>Platform</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Diupload oleh</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const period = formatPeriodRange(r.periodStart, r.periodEnd);
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.brandName}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {r.platform}
                  </Badge>
                </TableCell>
                <TableCell>{period}</TableCell>
                <TableCell className="max-w-50 truncate text-muted-foreground">
                  {r.sourceFiles.length ? r.sourceFiles.join(", ") : "—"}
                </TableCell>
                <TableCell>{r.uploaderName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("id-ID")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/sales/dashboard?brand=${r.brandId}&period=${r.id}`}
                      aria-label="Lihat di dashboard"
                      className={buttonVariants({ variant: "ghost", size: "icon" })}
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                    <DeleteUploadButton id={r.id} label={`${r.brandName} · ${period}`} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
