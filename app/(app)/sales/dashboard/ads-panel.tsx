import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "./export-button";
import { formatPercent, formatRupiah } from "@/lib/analytics/format";
import { toCsv } from "@/lib/analytics/csv";
import type { AdsRow } from "@/lib/parsers/types";

const TOP_N = 15;

function formatRoas(roas: number | null): string {
  if (roas === null) return "—";
  return `${roas.toFixed(2).replace(".", ",")}×`;
}

export function AdsPanel({ ads }: { ads: AdsRow[] }) {
  const biaya = ads.reduce((s, a) => s + (a.biaya ?? 0), 0);
  const omzet = ads.reduce((s, a) => s + (a.omzet ?? 0), 0);
  const roas = biaya > 0 ? omzet / biaya : null;
  const acos = omzet > 0 ? biaya / omzet : null;

  const csv = toCsv(
    ["Iklan", "Status", "Biaya", "Omzet", "ROAS", "ACOS", "CTR", "Konversi"],
    ads.map((a) => [
      a.nama_iklan,
      a.status,
      a.biaya,
      a.omzet,
      a.roas,
      a.acos,
      a.ctr,
      a.konversi,
    ]),
  );

  const stats = [
    { label: "Biaya Iklan", value: formatRupiah(biaya), tone: "amber" as const },
    { label: "Omzet dari Iklan", value: formatRupiah(omzet), tone: "ink" as const },
    { label: "ROAS (blended)", value: formatRoas(roas), tone: "emerald" as const },
    { label: "ACOS (blended)", value: formatPercent(acos), tone: "ink" as const },
  ];
  const toneClass = {
    amber: "text-[var(--chart-4)]",
    emerald: "text-primary",
    ink: "text-foreground",
  };

  const top = ads.slice(0, TOP_N);

  return (
    <Card className="p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-medium">Performa Iklan</h2>
          <p className="text-xs text-muted-foreground">
            {ads.length} iklan · {Math.min(TOP_N, ads.length)} teratas menurut omzet
          </p>
        </div>
        {ads.length > 0 && <ExportButton filename="iklan.csv" csv={csv} />}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg bg-secondary/60 px-4 py-3 ring-1 ring-foreground/5"
          >
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p
              className={`mt-1 font-mono text-xl font-semibold tabular-nums ${toneClass[s.tone]}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Iklan</TableHead>
            <TableHead className="text-right">Biaya</TableHead>
            <TableHead className="text-right">Omzet</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="text-right">CTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
                Tidak ada data iklan.
              </TableCell>
            </TableRow>
          )}
          {top.map((a) => (
            <TableRow key={a.nama_iklan}>
              <TableCell className="max-w-[24rem] whitespace-normal">
                <span className="line-clamp-2 font-medium" title={a.nama_iklan}>
                  {a.nama_iklan}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatRupiah(a.biaya ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatRupiah(a.omzet ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatRoas(a.roas)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatPercent(a.ctr)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
