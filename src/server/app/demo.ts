import "server-only";
import { ObjectId } from "mongodb";
import { collections, type ConversationDoc, type MessageDoc, type SpaceDoc } from "@/server/db/collections";
import { engine } from "@/server/memory";
import { DEMO_CONVERSATIONS, DEMO_SPACES } from "@/server/memory/fixtures/demo";
import { updateSettings } from "./workspace";

/**
 * Demo world (PRD F-03, TRD §15). The app owns spaces + conversations + messages; the engine
 * owns memories + events. Re-seeding replaces everything flagged `demo: true` for this owner.
 */
export async function seedDemoWorld(ownerId: string): Promise<{ spaceId: string; memories: number }> {
  const { spaces, conversations, messages } = collections();
  await removeDemoWorld(ownerId, { keepSpaces: true });

  const now = Date.now();
  // Drop demo spaces from an older demo world (renamed persona) so they don't linger empty.
  await spaces.deleteMany({ ownerId, demo: true, name: { $nin: DEMO_SPACES.map((sp) => sp.name) } });
  const existing = await spaces.find({ ownerId, demo: true }).toArray();
  const spaceIds = {} as Record<(typeof DEMO_SPACES)[number]["key"], string>;
  for (const sp of DEMO_SPACES) {
    let doc = existing.find((e) => e.name === sp.name);
    if (!doc) {
      doc = {
        _id: new ObjectId(),
        ownerId,
        name: sp.name,
        color: sp.color,
        isDefault: false,
        unitsSinceReflection: 0,
        demo: true,
        createdAt: new Date(now - 200 * 3_600_000),
      } satisfies SpaceDoc;
      await spaces.insertOne(doc);
    }
    spaceIds[sp.key] = doc._id.toHexString();
  }

  const convs: Array<{ conversationId: string; messageIds: string[] }> = [];
  for (const c of DEMO_CONVERSATIONS) {
    const createdAt = new Date(now - c.ageHours * 3_600_000);
    const conv: ConversationDoc = {
      _id: new ObjectId(),
      ownerId,
      spaceId: spaceIds[c.space],
      title: c.title,
      lastMessageAt: new Date(createdAt.getTime() + c.messages.length * 60_000),
      demo: true,
      createdAt,
    };
    const docs: MessageDoc[] = c.messages.map((m, i) => ({
      _id: new ObjectId(),
      conversationId: conv._id.toHexString(),
      ownerId,
      role: m.role,
      uiId: `demo-${conv._id.toHexString()}-${i}`,
      parts: [{ type: "text", text: m.text }],
      text: m.text,
      citedMemoryIds: [],
      demo: true,
      createdAt: new Date(createdAt.getTime() + i * 60_000),
    }));
    await conversations.insertOne(conv);
    await messages.insertMany(docs);
    convs.push({ conversationId: conv._id.toHexString(), messageIds: docs.map((d) => d.uiId) });
  }

  const eng = await engine();
  const result = await eng.seedDemo({ ownerId, spaceIds, conversations: convs });
  await updateSettings(ownerId, { demoLoadedAt: new Date(), currentSpaceId: spaceIds.project, displayName: "Aarav" });
  return { spaceId: spaceIds.project, memories: result.memories };
}

export async function removeDemoWorld(ownerId: string, opts: { keepSpaces?: boolean } = {}) {
  const { spaces, conversations, messages } = collections();
  await messages.deleteMany({ ownerId, demo: true });
  await conversations.deleteMany({ ownerId, demo: true });
  if (!opts.keepSpaces) await spaces.deleteMany({ ownerId, demo: true });
  await (await engine()).removeDemo(ownerId);
}
