import { Tag } from "lucide-react";
import { listBrands } from "@/lib/brands";
import { BrandForm } from "@/components/brand-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export default async function BrandsPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Brand"
        description="Daftar brand/toko untuk pengelompokan data sales."
      />
      <Card className="p-6 shadow-soft">
        <h2 className="mb-3 font-heading text-base font-medium">Tambah Brand</h2>
        <BrandForm />
      </Card>
      <Card className="p-6 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-medium">Daftar Brand</h2>
          <span className="text-xs text-muted-foreground">
            {brands.length} brand
          </span>
        </div>
        {brands.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada brand. Tambah lewat form di atas.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {brands.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                  <Tag className="size-3.5" />
                </span>
                <span className="font-medium">{b.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
