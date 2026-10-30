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
  const freshActivity = live.events.length > 0 && !pathname.startsWith("/app/activity");

  // Refresh the server-rendered sidebar (chat titles) when memory events land.
  useEffect(() => {
    if (live.version) router.refresh();
  }, [live.version, router]);

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
    { href: "/app/activity", label: "Activity", icon: Activity, kbd: "G A", dot: freshActivity },
    { href: "/app/settings", label: "Settings", icon: Settings, kbd: "G S" },
  ];

  const sidebar = (
    <nav aria-label="Primary" className="flex h-full w-[248px] flex-col bg-surface">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/radahn-mark.png" alt="" width={22} height={22} className="rounded-[3px]" />
          <span className="mono-label text-ink">Radahn</span>
        </Link>
        <span className={cn("size-1.5 rounded-full", live.connected ? "bg-green" : "bg-ink-3")} title={live.connected ? "Live" : "Reconnecting"} />
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
                  "group flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-hover hover:text-ink",
                  active && "bg-hover-2 text-ink",
                )}
              >
                <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-t-preference px-1 font-mono text-[10px] text-[var(--t-ink-dark)] tabular">
                    {item.badge}
                  </span>
                ) : item.dot ? (
                  <span className="size-1.5 rounded-full bg-t-outcome" aria-label="New activity" />
                ) : (
                  <Kbd className="opacity-0 transition-opacity group-hover:opacity-100">{item.kbd}</Kbd>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <p className="mono-label px-4 pb-1.5 text-ink-3">Chats</p>
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
                      "flex h-8 items-center gap-2 rounded-control px-2.5 text-[12.5px] text-ink-2 hover:bg-hover hover:text-ink",
                      active && "bg-hover-2 text-ink",
                    )}
                    title={`${c.title} · ${timeAgo(c.lastMessageAt)}`}
                  >
                    <span className="truncate">{c.title}</span>
                    {c.demo ? <span className="mono-label ml-auto shrink-0 text-[9.5px] text-ink-3">Demo</span> : null}
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-hover-2 font-mono text-[11px] text-ink-2">
            {user.isAnonymous ? "G" : user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] text-ink">{user.isAnonymous ? "Guest" : user.name}</p>
            <p className="truncate font-mono text-[10.5px] text-ink-3">{engine === "mock" ? "engine: mock" : user.isAnonymous ? "memories last 7 days" : "signed in"}</p>
          </div>
          <ThemeToggle />
        </div>
        {user.isAnonymous ? (
          <Link
            href="/signin?next=/app"
            className="mono-label mt-2.5 flex h-8 items-center justify-center rounded-full text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-hover"
          >
            Save with Google
          </Link>
        ) : null}
      </div>
    </nav>
  );

  return (
    <Ctx.Provider value={{ currentSpaceId, spaces, user, demoLoaded, engine }}>
      <div className="flex h-dvh overflow-hidden bg-canvas">
        <aside className="hidden border-r border-line md:block">{sidebar}</aside>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
            <button className="absolute inset-0 bg-black/50" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
            <div className="relative h-full w-[248px] animate-fade-in shadow-overlay">
              {sidebar}
              <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-3 rounded-control p-1.5 text-ink-2 hover:bg-hover" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 items-center gap-2 border-b border-line px-3 md:hidden">
            <button onClick={() => setMobileOpen(true)} className="rounded-control p-1.5 text-ink-2 hover:bg-hover" aria-label="Open navigation">
              <PanelLeft className="size-4" />
            </button>
            <span className="mono-label text-ink-2">Radahn</span>
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
