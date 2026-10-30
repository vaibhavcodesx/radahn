import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/server/auth/session";
import { SignInActions } from "./SignInActions";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/app") ? sp.next : "/app";
  const user = await getUser().catch(() => null);
  // Signed-in guests may still upgrade with Google from here; everyone else goes straight in.
  if (user && !user.isAnonymous) redirect(next);

  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-10 md:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/brand/radahn-mark.png" alt="" width={28} height={28} className="rounded-[4px]" />
          <span className="mono-label text-ink">Radahn</span>
        </Link>
        <GlyphBackdrop />
        <p className="relative font-serif text-[44px] leading-[1.05] tracking-[-0.02em]">
          Pick up where
          <br />
          <span className="text-ink-2">you left off.</span>
        </p>
      </section>

      <section className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="mb-10 flex items-center gap-2.5 md:hidden">
            <Image src="/brand/radahn-mark.png" alt="" width={28} height={28} className="rounded-[4px]" />
            <span className="mono-label text-ink">Radahn</span>
          </Link>
          <p className="mono-label mb-3 text-ink-3">{user?.isAnonymous ? "Keep your memories" : "Enter"}</p>
          <h1 className="font-serif text-[30px] leading-tight">
            {user?.isAnonymous ? "Save your guest memories to Google." : "One click and you're in."}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            Guest memories last 7 days. Sign in with Google any time to keep them. Your guest memories come with you.
          </p>
          <SignInActions next={next} isGuest={Boolean(user?.isAnonymous)} />
          <p className="mt-8 text-[12px] leading-relaxed text-ink-3">
            Radahn runs on the Gemini API free tier, where Google may use prompts to improve its products. Don&apos;t
            enter real secrets — and if you do, Radahn redacts them before they&apos;re stored.
          </p>
        </div>
      </section>
    </main>
  );
}

/** Quiet field of memory glyphs (static; the animated field lives on the landing page). */
function GlyphBackdrop() {
  const glyphs = "·:;/\\|·:·;·@+#^!=~<%*";
  const rows = 22;
  const cols = 34;
  // Deterministic per-cell hash so server and client render the same field.
  const hash = (i: number) => {
    const x = Math.sin(i * 12.9898 + 7) * 43758.5453;
    return x - Math.floor(x);
  };
  return (
    <pre aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden p-10 pt-28 font-mono text-[13px] leading-[1.6] text-ink-3 opacity-25">
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => glyphs[Math.floor(hash(r * cols + c) * glyphs.length)]).join(" "),
      ).join("\n")}
    </pre>
  );
}
