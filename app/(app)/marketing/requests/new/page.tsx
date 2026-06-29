import { listBrands } from "@/lib/brands";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { NewRequestForm } from "./new-request-form";

export default async function NewRequestPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Request Desain Baru"
        description="Buat permintaan aset kreatif untuk tim Creative."
      />
      <Card className="p-6 shadow-soft">
        <NewRequestForm brands={brands} />
      </Card>
    </div>
  );
}
