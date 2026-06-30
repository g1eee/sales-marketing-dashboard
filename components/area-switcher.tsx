"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AREAS, primaryHref, type Area } from "@/lib/nav";

// items lets base-ui's SelectValue render the area label instead of the raw id.
const areaItems = Object.fromEntries(AREAS.map((a) => [a.id, a.label]));

export function AreaSwitcher({ area }: { area: Area }) {
  const router = useRouter();
  return (
    <Select
      items={areaItems}
      value={area}
      onValueChange={(v) => router.push(primaryHref(v as Area))}
    >
      <SelectTrigger className="w-full" aria-label="Pilih area">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AREAS.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
