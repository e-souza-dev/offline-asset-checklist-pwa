// src/users.ts

import type { Role } from "./auth";

/**
 * Demo users for the portfolio build.
 */

export type UserRole = Role;

export type User = Readonly<{
  userId: string; // 6 digits
  name: string;
  role: UserRole;
}>;

// Demo users (portfolio)
export const USERS = [
  { userId: "100001", name: "Alex Silva", role: "admin" },
  { userId: "100002", name: "Bruna Costa", role: "operator" },
  { userId: "100003", name: "Carlos Lima", role: "operator" },
  { userId: "100004", name: "Dani Souza", role: "operator" },
] as const satisfies readonly User[];

/**
 * Keeps only digits and limits to 6 chars.
 * Returns "" when input is nullish/invalid.
 */
export function normalizeUserId(input: unknown): string {
  if (typeof input === "string") return input.replace(/\D/g, "").slice(0, 6);
  if (typeof input === "number" && Number.isFinite(input))
    return String(input).replace(/\D/g, "").slice(0, 6);
  return "";
}

export function isValidUserId(userId: string): boolean {
  return /^\d{6}$/.test(userId);
}

export function getUserById(userId: string): User | undefined {
  const id = normalizeUserId(userId);
  if (!isValidUserId(id)) return undefined;
  return USERS.find((u) => u.userId === id);
}

export function formatUserDisplay(u: Pick<User, "userId" | "name">): string {
  const id = normalizeUserId(u.userId);
  return `${u.name} • ID ${id}`.trim();
}