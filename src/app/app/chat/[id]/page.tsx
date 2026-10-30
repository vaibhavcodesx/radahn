import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";
import type { RadahnUIMessage } from "@/lib/chat-types";
import { requirePageUser } from "@/server/auth/session";
import { getConversation, getSettings, getSpace, listMessages } from "@/server/app/workspace";
import { DEMO_SUGGESTIONS } from "@/server/memory/fixtures/demo";

export default async function ChatPage({ params }: PageProps<"/app/chat/[id]">) {
  const { id } = await params;
  const user = await requirePageUser();
  const conversation = await getConversation(user.id, id).catch(() => null);
  if (!conversation) notFound();
  const [settings, space, docs] = await Promise.all([
    getSettings(user),
    getSpace(user.id, conversation.spaceId).catch(() => null),
    listMessages(user.id, id),
  ]);
  const initialMessages = docs.map(
    (m) =>
      ({
        id: m.uiId,
        role: m.role,
        parts: (m.parts?.length ? m.parts : [{ type: "text", text: m.text }]) as RadahnUIMessage["parts"],
        metadata: { createdAt: m.createdAt.toISOString() },
      }) satisfies RadahnUIMessage,
  );
  return (
    <ChatView
      key={id}
      conversationId={id}
      title={conversation.title}
      spaceId={conversation.spaceId}
      spaceName={space?.name ?? "Space"}
      initialMessages={initialMessages}
      suggestions={settings.demoLoadedAt ? DEMO_SUGGESTIONS : []}
      showDemo={false}
      isDemoConversation={conversation.demo}
    />
  );
}
