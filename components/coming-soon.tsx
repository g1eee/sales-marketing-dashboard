import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
      <Empty className="min-h-[55vh] border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Construction />
          </EmptyMedia>
          <EmptyTitle>Lagi dirancang</EmptyTitle>
          <EmptyDescription>
            Fitur {title} belum aktif — lagi disiapin. Nantikan ya.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
