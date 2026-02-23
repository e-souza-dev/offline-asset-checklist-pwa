// src/utils/checklist.ts
import type { ChecklistAnswer, ChecklistRecord } from "../db";

/**
 * Type guard: narrows a ChecklistAnswer to a negative yes/no answer.
 */
export function isNegativeYesNoAnswer(
  answer: ChecklistAnswer
): answer is ChecklistAnswer & { type: "yesno"; value: "no" } {
  return answer.type === "yesno" && answer.value === "no";
}

/**
 * Returns only answers that represent issues.
 */
export function getIssueAnswers(
  checklist: ChecklistRecord
): ChecklistAnswer[] {
  return checklist.answers.filter(isNegativeYesNoAnswer);
}

/**
 * Returns total number of issues in a checklist.
 */
export function countIssues(checklist: ChecklistRecord): number {
  return getIssueAnswers(checklist).length;
}

/**
 * Returns whether the checklist contains any issues.
 */
export function hasIssues(checklist: ChecklistRecord): boolean {
  return countIssues(checklist) > 0;
}

/**
 * Returns a stable summary object useful for dashboards / exports.
 */
export function summarizeChecklist(checklist: ChecklistRecord) {
  const issueAnswers = getIssueAnswers(checklist);

  return {
    id: checklist.id ?? null,
    assetCode: checklist.assetCode,
    createdAt: checklist.createdAt,
    createdByUserId: checklist.createdByUserId,
    createdByRole: checklist.createdByRole,
    mode: checklist.mode,
    kmInitial: checklist.kmInitial,
    totalItems: checklist.answers.length,
    totalIssues: issueAnswers.length,
    hasIssues: issueAnswers.length > 0,
  } as const;
}