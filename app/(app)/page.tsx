import Link from "next/link";
import { ArrowRight, BarChart3, Database, PenTool, Tag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { GlowBackground } from "@/components/glow-background";
import { Card } from "@/components/ui/card";

// ponytail: temporary hub. Roadmap #7 replaces this with the aggregate KPI Overview.
const LINKS = [
  {
    href: "/sales/dashboard",
    label: "Dashboard",
    desc: "Analitik penjualan, produk & iklan per periode.",
    icon: BarChart3,
  },
  {
    href: "/sales/upload",
    label: "Data Integrasi",
    desc: "Tarik export Shopee/TikTok tiap periode.",
    icon: Database,
  },
  {
    href: "/marketing/requests",
    label: "Briefs",
    desc: "Task tracker aset kreatif untuk tim Creative.",
    icon: PenTool,
  },
  {
    href: "/brands",
    label: "Brand",
    desc: "Kelola daftar brand/toko.",
    icon: Tag,
  },
];

export default function OverviewPage() {
  return (
    <div className="relative">
      <GlowBackground />
      <PageHeader
        title="Overview"
        description="Ringkasan Digital Marketing & Creative. Pilih modul untuk mulai."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Card
            key={l.href}
            className="group/card p-0 shadow-soft transition-shadow hover:shadow-md"
          >
            <Link href={l.href} className="flex items-start gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <l.icon className="size-5" />
              </span>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1 font-medium">
                  {l.label}
                  <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100" />
                </div>
                <p className="text-sm text-muted-foreground">{l.desc}</p>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
