// src/seed.ts
import { db } from "./db";
import { USERS } from "./users";

/**
 * Ensures initial demo data exists.
 * - Seeds admin users only if none exist
 * - Safe for multiple calls (idempotent behavior)
 */
export async function ensureSeedData(): Promise<void> {
  const adminCount = await db.admins.count();
  if (adminCount > 0) return;

  const now = new Date().toISOString();

  const adminUsers = USERS
    .filter((u) => u.role === "admin")
    .map((u) => ({
      userId: u.userId.trim(),
      createdAt: now,
    }));

  if (adminUsers.length === 0) return;

  await db.admins.bulkAdd(adminUsers);
}