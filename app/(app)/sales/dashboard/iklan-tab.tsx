import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "./stat-card";
import { ExportButton } from "./export-button";
import { pctChange } from "@/lib/analytics/compare";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import { toCsv } from "@/lib/analytics/csv";
import type { IklanData } from "@/lib/sales/dashboard-data";
import type { AdsRow } from "@/lib/parsers/types";

const num = (x: number | null | undefined) => (typeof x === "number" ? x : 0);
const roasStr = (r: number | null) =>
  r === null ? "—" : `${r.toFixed(2).replace(".", ",")}×`;

function AdTable({ rows }: { rows: AdsRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Iklan</TableHead>
          <TableHead className="text-right">Biaya</TableHead>
          <TableHead className="text-right">Omzet</TableHead>
          <TableHead className="text-right">ROAS</TableHead>
          <TableHead className="text-right">ACOS</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-8 text-center text-muted-foreground"
            >
              Tidak ada data iklan.
            </TableCell>
          </TableRow>
        )}
        {rows.map((a) => (
          <TableRow key={a.nama_iklan}>
            <TableCell className="max-w-[24rem] whitespace-normal">
              <span className="line-clamp-2 font-medium" title={a.nama_iklan}>
                {a.nama_iklan}
              </span>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatRupiah(num(a.biaya))}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatRupiah(num(a.omzet))}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {roasStr(a.roas)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatPercent(a.acos)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function IklanTab({ data }: { data: IklanData }) {
  const { ads, current, previous } = data;
  const d = (cur: number, prev: number | null | undefined) =>
    previous ? pctChange(cur, prev ?? null) : undefined;

  const csv = toCsv(
    ["Iklan", "Status", "Mode Bidding", "Biaya", "Omzet", "ROAS", "ACOS", "CTR", "Konversi"],
    ads.map((a) => [
      a.nama_iklan,
      a.status,
      a.extra?.mode_bidding ?? null,
      a.biaya,
      a.omzet,
      a.roas,
      a.acos,
      a.ctr,
      a.konversi,
    ]),
  );

  const modes = new Map<string, { biaya: number; omzet: number; n: number }>();
  for (const a of ads) {
    const m = a.extra?.mode_bidding ?? "Lainnya";
    const cur = modes.get(m) ?? { biaya: 0, omzet: 0, n: 0 };
    cur.biaya += num(a.biaya);
    cur.omzet += num(a.omzet);
    cur.n += 1;
    modes.set(m, cur);
  }
  const modeRows = [...modes.entries()]
    .map(([mode, v]) => ({
      mode,
      ...v,
      roas: v.biaya > 0 ? v.omzet / v.biaya : null,
    }))
    .sort((a, b) => b.biaya - a.biaya);

  const top = ads.slice(0, 15);
  const boros = ads
    .filter((a) => num(a.biaya) > 0 && a.roas !== null)
    .sort((a, b) => (a.roas as number) - (b.roas as number))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Biaya Iklan"
          value={formatRupiah(current.biaya)}
          delta={d(current.biaya, previous?.biaya)}
        />
        <StatCard
          label="Omzet dari Iklan"
          value={formatRupiah(current.omzet)}
          delta={d(current.omzet, previous?.omzet)}
        />
        <StatCard
          label="ROAS"
          value={roasStr(current.roas)}
          delta={d(num(current.roas), previous?.roas)}
        />
        <StatCard
          label="ACOS"
          value={formatPercent(current.acos)}
          delta={d(num(current.acos), previous?.acos)}
          invertDelta
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 shadow-soft">
          <h2 className="mb-4 font-heading text-base font-medium">
            Funnel & Efisiensi
          </h2>
          <dl className="space-y-3">
            {[
              { k: "CTR (klik / tayang)", v: formatPercent(current.ctr) },
              { k: "CVR (konversi / klik)", v: formatPercent(current.cvr) },
              { k: "Total Klik", v: formatInt(current.klik) },
              { k: "Total Tayang", v: formatInt(current.dilihat) },
              { k: "Total Konversi", v: formatInt(current.konversi) },
            ].map((s) => (
              <div
                key={s.k}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <dt className="text-muted-foreground">{s.k}</dt>
                <dd className="font-mono tabular-nums">{s.v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-5 shadow-soft lg:col-span-2">
          <h2 className="mb-3 font-heading text-base font-medium">
            Perbandingan Mode Bidding
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Iklan</TableHead>
                <TableHead className="text-right">Biaya</TableHead>
                <TableHead className="text-right">Omzet</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modeRows.map((m) => (
                <TableRow key={m.mode}>
                  <TableCell className="font-medium">{m.mode}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatInt(m.n)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatRupiah(m.biaya)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatRupiah(m.omzet)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {roasStr(m.roas)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className="p-5 shadow-soft sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-medium">Semua Iklan</h2>
            <p className="text-xs text-muted-foreground">
              {ads.length} iklan · {Math.min(15, ads.length)} teratas menurut omzet
            </p>
          </div>
          {ads.length > 0 && <ExportButton filename="iklan.csv" csv={csv} />}
        </div>
        <AdTable rows={top} />
      </Card>

      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="mb-1 font-heading text-base font-medium">
          Iklan Boros (ROAS terendah)
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Belanja jalan tapi ROAS rendah — kandidat dipangkas atau dioptimasi
        </p>
        <AdTable rows={boros} />
      </Card>
    </div>
  );
}
