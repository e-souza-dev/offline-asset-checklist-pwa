import { USERS } from "./users";

export function normalizeUserId(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 6);
}

export function findUserById(userIdLike: unknown) {
  const userId = normalizeUserId(userIdLike);
  if (!userId) return undefined;
  return USERS.find((u) => normalizeUserId((u as any).userId) === userId);
}

export function userLabel(userIdLike: unknown): string {
  const userId = normalizeUserId(userIdLike);
  const u = findUserById(userId);
  if (!u) return `User ${userId || "??????"}`;
  return `${u.name}`.trim();
}

export function userLabelWithId(userIdLike: unknown): string {
  const userId = normalizeUserId(userIdLike);
  const u = findUserById(userId);
  if (!u) return `User ${userId || "??????"}`;
  return `${u.userId} ${u.name}`.trim();
}