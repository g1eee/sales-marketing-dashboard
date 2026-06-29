import {
  LayoutDashboard,
  Upload,
  BarChart3,
  PenTool,
  Tag,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/", label: "Ringkasan", icon: LayoutDashboard }],
  },
  {
    label: "Sales & Marketing",
    items: [
      { href: "/sales/dashboard", label: "Dashboard Sales", icon: BarChart3 },
      { href: "/sales/upload", label: "Upload Data", icon: Upload },
    ],
  },
  {
    label: "Creative",
    items: [
      { href: "/marketing/requests", label: "Request Desain", icon: PenTool },
    ],
  },
  {
    label: "Master Data",
    items: [{ href: "/brands", label: "Brand", icon: Tag }],
  },
];

// Flattened list for places that need every route (e.g. the topbar page title).
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
