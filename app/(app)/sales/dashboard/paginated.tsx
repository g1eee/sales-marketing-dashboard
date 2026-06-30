"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Pager wrapper: owns its own page state; 5 rows/page by default. The render
 * prop receives the current page's rows and the index of the first row (for
 * continuous ranking across pages).
 */
export function Paginated<T>({
  rows,
  perPage = 5,
  children,
}: {
  rows: T[];
  perPage?: number;
  children: (pageRows: T[], start: number) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const cur = Math.min(page, pageCount - 1);
  const start = cur * perPage;
  const pageRows = rows.slice(start, start + perPage);
  return (
    <>
      {children(pageRows, start)}
      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Hal {cur + 1} / {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={cur === 0}
              onClick={() => setPage(cur - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={cur >= pageCount - 1}
              onClick={() => setPage(cur + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
