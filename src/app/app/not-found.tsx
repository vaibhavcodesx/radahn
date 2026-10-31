import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";

/**
 * App not-found state (task D2).
 * Shown when navigating to a deleted or non-existent memory, chat, or settings subpage.
 */
export default function AppNotFound() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[460px] rounded-card border border-line bg-surface p-7 text-center shadow-overlay sm:p-8">
        {/* Glyph indicator */}
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-hover-2 font-mono text-[18px] text-ink-3">
          ?
        </div>

        <h1 className="mt-4 font-serif text-[26px] text-ink">
          Not found
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          That memory or conversation doesn&apos;t exist anymore. It may have been forgotten, superseded, or expired.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            <MessageSquare className="size-4" />
            <span>New chat</span>
          </Link>
          <Link
            href="/app/memory"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-5 text-[14px] font-medium text-ink transition-colors hover:bg-hover"
          >
            <ArrowLeft className="size-4" />
            <span>Memory Atlas</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
