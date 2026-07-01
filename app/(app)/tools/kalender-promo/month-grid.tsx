import Link from "next/link";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Brand } from "@/lib/brands";
import type { CampaignRow } from "@/lib/promo-campaigns";
import { getMonthGrid, campaignSpanInWeek, layoutWeekBars } from "@/lib/promo-calendar-grid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CampaignDialog } from "./campaign-dialog";

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MAX_ROWS = 3;

export function MonthGrid({
  year,
  month,
  campaigns,
  brands,
  marketplaceOptions,
  brandColors,
  filterBrand,
  filterMarketplace,
  filterStatus,
}: {
  year: number;
  month: number;
  campaigns: CampaignRow[];
  brands: Brand[];
  marketplaceOptions: string[];
  brandColors: Map<string, string>;
  filterBrand: string;
  filterMarketplace: string;
  filterStatus: string;
}) {
  const active = new Date(year, month - 1, 1);
  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");

  function hrefFor(target: Date, view: "grid" | "list" = "grid") {
    const params = new URLSearchParams();
    if (filterBrand !== "all") params.set("brand", filterBrand);
    if (filterMarketplace !== "all") params.set("marketplace", filterMarketplace);
    if (filterStatus !== "all") params.set("status", filterStatus);
    params.set("view", view);
    params.set("year", String(target.getFullYear()));
    params.set("month", String(target.getMonth() + 1));
    return `/tools/kalender-promo?${params.toString()}`;
  }

  const weeks = getMonthGrid(year, month);

  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bulan sebelumnya"
            render={<Link href={hrefFor(subMonths(active, 1))} />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {MONTHS[month - 1]} {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bulan berikutnya"
            render={<Link href={hrefFor(addMonths(active, 1))} />}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" render={<Link href={hrefFor(today)} />}>
          Hari ini
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="p-2">{d}</div>
        ))}
      </div>

      {/* ponytail: horizontal scroll on narrow screens instead of an auto grid/list
          switch — the manual toggle above already covers mobile, and this avoids
          double-fetching/double-rendering both views on every request. */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {weeks.map((week, weekIdx) => {
            const weekStart = format(week[0], "yyyy-MM-dd");
            const weekEnd = format(week[6], "yyyy-MM-dd");
            const segments = campaigns
              .flatMap((c) =>
                c.brands.map((b) => {
                  const span = campaignSpanInWeek(c.startDate, c.endDate, weekStart, weekEnd);
                  if (!span) return null;
                  return { id: `${c.id}:${b.id}`, ...span, campaign: c, brandId: b.id };
                }),
              )
              .filter((s): s is NonNullable<typeof s> => s !== null);
            const { placed, overflowByCol } = layoutWeekBars(segments, MAX_ROWS);

            return (
              <div
                key={weekIdx}
                className="grid grid-cols-7 border-b last:border-b-0"
                style={{ gridTemplateRows: `auto repeat(${MAX_ROWS}, auto) auto` }}
              >
                {week.map((day, i) => {
                  const iso = format(day, "yyyy-MM-dd");
                  const inMonth = day.getMonth() === month - 1;
                  const isToday = iso === todayIso;
                  const occupied =
                    placed.some((p) => i + 1 >= p.colStart && i + 1 < p.colStart + p.colSpan) ||
                    overflowByCol[i] > 0;

                  return (
                    <div key={iso} style={{ gridColumn: i + 1, gridRow: 1 }} className="border-r p-1 last:border-r-0">
                      {occupied ? (
                        <span
                          className={cn(
                            "text-xs",
                            isToday && "font-semibold text-primary",
                            !inMonth && "text-muted-foreground",
                          )}
                        >
                          {day.getDate()}
                        </span>
                      ) : (
                        <CampaignDialog
                          brands={brands}
                          marketplaceOptions={marketplaceOptions}
                          defaultDate={iso}
                          trigger={
                            <button
                              type="button"
                              className={cn(
                                "block h-full min-h-16 w-full text-left align-top text-xs hover:bg-muted/50",
                                isToday && "font-semibold text-primary",
                                !inMonth && "text-muted-foreground",
                              )}
                            >
                              {day.getDate()}
                            </button>
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {placed.map((bar) => (
                  <div
                    key={bar.id}
                    style={{ gridColumn: `${bar.colStart} / span ${bar.colSpan}`, gridRow: bar.row + 2 }}
                    className="px-0.5 pb-0.5"
                  >
                    <CampaignDialog
                      brands={brands}
                      marketplaceOptions={marketplaceOptions}
                      campaign={bar.campaign}
                      trigger={
                        <button
                          type="button"
                          style={{ backgroundColor: brandColors.get(bar.brandId) }}
                          className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-white"
                        >
                          {bar.campaign.name}
                        </button>
                      }
                    />
                  </div>
                ))}

                {overflowByCol.map((count, i) =>
                  count > 0 ? (
                    <Link
                      key={i}
                      href={hrefFor(active, "list")}
                      style={{ gridColumn: i + 1, gridRow: MAX_ROWS + 2 }}
                      className="px-1.5 pb-1 text-[11px] text-muted-foreground hover:underline"
                    >
                      +{count} lainnya
                    </Link>
                  ) : null,
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
