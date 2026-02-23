// src/auth.ts
/**
 * Offline session management (no backend).
 * - TTL expiration
 */

export type Role = "admin" | "operator";

export type Session = Readonly<{
  role: Role;
  userId: string;
  createdAt: string; // ISO
}>;

const KEY = "offline_asset_checklist_session_v1";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "operator";
}

function isISODateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;
  return (
    isRole(v.role) &&
    typeof v.userId === "string" &&
    v.userId.trim().length > 0 &&
    isISODateString(v.createdAt)
  );
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSession(parsed)) {
      clearSession();
      return null;
    }

    const age = Date.now() - Date.parse(parsed.createdAt);
    if (!Number.isFinite(age) || age > TTL_MS) {
      clearSession();
      return null;
    }

    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(input: Omit<Session, "createdAt">): Session {
  const session: Session = {
    role: input.role,
    userId: input.userId.trim(),
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}