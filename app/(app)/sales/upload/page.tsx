import { listBrands } from "@/lib/brands";
import { UploadForm } from "./upload-form";
import { PageHeader } from "@/components/page-header";

export default async function UploadPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl">
      <PageHeader
        title="Upload Data Shopee"
        description="Pilih brand, lalu tarik file Global, Produk, dan Ads. Periode terbaca otomatis."
      />
      <UploadForm brands={brands} />
    </div>
  );
}
