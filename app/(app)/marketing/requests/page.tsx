import Link from "next/link";
import { Plus } from "lucide-react";
import { listRequests } from "@/lib/marketing/data";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Board } from "./board";

export default async function RequestsPage() {
  const requests = await listRequests();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Desain"
        description="Task tracker aset kreatif untuk tim Creative."
        actions={
          <Button render={<Link href="/marketing/requests/new" />}>
            <Plus />
            Request Baru
          </Button>
        }
      />
      {requests.length === 0 ? (
        <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
          <p className="max-w-sm text-balance text-sm text-muted-foreground">
            Belum ada request. Klik “Request Baru” untuk membuat permintaan aset
            kreatif pertama.
          </p>
        </div>
      ) : (
        <Board requests={requests} />
      )}
    </div>
  );
}
