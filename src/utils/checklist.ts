import type { ChecklistRecord } from "../db";

export function hasIssues(checklist: ChecklistRecord): boolean {
  return checklist.answers.some(
    (a) => a.type === "yesno" && a.value === "no"
  );
}

export function countIssues(checklist: ChecklistRecord): number {
  return checklist.answers.filter(
    (a) => a.type === "yesno" && a.value === "no"
  ).length;
}
