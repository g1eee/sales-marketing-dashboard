"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  OVERVIEW,
  ACCOUNT,
  AREAS,
  areaForPath,
  type NavItem,
} from "@/lib/nav";
import { AreaSwitcher } from "@/components/area-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const areaId = areaForPath(pathname);
  const area = AREAS.find((a) => a.id === areaId) ?? AREAS[0];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.href}>
      <SidebarMenuButton
        isActive={isActive(item.href)}
        tooltip={item.label}
        render={<Link href={item.href} />}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="text-lg font-semibold tracking-tight">Miragie</span>
        </div>
        <AreaSwitcher area={areaId} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItem(OVERVIEW)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {area.groups.map((group, i) => (
          <SidebarGroup key={group.label ?? `group-${i}`}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          {ACCOUNT.label && <SidebarGroupLabel>{ACCOUNT.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{ACCOUNT.items.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
