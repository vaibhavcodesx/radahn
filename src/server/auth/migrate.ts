import "server-only";
import { collections, OWNED_COLLECTIONS } from "@/server/db/collections";
import { db, mongo } from "@/server/db/client";

/**
 * Guest → Google upgrade (TRD §4): re-own every guest document in one transaction so a
 * half-migrated account can't happen. user_settings is keyed by ownerId, so it is copied.
 */
export async function migrateOwner(fromOwnerId: string, toOwnerId: string): Promise<void> {
  if (fromOwnerId === toOwnerId) return;
  const database = db();
  const session = mongo().startSession();
  try {
    await session.withTransaction(async () => {
      for (const name of OWNED_COLLECTIONS) {
        await database
          .collection(name)
          .updateMany({ ownerId: fromOwnerId }, { $set: { ownerId: toOwnerId } }, { session });
      }
      const { settings } = collections(database);
      const old = await settings.findOne({ _id: fromOwnerId }, { session });
      if (old) {
        const existing = await settings.findOne({ _id: toOwnerId }, { session });
        if (!existing) await settings.insertOne({ ...old, _id: toOwnerId, displayName: undefined, updatedAt: new Date() }, { session });
        await settings.deleteOne({ _id: fromOwnerId }, { session });
      }
    });
  } finally {
    await session.endSession();
  }
}
