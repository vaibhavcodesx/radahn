"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/atoms";
import { authClient } from "@/lib/auth-client";

export function SignInActions({ next, isGuest }: { next: string; isGuest: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<"guest" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterAsGuest() {
    if (pending) return;
    setPending("guest");
    setError(null);
    if (isGuest) {
      router.push(next);
      return;
    }
    const res = await authClient.signIn.anonymous();
    if (res.error) {
      setPending(null);
      setError("Couldn't start a guest session. Try again in a moment.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function google() {
    if (pending) return;
    setPending("google");
    setError(null);
    const res = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (res?.error) {
      setPending(null);
      setError("Google sign-in isn't available right now. Enter as a guest instead.");
    }
  }

  // G = guest (LocalCan-style kbd hint on the button)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return;
      if (e.key === "g" || e.key === "G") void enterAsGuest();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mt-8 flex flex-col gap-3">
      <Button variant="accent" pill size="md" kbd="G" onClick={enterAsGuest} disabled={pending !== null} className="w-full">
        {pending === "guest" ? "Entering…" : isGuest ? "Continue as guest" : "Enter as guest"}
      </Button>
      <Button variant="secondary" pill size="md" onClick={google} disabled={pending !== null} className="w-full">
        {pending === "google" ? "Opening Google…" : "Continue with Google"}
      </Button>
      <p role="status" aria-live="polite" className="min-h-5 text-[12.5px] text-red">
        {error}
      </p>
    </div>
  );
}
