import { cn } from "@/lib/utils";

/**
 * Decorative grayscale radial glows (adapted from the reference hero). Render
 * inside a `relative` container; sits behind content via -z-10.
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
      <div className="absolute left-1/2 top-0 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,100%,0.08)_0,hsla(0,0%,100%,0.02)_60%,transparent_100%)]" />
      <div className="absolute bottom-0 right-0 h-[30rem] w-[30rem] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,100%,0.05)_0,transparent_70%)]" />
    </div>
  );
}
