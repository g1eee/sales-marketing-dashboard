import { cn } from "@/lib/utils";

/**
 * Decorative emerald radial glows — the "mirage" the app is named for. Render
 * inside a `relative` container; sits behind content via -z-10. Tuned to read as
 * a soft tint on the light canvas; the same emerald haze works on dark.
 */
export function GlowBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(20,130,100,0.16)_0%,rgba(20,130,100,0)_70%)] dark:bg-[radial-gradient(50%_50%_at_50%_50%,rgba(40,170,130,0.18)_0%,rgba(40,170,130,0)_70%)]" />
      <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(45,150,150,0.10)_0%,rgba(45,150,150,0)_70%)]" />
    </div>
  );
}
