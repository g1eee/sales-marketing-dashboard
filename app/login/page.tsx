import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GlowBackground } from "@/components/glow-background";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <GlowBackground />
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 space-y-1 text-center">
          <p className="text-2xl font-semibold tracking-tight">Miragie</p>
          <p className="text-muted-foreground text-sm">Masuk untuk melanjutkan</p>
        </div>
        <form action={signIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full">
            Masuk
          </Button>
        </form>
      </Card>
    </div>
  );
}
