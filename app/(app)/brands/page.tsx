import { listBrands } from "@/lib/brands";
import { BrandForm } from "@/components/brand-form";
import { Card } from "@/components/ui/card";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Brand</h1>
      <BrandForm />
      <Card className="divide-y p-0">
        {brands.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Belum ada brand.</p>
        )}
        {brands.map((b) => (
          <div key={b.id} className="px-4 py-2 text-sm">
            {b.name}
          </div>
        ))}
      </Card>
    </div>
  );
}
