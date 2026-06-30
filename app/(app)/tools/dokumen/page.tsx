import Link from "next/link";
import { ExternalLink, FileText, Pencil } from "lucide-react";
import { listBrands } from "@/lib/brands";
import { getDocuments, getDocTypes, parseDocumentFilters } from "@/lib/documents";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import { DocumentDialog } from "./document-dialog";
import { DocumentFilters } from "./document-filters";
import { DeleteDocumentButton } from "./delete-document-button";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default async function DokumenPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; month?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const filters = parseDocumentFilters(sp);
  const [docs, brands, docTypes] = await Promise.all([
    getDocuments(filters),
    listBrands(),
    getDocTypes(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dokumen"
        description="Registry link spreadsheet & dokumen per jenis, brand, dan periode."
        actions={
          <DocumentDialog
            brands={brands}
            docTypes={docTypes}
            trigger={<Button>+ Tambah Dokumen</Button>}
          />
        }
      />

      <DocumentFilters
        brands={brands}
        brand={sp.brand ?? "all"}
        month={sp.month ?? "all"}
        year={sp.year ?? "all"}
      />

      {docs.length === 0 ? (
        <Empty className="min-h-[40vh] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>Belum ada dokumen</EmptyTitle>
            <EmptyDescription>
              Tambah link spreadsheet/dokumen lewat tombol di atas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jenis</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Badge variant="secondary">{d.docType}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {d.title}
                      <ExternalLink className="size-3.5 opacity-60" />
                    </Link>
                  </TableCell>
                  <TableCell>{d.brandName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {MONTHS[d.month - 1]} {d.year}
                  </TableCell>
                  <TableCell className="max-w-50 truncate text-muted-foreground">
                    {d.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DocumentDialog
                        brands={brands}
                        docTypes={docTypes}
                        doc={d}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Edit">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <DeleteDocumentButton id={d.id} label={d.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
