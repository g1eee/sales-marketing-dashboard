import { listBrands } from "@/lib/brands";
import { UploadForm } from "./upload-form";
import { UploadHistory } from "./upload-history";
import { PageHeader } from "@/components/page-header";

export default async function UploadPage() {
  const brands = await listBrands();
  return (
    <div className="space-y-8">
      <div className="max-w-xl">
        <PageHeader
          title="Data Integrasi"
          description="Tarik export Shopee (Global, Produk, Ads) per brand & periode. Riwayat upload tersimpan di bawah."
        />
        <UploadForm brands={brands} />
      </div>
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Riwayat Upload</h2>
        <UploadHistory />
      </section>
    </div>
  );
}
