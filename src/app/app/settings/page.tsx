import Link from "next/link";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { requirePageUser } from "@/server/auth/session";
import { getSettings } from "@/server/app/workspace";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser();
  const s = await getSettings(user);
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[760px] px-5 pb-20 pt-8">
        <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em]">Settings</h1>
        <SettingsForm
          initial={{ displayName: s.displayName ?? "", timeZone: s.timeZone, writePolicy: s.writePolicy, chatModel: s.chatModel ?? "gemini-3.8-flash" }}
          isGuest={user.isAnonymous}
          demoLoaded={Boolean(s.demoLoadedAt)}
        />
        <section className="mt-12 rounded-card bg-surface p-5 text-[12.5px] leading-relaxed text-ink-2 shadow-card">
          <p className="mono-label mb-2 text-[10px] text-ink-3">Privacy</p>
          Radahn runs on the Gemini API free tier, where Google may use prompts to improve its products. Don&apos;t enter real secrets: Radahn
          redacts credentials before anything is sent or stored, and holds sensitive details for your approval. 
          <Link href="/how-it-works" className="underline underline-offset-4">How memory works</Link>
        </section>
      </div>
    </main>
  );
}
