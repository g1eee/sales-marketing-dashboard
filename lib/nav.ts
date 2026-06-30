import {
  LayoutDashboard,
  BarChart3,
  Tag,
  Database,
  FileText,
  CalendarDays,
  FileSpreadsheet,
  PenTool,
  Library,
  CheckCircle2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type Area = "dm" | "creative";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface AreaDef {
  id: Area;
  label: string;
  groups: NavGroup[];
}

// Global item shown above the area switcher.
export const OVERVIEW: NavItem = {
  href: "/",
  label: "Overview",
  icon: LayoutDashboard,
};

// Global group pinned to the sidebar footer.
export const ACCOUNT: NavGroup = {
  label: "Account",
  items: [{ href: "/settings", label: "Settings", icon: Settings }],
};

export const AREAS: AreaDef[] = [
  {
    id: "dm",
    label: "Digital Marketing",
    groups: [
      {
        items: [
          { href: "/sales/dashboard", label: "Dashboard", icon: BarChart3 },
          { href: "/brands", label: "Brand", icon: Tag },
          // Data Integrasi reuses today's upload flow; history is added in roadmap #2.
          { href: "/sales/upload", label: "Data Integrasi", icon: Database },
        ],
      },
      {
        label: "Tools",
        items: [
          { href: "/tools/dokumen", label: "Dokumen", icon: FileText },
          {
            href: "/tools/kalender-promo",
            label: "Kalender Promo",
            icon: CalendarDays,
          },
          {
            href: "/tools/excel-csv",
            label: "Excel/CSV Generator",
            icon: FileSpreadsheet,
          },
        ],
      },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    groups: [
      {
        items: [
          { href: "/marketing/requests", label: "Briefs", icon: PenTool },
          { href: "/brands", label: "Brand", icon: Tag },
          { href: "/creative/library", label: "Library", icon: Library },
          { href: "/creative/approval", label: "Approval", icon: CheckCircle2 },
        ],
      },
    ],
  },
];

// ponytail: area is derived from the URL, so a shared route (/brands) resolves to
// the first area that lists it (DM). Acceptable for v1; add last-area persistence
// (cookie) only if the menu flip on shared/global routes annoys users.
export function areaForPath(pathname: string): Area {
  for (const area of AREAS) {
    for (const group of area.groups) {
      for (const item of group.items) {
        if (item.href !== "/" && pathname.startsWith(item.href)) return area.id;
      }
    }
  }
  return "dm";
}

// First route of an area — where the switcher lands you when you pick it.
export function primaryHref(area: Area): string {
  const def = AREAS.find((a) => a.id === area) ?? AREAS[0];
  return def.groups[0].items[0].href;
}

// Flattened list for places that need every route (e.g. the topbar page title).
export const NAV_ITEMS: NavItem[] = [
  OVERVIEW,
  ...AREAS.flatMap((a) => a.groups.flatMap((g) => g.items)),
  ...ACCOUNT.items,
];
