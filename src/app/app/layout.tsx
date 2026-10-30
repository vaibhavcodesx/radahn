import { AppShell } from "@/components/shell/AppShell";
import { LiveProvider } from "@/components/realtime/LiveProvider";
import { requirePageUser } from "@/server/auth/session";
import { currentSpace, getSettings, listConversations, toConversationDTO, toSpaceDTO } from "@/server/app/workspace";
import { engine, engineKind } from "@/server/memory";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requirePageUser();
  const settings = await getSettings(user);
  const { space, spaces } = await currentSpace(user.id, settings);
  const [conversations, pending] = await Promise.all([
    listConversations(user.id, space._id.toHexString(), 40),
    (await engine()).pendingCount(user.id).catch(() => 0),
  ]);

  return (
    <LiveProvider>
      <AppShell
        user={{ name: user.name, isAnonymous: user.isAnonymous, image: user.image ?? null }}
        spaces={spaces.map(toSpaceDTO)}
        currentSpaceId={space._id.toHexString()}
        conversations={conversations.map(toConversationDTO)}
        pendingCount={pending}
        engine={engineKind()}
        demoLoaded={Boolean(settings.demoLoadedAt)}
      >
        {children}
      </AppShell>
    </LiveProvider>
  );
}
