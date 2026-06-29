import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getRequest } from "@/lib/marketing/data";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { formatDateShort } from "@/lib/dates";
import { StatusSelect } from "../status-select";
import { ResultForm } from "./result-form";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const req = await getRequest(id);
  if (!req) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/marketing/requests"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>
      <PageHeader title={req.title} description={req.asset_type} />
      <Card className="space-y-5 p-6 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Status
            </p>
            <StatusSelect id={req.id} status={req.status} size="default" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Deadline
            </p>
            <p className="text-sm font-medium">
              {req.deadline ? formatDateShort(req.deadline) : "—"}
            </p>
          </div>
        </div>

        {req.brief && (
          <div className="space-y-1.5">
            <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
              Brief
            </p>
            <p className="text-sm whitespace-pre-wrap">{req.brief}</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
            Link Hasil
          </p>
          {req.result_link && (
            <a
              href={req.result_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
            >
              <ExternalLink className="size-3.5" />
              {req.result_link}
            </a>
          )}
          <ResultForm id={req.id} current={req.result_link} />
        </div>
      </Card>
    </div>
  );
}
