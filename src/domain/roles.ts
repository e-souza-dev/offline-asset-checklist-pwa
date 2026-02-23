export const ROLES = ["admin", "operator"] as const;
export type Role = (typeof ROLES)[number];

export const isRole = (v: unknown): v is Role =>
  typeof v === "string" && (ROLES as readonly string[]).includes(v);