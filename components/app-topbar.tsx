"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import type { SessionUser } from "@/lib/auth";

function titleFor(pathname: string): string {
  const item = NAV_ITEMS.find((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  );
  return item?.label ?? "Miragie";
}

export function AppTopbar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-dashed px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h2 className="text-sm font-medium">{titleFor(pathname)}</h2>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
