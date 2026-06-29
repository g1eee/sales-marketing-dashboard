import { listBrands } from "@/lib/brands";
import { BrandForm } from "@/components/brand-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl">
      <PageHeader title="Brand" description="Kelola daftar brand untuk upload data." />
      <div className="space-y-4">
        <BrandForm />
        <Card className="divide-y p-0">
          {brands.length === 0 && (
            <p className="text-muted-foreground p-4 text-sm">Belum ada brand.</p>
          )}
          {brands.map((b) => (
            <div key={b.id} className="px-4 py-2.5 text-sm">
              {b.name}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
