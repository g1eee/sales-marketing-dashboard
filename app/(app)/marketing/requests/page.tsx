import { ArrowRight, PenTool } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

const STAGES = ["Baru", "Dikerjakan", "Review", "Revisi", "Selesai"];

export default function RequestDesainPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Desain"
        description="Task tracker aset kreatif untuk tim Creative."
      />
      <Card className="relative overflow-hidden p-8 text-center shadow-soft sm:p-12">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PenTool className="size-6" />
          </span>
          <div className="space-y-1.5">
            <h2 className="font-heading text-xl font-semibold">Segera hadir</h2>
            <p className="text-sm text-muted-foreground">
              Sales membuat request aset (banner toko, flyer ads, IG story), tim
              Creative mengerjakan dan melacak statusnya lewat papan:
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {STAGES.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium ring-1 ring-foreground/5">
                  {s}
                </span>
                {i < STAGES.length - 1 && (
                  <ArrowRight className="size-3 text-muted-foreground" />
                )}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
