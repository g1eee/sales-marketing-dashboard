"use client";

import { useTransition } from "react";
import {
  STATUSES,
  STATUS_LABELS,
  type DesignStatus,
} from "@/lib/marketing/requests";
import { updateStatus } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const items = Object.fromEntries(STATUSES.map((s) => [s, STATUS_LABELS[s]]));

export function StatusSelect({
  id,
  status,
  size = "sm",
}: {
  id: string;
  status: DesignStatus;
  size?: "sm" | "default";
}) {
  const [pending, start] = useTransition();
  return (
    <Select
      items={items}
      value={status}
      onValueChange={(v) =>
        v && start(() => updateStatus(id, v as DesignStatus))
      }
      disabled={pending}
    >
      <SelectTrigger size={size} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
