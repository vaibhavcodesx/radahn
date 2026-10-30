import { ChatView } from "@/components/chat/ChatView";
import { requirePageUser } from "@/server/auth/session";
import { currentSpace, getSettings } from "@/server/app/workspace";
import { DEMO_SUGGESTIONS } from "@/server/memory/fixtures/demo";

export const metadata = { title: "New chat" };

const FRESH_SUGGESTIONS = ["I'm building a hackathon project due tonight. Help me plan.", "I prefer short bullet answers.", "What do you remember about me?"];

export default async function NewChatPage() {
  const user = await requirePageUser();
  const settings = await getSettings(user);
  const { space } = await currentSpace(user.id, settings);
  const demo = Boolean(settings.demoLoadedAt);
  return (
    <ChatView
      key={`new-${space._id.toHexString()}`}
      conversationId={null}
      title="New chat"
      spaceId={space._id.toHexString()}
      spaceName={space.name}
      initialMessages={[]}
      suggestions={demo ? DEMO_SUGGESTIONS : FRESH_SUGGESTIONS}
      showDemo={!demo}
    />
  );
}
