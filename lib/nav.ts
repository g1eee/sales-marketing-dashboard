import {
  LayoutDashboard,
  BarChart3,
  Tag,
  Database,
  Wrench,
  FileText,
  CalendarDays,
  FileSpreadsheet,
  PenTool,
  Library,
  CheckCircle2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// A collapsible cluster inside a section (e.g. "Tools").
export interface NavSubGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
  subGroups?: NavSubGroup[];
}

// Standalone item at the top of the sidebar.
export const OVERVIEW: NavItem = {
  href: "/",
  label: "Overview",
  icon: LayoutDashboard,
};

// Both sections render at once in a single sidebar — no switcher.
export const SECTIONS: NavSection[] = [
  {
    label: "Digital Marketing",
    items: [
      { href: "/sales/dashboard", label: "Dashboard", icon: BarChart3 },
      { href: "/brands", label: "Brand", icon: Tag },
      // Data Integrasi reuses today's upload flow; history is added in roadmap #2.
      { href: "/sales/upload", label: "Data Integrasi", icon: Database },
    ],
    subGroups: [
      {
        label: "Tools",
        icon: Wrench,
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
    label: "Creative",
    items: [
      { href: "/marketing/requests", label: "Briefs", icon: PenTool },
      { href: "/brands", label: "Brand", icon: Tag },
      { href: "/creative/library", label: "Library", icon: Library },
      { href: "/creative/approval", label: "Approval", icon: CheckCircle2 },
    ],
  },
];

// Global group pinned to the sidebar footer.
export const ACCOUNT: NavSection = {
  label: "Account",
  items: [{ href: "/settings", label: "Settings", icon: Settings }],
};

// Flattened list for places that need every route (e.g. the topbar page title).
export const NAV_ITEMS: NavItem[] = [
  OVERVIEW,
  ...SECTIONS.flatMap((s) => [
    ...s.items,
    ...(s.subGroups?.flatMap((g) => g.items) ?? []),
  ]),
  ...ACCOUNT.items,
];
