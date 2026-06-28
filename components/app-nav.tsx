import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import type { SessionUser } from "@/lib/auth";

const links = [
  { href: "/", label: "Ringkasan" },
  { href: "/sales/upload", label: "Upload Data" },
  { href: "/sales/dashboard", label: "Dashboard Sales" },
  { href: "/marketing/requests", label: "Request Desain" },
  { href: "/brands", label: "Brand" },
];

export function AppNav({ user }: { user: SessionUser }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r p-4">
      <div className="mb-4">
        <p className="text-sm font-semibold">{user.fullName || user.email}</p>
        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
      </div>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded px-3 py-2 text-sm hover:bg-muted"
        >
          {l.label}
        </Link>
      ))}
      <form action={signOut} className="mt-auto">
        <Button variant="outline" size="sm" className="w-full">
          Keluar
        </Button>
      </form>
    </aside>
  );
}
