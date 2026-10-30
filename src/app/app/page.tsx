import { requirePageUser } from "@/server/auth/session";

// Temporary: replaced by the app shell + chat in Phase 1.
export default async function AppHome() {
  const user = await requirePageUser();
  return (
    <main className="flex min-h-dvh items-center justify-center p-10">
      <p className="font-serif text-[28px]">
        Welcome, {user.name}. <span className="text-ink-3">The chat is landing next.</span>
      </p>
    </main>
  );
}
