import "server-only";
import { ObjectId } from "mongodb";
import { collections, type ConversationDoc, type MessageDoc, type SpaceDoc, type UserSettingsDoc } from "@/server/db/collections";
import { HttpError } from "@/server/auth/session";
import type { SessionUser } from "@/server/auth/session";

/**
 * App-level data owned by Claude: spaces, settings, conversations, messages (TRD §5).
 * Every function takes ownerId from the session and scopes every query by it.
 */

export interface SpaceDTO {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  demo?: boolean;
}

export interface ConversationDTO {
  id: string;
  spaceId: string;
  title: string;
  lastMessageAt: string;
  demo?: boolean;
}

export const toSpaceDTO = (s: SpaceDoc): SpaceDTO => ({
  id: s._id.toHexString(),
  name: s.name,
  color: s.color,
  isDefault: s.isDefault,
  demo: s.demo,
});

export const toConversationDTO = (c: ConversationDoc): ConversationDTO => ({
  id: c._id.toHexString(),
  spaceId: c.spaceId,
  title: c.title,
  lastMessageAt: c.lastMessageAt.toISOString(),
  demo: c.demo,
});

export function oid(id: string, what = "id"): ObjectId {
  if (!ObjectId.isValid(id) || id.length !== 24) throw new HttpError(400, "bad_request", `Invalid ${what}.`);
  return new ObjectId(id);
}

// ── settings ──

export async function getSettings(user: SessionUser): Promise<UserSettingsDoc> {
  const { settings } = collections();
  const found = await settings.findOne({ _id: user.id });
  if (found) return found;
  const fresh: UserSettingsDoc = { _id: user.id, timeZone: "Asia/Kolkata", writePolicy: "review_sensitive", updatedAt: new Date() };
  await settings.updateOne({ _id: user.id }, { $setOnInsert: fresh }, { upsert: true });
  return fresh;
}

export async function updateSettings(ownerId: string, patch: Partial<Omit<UserSettingsDoc, "_id">>) {
  await collections().settings.updateOne({ _id: ownerId }, { $set: { ...patch, updatedAt: new Date() } }, { upsert: true });
}

export function displayName(user: SessionUser, s: UserSettingsDoc): string {
  return s.displayName || (user.isAnonymous ? "you" : user.name.split(" ")[0] || "you");
}

// ── spaces ──

/** Every user has at least one space. Created lazily on first visit. */
export async function listSpaces(ownerId: string): Promise<SpaceDoc[]> {
  const { spaces } = collections();
  let list = await spaces.find({ ownerId }).sort({ isDefault: -1, createdAt: 1 }).toArray();
  if (list.length === 0) {
    const doc: SpaceDoc = {
      _id: new ObjectId(),
      ownerId,
      name: "Personal",
      color: "--t-preference",
      isDefault: true,
      unitsSinceReflection: 0,
      createdAt: new Date(),
    };
    await spaces.insertOne(doc);
    list = [doc];
  }
  return list;
}

export async function getSpace(ownerId: string, spaceId: string): Promise<SpaceDoc> {
  const s = await collections().spaces.findOne({ _id: oid(spaceId, "space"), ownerId });
  if (!s) throw new HttpError(404, "not_found", "Space not found.");
  return s;
}

export async function createSpace(ownerId: string, name: string, color: string): Promise<SpaceDoc> {
  const doc: SpaceDoc = { _id: new ObjectId(), ownerId, name, color, isDefault: false, unitsSinceReflection: 0, createdAt: new Date() };
  await collections().spaces.insertOne(doc);
  return doc;
}

/** The current space: settings.currentSpaceId if still valid, else the default. */
export async function currentSpace(ownerId: string, settings: UserSettingsDoc): Promise<{ space: SpaceDoc; spaces: SpaceDoc[] }> {
  const spaces = await listSpaces(ownerId);
  const space = spaces.find((s) => s._id.toHexString() === settings.currentSpaceId) ?? spaces.find((s) => s.isDefault) ?? spaces[0];
  return { space, spaces };
}

// ── conversations ──

export async function listConversations(ownerId: string, spaceId?: string, limit = 50): Promise<ConversationDoc[]> {
  return collections()
    .conversations.find({ ownerId, ...(spaceId ? { spaceId } : {}) })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getConversation(ownerId: string, id: string): Promise<ConversationDoc> {
  const c = await collections().conversations.findOne({ _id: oid(id, "conversation"), ownerId });
  if (!c) throw new HttpError(404, "not_found", "Conversation not found.");
  return c;
}

export async function createConversation(ownerId: string, spaceId: string, title = "New chat"): Promise<ConversationDoc> {
  const now = new Date();
  const doc: ConversationDoc = { _id: new ObjectId(), ownerId, spaceId, title, lastMessageAt: now, createdAt: now };
  await collections().conversations.insertOne(doc);
  return doc;
}

export async function renameConversation(ownerId: string, id: string, title: string) {
  await collections().conversations.updateOne({ _id: oid(id), ownerId }, { $set: { title } });
}

export async function deleteConversation(ownerId: string, id: string) {
  const { conversations, messages } = collections();
  await messages.deleteMany({ ownerId, conversationId: id });
  await conversations.deleteOne({ _id: oid(id), ownerId });
}

// ── messages ──

export async function listMessages(ownerId: string, conversationId: string, limit = 200): Promise<MessageDoc[]> {
  return collections().messages.find({ ownerId, conversationId }).sort({ createdAt: 1 }).limit(limit).toArray();
}

export async function findMessageByUiId(ownerId: string, uiId: string): Promise<MessageDoc | null> {
  return collections().messages.findOne({ ownerId, uiId });
}

export async function searchConversations(ownerId: string, q: string, limit = 20): Promise<ConversationDTO[]> {
  const { messages, conversations } = collections();
  const hits = await messages
    .find({ ownerId, $text: { $search: q } }, { projection: { conversationId: 1, score: { $meta: "textScore" } } })
    .sort({ score: { $meta: "textScore" } })
    .limit(100)
    .toArray();
  const ids = [...new Set(hits.map((h) => h.conversationId))].slice(0, limit);
  const convs = await conversations.find({ ownerId, _id: { $in: ids.map((i) => new ObjectId(i)) } }).toArray();
  return convs.map(toConversationDTO);
}
