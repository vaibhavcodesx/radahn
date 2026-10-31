import "server-only";
import { collections, OWNED_COLLECTIONS, type UserSettingsDoc } from "@/server/db/collections";
import { db, mongo } from "@/server/db/client";
import { lockOwner } from "@/server/memory/mutation";
import { migrateProfile } from "@/server/memory/profile";

/**
 * Guest → Google upgrade (TRD §4): re-own every guest document in one transaction so a
 * half-migrated account can't happen. Both owners are locked (the engine's owner lock), so an
 * in-flight memory write serializes with the move. The guest's settings become a `retiredTo`
 * tombstone: a chat's delayed after() write that still lands under the guest id is swept over by
 * sweepRetiredOwner. Profiles are keyed by owner, so they are invalidated and rebuilt, not moved.
 */
export async function migrateOwner(fromOwnerId: string, toOwnerId: string): Promise<void> {
  if (fromOwnerId === toOwnerId) return;
  const database = db();
  const session = mongo().startSession();
  try {
    await session.withTransaction(async () => {
      const { settings } = collections(database);
      const old = await settings.findOne({ _id: fromOwnerId }, { session });
      const existing = await settings.findOne({ _id: toOwnerId }, { session });
      await lockOwner(fromOwnerId, session);
      await lockOwner(toOwnerId, session);
      for (const name of OWNED_COLLECTIONS) {
        await database
          .collection(name)
          .updateMany({ ownerId: fromOwnerId }, { $set: { ownerId: toOwnerId } }, { session });
      }
      await migrateProfile(fromOwnerId, toOwnerId, session);
      if (old && !old.retiredTo && !existing) {
        // Carry preferences (space, policy, time zone); lock counters stay with the new owner.
        const carry: Partial<UserSettingsDoc> = { ...old };
        for (const k of ["_id", "displayName", "memoryRevision", "reflectionRevision", "retiredTo"] as const) delete carry[k];
        await settings.updateOne({ _id: toOwnerId }, { $set: { ...carry, updatedAt: new Date() } }, { session });
      }
      await settings.replaceOne(
        { _id: fromOwnerId },
        { retiredTo: toOwnerId, timeZone: old?.timeZone ?? "Asia/Kolkata", writePolicy: old?.writePolicy ?? "review_sensitive", updatedAt: new Date() },
        { session, upsert: true },
      );
    });
  } finally {
    await session.endSession();
  }
}

/** After background work for `ownerId`: if that guest was upgraded meanwhile, move what landed late. */
export async function sweepRetiredOwner(ownerId: string): Promise<void> {
  const tomb = await collections().settings.findOne({ _id: ownerId }, { projection: { retiredTo: 1 } });
  if (tomb?.retiredTo) await migrateOwner(ownerId, tomb.retiredTo);
}
