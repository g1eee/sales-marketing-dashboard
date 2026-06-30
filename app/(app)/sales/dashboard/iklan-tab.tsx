"use client";

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
import { Section } from "./section";
import { Paginated } from "./paginated";
import { pctChange } from "@/lib/analytics/compare";
import {
  formatInt,
  formatPercent,
  formatRupiah,
  formatRupiahShort,
} from "@/lib/analytics/format";
import { toCsv } from "@/lib/analytics/csv";
import type { IklanData } from "@/lib/sales/dashboard-data";
import type { AdsRow } from "@/lib/parsers/types";

// Benchmarks: ROAS sehat >= 9; CTR/CVR sehat > 3%.
const ROAS_TARGET = 9;
const CTR_TARGET = 0.03;

const num = (x: number | null | undefined) => (typeof x === "number" ? x : 0);
const roasStr = (r: number | null) =>
  r === null ? "—" : `${r.toFixed(2).replace(".", ",")}×`;

// ponytail: ACOS = biaya / omzet (Shopee's definition, the reciprocal of ROAS).
// Derive it instead of trusting the parsed `acos` column, so it shows correctly
// regardless of source-header quirks.
const acosOf = (a: AdsRow) =>
  num(a.omzet) > 0 ? num(a.biaya) / num(a.omzet) : null;

// CTR/CVR > 3% = bagus (hijau), <= 3% = perlu perhatian (merah).
const benchClass = (frac: number | null) =>
  frac === null
    ? ""
    : frac > CTR_TARGET
      ? "text-green-600 dark:text-green-500"
      : "text-destructive";

function AdTable({
  rows,
  roasRed = false,
  empty = "Tidak ada data iklan.",
}: {
  rows: AdsRow[];
  roasRed?: boolean;
  empty?: string;
}) {
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
              {empty}
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
            <TableCell
              className={`text-right font-mono tabular-nums ${roasRed ? "text-destructive" : ""}`}
            >
              {roasStr(a.roas)}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatPercent(acosOf(a))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Low-CTR watchlist: ads that get impressions but few clicks (weak creative/targeting).
function CtrTable({
  rows,
  empty = "Tidak ada data iklan.",
}: {
  rows: AdsRow[];
  empty?: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Iklan</TableHead>
          <TableHead className="text-right">Dilihat</TableHead>
          <TableHead className="text-right">Klik</TableHead>
          <TableHead className="text-right">CTR</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={4}
              className="py-8 text-center text-muted-foreground"
            >
              {empty}
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
              {formatInt(num(a.dilihat))}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatInt(num(a.klik))}
            </TableCell>
            <TableCell
              className={`text-right font-mono tabular-nums ${benchClass(a.ctr)}`}
            >
              {formatPercent(a.ctr)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MetricCard({
  title,
  items,
}: {
  title: string;
  items: { k: string; v: string; cls?: string }[];
}) {
  return (
    <Card className="p-5 shadow-soft">
      <h2 className="mb-4 font-heading text-base font-medium">{title}</h2>
      <dl className="space-y-3">
        {items.map((s) => (
          <div
            key={s.k}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <dt className="text-muted-foreground">{s.k}</dt>
            <dd className={`font-mono tabular-nums ${s.cls ?? ""}`}>{s.v}</dd>
          </div>
        ))}
      </dl>
    </Card>
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
      acosOf(a),
      a.ctr,
      a.konversi,
    ]),
  );

  // Watchlists: every ad below the benchmark (ROAS < 9 / CTR < 3%), worst first.
  const boros = ads
    .filter((a) => num(a.biaya) > 0 && a.roas !== null && a.roas < ROAS_TARGET)
    .sort((a, b) => (a.roas as number) - (b.roas as number));
  const ctrRendah = ads
    .filter((a) => num(a.dilihat) > 0 && a.ctr !== null && a.ctr < CTR_TARGET)
    .sort((a, b) => (a.ctr as number) - (b.ctr as number));

  return (
    <div className="space-y-8">
      <Section title="Ringkasan Iklan">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Biaya Iklan"
            value={formatRupiahShort(current.biaya)}
            detail={formatRupiah(current.biaya)}
            delta={d(current.biaya, previous?.biaya)}
          />
          <StatCard
            label="Omzet dari Iklan"
            value={formatRupiahShort(current.omzet)}
            detail={formatRupiah(current.omzet)}
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
          <StatCard
            label="Biaya / Konversi"
            value={
              current.biaya_per_konversi === null
                ? "—"
                : formatRupiahShort(current.biaya_per_konversi)
            }
            detail={
              current.biaya_per_konversi === null
                ? undefined
                : formatRupiah(current.biaya_per_konversi)
            }
            delta={d(
              num(current.biaya_per_konversi),
              previous?.biaya_per_konversi,
            )}
            invertDelta
          />
        </div>
      </Section>

      <Section title="Traffic dan Funnel">
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            title="Traffic"
            items={[
              { k: "Dilihat", v: formatInt(current.dilihat) },
              { k: "Diklik", v: formatInt(current.klik) },
              {
                k: "CTR (klik / tayang)",
                v: formatPercent(current.ctr),
                cls: benchClass(current.ctr),
              },
            ]}
          />
          <MetricCard
            title="Funnel"
            items={[
              { k: "Add to Cart", v: formatInt(current.add_to_cart) },
              { k: "Konversi", v: formatInt(current.konversi) },
              {
                k: "CVR (konversi / klik)",
                v: formatPercent(current.cvr),
                cls: benchClass(current.cvr),
              },
            ]}
          />
        </div>
      </Section>

      <Card className="p-5 shadow-soft sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-medium">Semua Iklan</h2>
            <p className="text-xs text-muted-foreground">
              {ads.length} iklan · diurutkan menurut omzet
            </p>
          </div>
          {ads.length > 0 && <ExportButton filename="iklan.csv" csv={csv} />}
        </div>
        <Paginated rows={ads}>{(rows) => <AdTable rows={rows} />}</Paginated>
      </Card>

      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="mb-1 font-heading text-base font-medium">
          Iklan Boros (ROAS terendah)
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          ROAS di bawah 9 — kandidat dipangkas atau dioptimasi
        </p>
        <Paginated rows={boros}>
          {(rows) => (
            <AdTable
              rows={rows}
              roasRed
              empty="Mantap — tidak ada iklan dengan ROAS di bawah 9."
            />
          )}
        </Paginated>
      </Card>

      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="mb-1 font-heading text-base font-medium">
          Iklan CTR Rendah
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          CTR di bawah 3% — materi/targeting kurang menarik
        </p>
        <Paginated rows={ctrRendah}>
          {(rows) => (
            <CtrTable
              rows={rows}
              empty="Mantap — tidak ada iklan dengan CTR di bawah 3%."
            />
          )}
        </Paginated>
      </Card>
    </div>
  );
}
