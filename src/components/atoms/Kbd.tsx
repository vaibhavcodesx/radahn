import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "inverse";
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] px-1 font-mono text-[10px] leading-none",
        tone === "inverse"
          ? "bg-[color-mix(in_srgb,var(--accent-ink)_14%,transparent)] text-accent-ink"
          : "bg-hover-2 text-ink-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
