import { setResultLink } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResultForm({
  id,
  current,
}: {
  id: string;
  current: string | null;
}) {
  async function action(formData: FormData) {
    "use server";
    await setResultLink(id, String(formData.get("link") ?? ""));
  }
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <Input
        name="link"
        type="url"
        placeholder="https://drive.google.com/…"
        defaultValue={current ?? ""}
        className="min-w-0 flex-1"
      />
      <Button type="submit">Simpan</Button>
    </form>
  );
}
