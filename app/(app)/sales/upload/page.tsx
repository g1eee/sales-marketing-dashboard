import { listBrands } from "@/lib/brands";
import { UploadForm } from "./upload-form";

export default async function UploadPage() {
  const brands = await listBrands();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Upload Data Shopee</h1>
      <p className="text-sm text-muted-foreground">
        Pilih brand, lalu tarik file Global, Produk, dan Ads. Periode terbaca otomatis.
      </p>
      <UploadForm brands={brands} />
    </div>
  );
}
