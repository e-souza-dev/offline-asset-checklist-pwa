import { USERS } from "./users";

export function normalizeRe(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 6);
}

export function findUserByRe(createdByRe: unknown) {
  const re = normalizeRe(createdByRe);
  if (!re) return undefined;
  return USERS.find((u: any) => normalizeRe(u.re) === re);
}

export function officerLabel(createdByRe: unknown): string {
  const re = normalizeRe(createdByRe);
  const u = findUserByRe(re);
  if (!u) return `RE ${re || "??????"}`;
  return `${u.rank} ${u.name}`.trim(); // "Sd PM E. Souza"
}

// Se quiser exibir também o RE no nome:
// export function officerLabelWithRe(createdByRe: unknown): string {
//   const re = normalizeRe(createdByRe);
//   const u = findUserByRe(re);
//   if (!u) return `RE ${re || "??????"}`;
//   return `${u.rank} ${u.re} ${u.name}`.trim(); // "Sd PM 201446 E. Souza"
// }
