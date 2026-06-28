import { addBrand } from "@/app/(app)/brands/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BrandForm() {
  return (
    <form action={addBrand} className="flex gap-2">
      <Input name="name" placeholder="Nama brand baru" required />
      <Button type="submit">Tambah</Button>
    </form>
  );
}
