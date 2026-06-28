import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <AppNav user={user} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
