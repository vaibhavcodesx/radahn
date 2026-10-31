import Link from "next/link";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { requirePageUser } from "@/server/auth/session";
import { getSettings } from "@/server/app/workspace";

export const metadata = { title: "Settings" };

/**
 * Settings page (design.md §6.9, task B4).
 * Grouped cards: Profile & time zone, Memory behaviour, Agent access keys, Danger zone.
 */
export default async function SettingsPage() {
  const user = await requirePageUser();
  const s = await getSettings(user);
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[800px] px-4 pb-24 pt-8 sm:px-6 md:px-8">
        <h1 className="font-serif text-[32px] leading-none tracking-[-0.01em] sm:text-[36px]">Settings</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Manage your profile, retention policies, connected agents, and memory data.
        </p>

        <SettingsForm
          initial={{ displayName: s.displayName ?? "", timeZone: s.timeZone, writePolicy: s.writePolicy, chatModel: s.chatModel ?? "gemini-3.8-flash" }}
          isGuest={user.isAnonymous}
          demoLoaded={Boolean(s.demoLoadedAt)}
        />

        <section className="mt-12 rounded-card border border-line bg-surface p-6 text-[13.5px] leading-relaxed text-ink-2 shadow-card">
          <p className="font-serif text-[18px] text-ink">Privacy & security</p>
          <p className="mt-2">
            Radahn operates on free tiers where the API provider may use prompts to train models. Never enter production secrets or credentials.
            Radahn deterministically redacts API keys, tokens, and passwords before anything is sent or stored, and holds sensitive items in Review.
          </p>
          <div className="mt-3">
            <Link href="/how-it-works" className="font-medium text-ink underline underline-offset-4 hover:text-accent">
              Learn how the memory engine works &rarr;
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
