"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";
import {
  OVERVIEW,
  SECTIONS,
  ACCOUNT,
  type NavItem,
  type NavSubGroup,
} from "@/lib/nav";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
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

  // "Tools" — a collapsible cluster, open by default if it holds the active route.
  const renderSubGroup = (group: NavSubGroup) => (
    <Collapsible.Root
      key={group.label}
      defaultOpen={group.items.some((i) => isActive(i.href))}
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton render={<Collapsible.Trigger />} className="group/collapsible">
        <group.icon />
        <span>{group.label}</span>
        <ChevronRight className="ml-auto transition-transform group-data-[panel-open]/collapsible:rotate-90" />
      </SidebarMenuButton>
      <Collapsible.Panel render={<SidebarMenuSub />}>
        {group.items.map((item) => (
          <SidebarMenuSubItem key={item.href}>
            <SidebarMenuSubButton
              isActive={isActive(item.href)}
              render={<Link href={item.href} />}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </Collapsible.Panel>
    </Collapsible.Root>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="text-lg font-semibold tracking-tight">Miragie</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItem(OVERVIEW)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            {section.label && (
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(renderItem)}
                {section.subGroups?.map(renderSubGroup)}
              </SidebarMenu>
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
