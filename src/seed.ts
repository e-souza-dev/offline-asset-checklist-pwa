import { db } from "./db";

const ADMIN_RES = [
  "138875",
  "134640",
  "201446",
];

export async function ensureSeedData() {
  const existingAdmin = await db.admins.toCollection().first();
  if (!existingAdmin) {
    const now = new Date().toISOString();
    await db.admins.bulkAdd(ADMIN_RES.map((re) => ({ re, createdAt: now })));
  }
}
