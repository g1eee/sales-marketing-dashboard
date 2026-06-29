"use client";

import Link from "next/link";
import {
  STATUSES,
  STATUS_LABELS,
  deadlineState,
  type DesignRequest,
} from "@/lib/marketing/requests";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StatusSelect } from "./status-select";

const today = () => new Date().toISOString().slice(0, 10);

function Deadline({ deadline }: { deadline: string | null }) {
  const state = deadlineState(deadline, today());
  if (state === "none" || !deadline) return null;
  const cls =
    state === "overdue"
      ? "text-destructive"
      : state === "soon"
        ? "text-foreground"
        : "text-muted-foreground";
  const fmt = new Date(`${deadline}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
  const note =
    state === "overdue" ? " · lewat" : state === "soon" ? " · mepet" : "";
  return (
    <span className={cn("text-xs whitespace-nowrap", cls)}>
      ⏱ {fmt}
      {note}
    </span>
  );
}

export function Board({ requests }: { requests: DesignRequest[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
      {STATUSES.map((status) => {
        const items = requests.filter((r) => r.status === status);
        return (
          <div key={status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-medium">{STATUS_LABELS[status]}</h2>
              <span className="text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                  Kosong
                </div>
              )}
              {items.map((r) => (
                <Card key={r.id} className="gap-2 p-3 shadow-soft">
                  <Link
                    href={`/marketing/requests/${r.id}`}
                    className="text-sm leading-snug font-medium hover:underline"
                  >
                    {r.title}
                  </Link>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                      {r.asset_type}
                    </span>
                    <Deadline deadline={r.deadline} />
                  </div>
                  <StatusSelect id={r.id} status={r.status} />
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
