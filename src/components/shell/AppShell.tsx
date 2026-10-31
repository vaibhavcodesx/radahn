"use client";

import { Activity, Brain, Inbox, MessageSquarePlus, Moon, PanelLeft, Settings, Sun, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Kbd } from "@/components/atoms";
import { useLive } from "@/components/realtime/LiveProvider";
import { cn, timeAgo } from "@/lib/utils";
import { SpaceSwitcher, type SpaceItem } from "./SpaceSwitcher";

export interface ShellConversation {
  id: string;
  spaceId: string;
  title: string;
  lastMessageAt: string;
  demo?: boolean;
}

interface ShellCtx {
  currentSpaceId: string;
  spaces: SpaceItem[];
  user: { name: string; isAnonymous: boolean; image: string | null };
  demoLoaded: boolean;
  engine: "mock" | "real";
}
const Ctx = createContext<ShellCtx | null>(null);
export const useShell = () => useContext(Ctx)!;

export function AppShell({
  children,
  user,
  spaces,
  currentSpaceId,
  conversations,
  pendingCount,
  engine,
  demoLoaded,
}: {
  children: React.ReactNode;
  user: ShellCtx["user"];
  spaces: SpaceItem[];
  currentSpaceId: string;
  conversations: ShellConversation[];
  pendingCount: number;
  engine: "mock" | "real";
  demoLoaded: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const live = useLive();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live review badge: server count + pending events seen since load.
  const pendingLive = live.events.filter((e) => e.kind === "pending").length - live.events.filter((e) => e.kind === "approved" || e.kind === "rejected").length;
  const pending = Math.max(0, pendingCount + pendingLive);

  // Refresh server-rendered lists when memory events land — but never on a chat page: a refresh
  // there remounts the conversation from the DB mid-stream and the live reply vanishes. Chat
  // pages refresh themselves when a reply finishes.
  const onChat = pathname === "/app" || pathname.startsWith("/app/chat/");
  useEffect(() => {
    if (live.version && !onChat) router.refresh();
  }, [live.version, router, onChat]);

  // Keyboard: N new chat · G M memory · G R review · G A activity (design.md §6).
  useEffect(() => {
    let g = false;
    let t: ReturnType<typeof setTimeout>;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (g) {
        g = false;
        const to = { m: "/app/memory", r: "/app/review", a: "/app/activity", s: "/app/settings" }[e.key.toLowerCase()];
        if (to) router.push(to);
        return;
      }
      if (e.key === "g") {
        g = true;
        t = setTimeout(() => (g = false), 900);
      } else if (e.key === "n") router.push("/app");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [router]);

  const nav = [
    { href: "/app", label: "New chat", icon: MessageSquarePlus, kbd: "N", exact: true },
    { href: "/app/memory", label: "Memory", icon: Brain, kbd: "G M" },
    { href: "/app/review", label: "Review", icon: Inbox, kbd: "G R", badge: pending || undefined },
    { href: "/app/activity", label: "Activity", icon: Activity, kbd: "G A" },
    { href: "/app/settings", label: "Settings", icon: Settings, kbd: "G S" },
  ];

  const sidebar = (
    <nav aria-label="Primary" className="flex h-full w-[260px] flex-col bg-surface">
      <div className="flex items-center px-4 pb-3 pt-4">
        <Link href="/" className="group flex items-center gap-3 rounded-control" aria-label="Radahn home">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--t-ink-dark)] shadow-[inset_0_0_0_1px_var(--line-strong),0_1px_6px_rgb(0_0_0/0.25)] transition-transform group-hover:scale-[1.04]">
            <Image src="/brand/radahn-mark.png" alt="" width={30} height={30} className="rounded-[6px] [filter:brightness(1.9)_contrast(1.15)]" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-[23px] tracking-[-0.01em] text-ink">Radahn</span>
            <span className="mt-1 text-[11.5px] text-ink-3">Memory you can see</span>
          </span>
        </Link>
      </div>

      <div className="px-2 pb-2">
        <SpaceSwitcher spaces={spaces} currentSpaceId={currentSpaceId} />
      </div>

      <ul className="flex flex-col gap-px px-2">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex h-10 items-center gap-3 rounded-control px-3 text-[14.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink",
                  active && "bg-hover-2 text-ink",
                )}
              >
                <item.icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-t-preference px-1.5 text-[11.5px] font-medium text-[var(--t-ink-dark)] tabular" aria-label={`${item.badge} waiting`}>
                    {item.badge}
                  </span>
                ) : (
                  <Kbd className="opacity-0 transition-opacity group-hover:opacity-100">{item.kbd}</Kbd>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="px-5 pb-1.5 text-[12.5px] font-medium text-ink-3">Chats</p>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <li className="px-2.5 py-2 text-[12.5px] text-ink-3">No chats in this space yet.</li>
          ) : (
            conversations.map((c) => {
              const active = pathname === `/app/chat/${c.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/app/chat/${c.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-control px-3 text-[14px] text-ink-2 hover:bg-hover hover:text-ink",
                      active && "bg-hover-2 text-ink",
                    )}
                    title={`${c.title} · ${timeAgo(c.lastMessageAt)}`}
                  >
                    <span className="truncate">{c.title}</span>
                    {c.demo ? <span className="ml-auto shrink-0 text-[11.5px] text-ink-3">Demo</span> : null}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-hover-2 text-[13px] font-medium text-ink-2">
            {user.isAnonymous ? "G" : user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] text-ink">{user.isAnonymous ? "Guest" : user.name}</p>
            <p className="truncate text-[12px] text-ink-3">{user.isAnonymous ? "Memories kept for 7 days" : "Signed in with Google"}</p>
          </div>
          <ThemeToggle />
        </div>
        {user.isAnonymous ? (
          <Link
            href="/signin?next=/app"
            className="mt-3 flex h-9 items-center justify-center rounded-full text-[13.5px] font-medium text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover"
          >
            Keep my memories — sign in
          </Link>
        ) : null}
      </div>
    </nav>
  );

  return (
    <Ctx.Provider value={{ currentSpaceId, spaces, user, demoLoaded, engine }}>
      <div className="relative flex h-dvh overflow-hidden bg-canvas">
        <aside className="hidden border-r border-line md:block">{sidebar}</aside>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full w-[280px] animate-fade-in shadow-overlay">
              {sidebar}
              <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-3 flex size-10 items-center justify-center rounded-control text-ink-2 hover:bg-hover" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
          </div>
        ) : null}
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 items-center gap-2 border-b border-line px-2 md:hidden">
            <button onClick={() => setMobileOpen(true)} className="flex size-10 items-center justify-center rounded-control text-ink-2 hover:bg-hover" aria-label="Open navigation">
              <PanelLeft className="size-5" />
            </button>
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--t-ink-dark)] shadow-[inset_0_0_0_1px_var(--line-strong)]">
              <Image src="/brand/radahn-mark.png" alt="" width={24} height={24} className="rounded-[5px] [filter:brightness(1.9)_contrast(1.15)]" />
            </span>
            <span className="font-serif text-[19px] text-ink">Radahn</span>
            {pending ? (
              <Link href="/app/review" className="ml-auto mr-1 inline-flex h-7 items-center rounded-full bg-t-preference px-2.5 text-[12px] font-medium text-[var(--t-ink-dark)]">
                {pending} to review
              </Link>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </Ctx.Provider>
  );
}

function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => null,
  );
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("radahn-theme", next);
    } catch {
      /* private mode */
    }
  };
  return (
    <button onClick={toggle} className="rounded-control p-1.5 text-ink-3 hover:bg-hover hover:text-ink" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
      {theme === "light" ? <Moon className="size-4" strokeWidth={1.75} /> : <Sun className="size-4" strokeWidth={1.75} />}
    </button>
  );
}
