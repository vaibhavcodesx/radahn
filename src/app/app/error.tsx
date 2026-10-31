"use client";

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/atoms";

/**
 * App-level error boundary (task D2).
 * Calm, on-brand: explains what happened, safe error digest, Try again & Back to chat.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[460px] rounded-card border border-line bg-surface p-7 shadow-overlay sm:p-8">
        <div className="flex size-10 items-center justify-center rounded-control bg-red/10 text-red">
          <AlertTriangle className="size-5" />
        </div>

        <h1 className="mt-4 font-serif text-[24px] text-ink sm:text-[26px]">
          Something went wrong
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Your memories and conversations are preserved safely. This was likely a temporary database connection hiccup or timeout.
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[11.5px] text-ink-3">
            Reference code: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            size="md"
            icon={<RotateCcw className="size-4" />}
            onClick={reset}
            className="min-h-[44px] px-5 text-[14px]"
          >
            Try again
          </Button>
          <Link
            href="/app"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-line px-4 text-[14px] font-medium text-ink transition-colors hover:bg-hover"
          >
            <ArrowLeft className="size-4" />
            <span>Back to chat</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
