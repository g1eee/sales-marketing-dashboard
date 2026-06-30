import { PageHeader } from "@/components/page-header";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <p className="text-muted-foreground text-sm">
        Fitur ini lagi dirancang. Nantikan ya.
      </p>
    </div>
  );
}
