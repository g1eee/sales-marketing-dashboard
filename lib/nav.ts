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

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/sales/upload", label: "Upload Data", icon: Upload },
  { href: "/sales/dashboard", label: "Dashboard Sales", icon: BarChart3 },
  { href: "/marketing/requests", label: "Request Desain", icon: PenTool },
  { href: "/brands", label: "Brand", icon: Tag },
];
