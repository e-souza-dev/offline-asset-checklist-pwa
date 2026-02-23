// src/pages/ChecklistDetailPage.tsx
import { useEffect, useMemo, useState } from "react";
import { db, type ChecklistRecord, type Role } from "../db";
import { FIXED_ASSETS } from "../demo/assets.demo";
import { countIssues, hasIssues } from "../utils/checklist";
import { normalizeUserId, userLabel } from "../userLookup";

type Props = Readonly<{
  checklistId: number;
  onBack: () => void;
  canDelete?: boolean;
  onDeleted?: () => void;
}>;

function modeDisplay(mode: ChecklistRecord["mode"], modeDetail?: string): string {
  const detail = (modeDetail ?? "").trim();
  if (mode === "Other" && detail) return `Other — ${detail}`;
  return mode;
}

function roleDisplay(role: Role): string {
  return role === "admin" ? "Admin" : "Operator";
}

export default function ChecklistDetailPage({
  checklistId,
  onBack,
  canDelete = false,
  onDeleted,
}: Props) {
  const [item, setItem] = useState<ChecklistRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const found = await db.checklists.get(checklistId);
      if (!cancelled) setItem(found ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [checklistId]);

  const assetName = useMemo(() => {
    if (!item) return "";
    const a = FIXED_ASSETS.find((x) => x.code === item.assetCode);
    return a?.name ?? item.assetCode;
  }, [item]);

  async function handleDelete() {
    if (!canDelete) return;
    if (!item) return;

    const ok = window.confirm(
      "Delete this checklist? This action cannot be undone."
    );
    if (!ok) return;

    try {
      setBusy(true);
      setMsg(null);
      await db.checklists.delete(checklistId);
      setMsg("Checklist deleted successfully.");
      onDeleted?.();
    } catch {
      setMsg("Failed to delete. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const pageWrap: React.CSSProperties = {
    maxWidth: 820,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    cursor: "pointer",
    color: "var(--text)",
    fontWeight: 800,
    minHeight: 44,
  };

  if (!item) {
    return (
      <div style={pageWrap}>
        <button onClick={onBack} style={btn}>
          ← Back
        </button>

        <p style={{ marginTop: 12, color: "var(--text-muted)" }}>
          Loading checklist...
        </p>
      </div>
    );
  }

  const issue = hasIssues(item);
  const issueCount = countIssues(item);

  const createdById = normalizeUserId(item.createdByUserId);
  const createdLabel = userLabel(item.createdByUserId);

  return (
    <div style={pageWrap}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={onBack} style={btn}>
          ← Back
        </button>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              ...btn,
              border: "2px solid var(--danger)",
              background: "var(--bg-surface)",
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy ? "Deleting..." : "Delete checklist"}
          </button>
        )}
      </div>

      <h2 style={{ marginTop: 12, color: "var(--text)" }}>
        {issue ? "⚠️ " : ""}
        Checklist
      </h2>

      <div
        style={{
          marginTop: 8,
          marginBottom: 12,
          padding: 14,
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          lineHeight: 1.5,
        }}
      >
        <div>
          Asset: <b>{assetName}</b>
        </div>

        <div>
          Date: <b>{new Date(item.createdAt).toLocaleString("en-US")}</b>
        </div>

        <div>
          Created by:{" "}
          <b>
            {roleDisplay(item.createdByRole)} • {createdLabel} • ID{" "}
            {createdById || "??????"}
          </b>
        </div>

        <div>
          Mode: <b>{modeDisplay(item.mode, item.modeDetail)}</b> • Initial
          odometer: <b>{item.kmInitial}</b>
        </div>

        <div>
          Template: <b>{item.templateId}</b> • Version:{" "}
          <b>{item.templateVersion}</b>
        </div>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 10,
            border: msg.toLowerCase().includes("success")
              ? "1px solid var(--border)"
              : "2px solid var(--danger)",
            background: "var(--bg-surface-2)",
            color: "var(--text)",
            fontWeight: 800,
            fontSize: 13,
          }}
          role="status"
        >
          {msg}
        </div>
      )}

      {issue && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 10,
            border: "2px solid var(--danger)",
            background: "var(--bg-surface-2)",
            color: "var(--text)",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          ⚠️ This checklist has {issueCount} issue(s).
        </div>
      )}

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          background: "var(--bg-surface)",
          color: "var(--text)",
        }}
      >
        {item.answers.map((a) => {
          const isIssue = a.type === "yesno" && a.value === "no";

          const valueText =
            a.type === "yesno"
              ? a.value === "no"
                ? "No"
                : "Yes"
              : a.value.trim() || "(empty)";

          return (
            <div
              key={a.key}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 10,
                border: isIssue
                  ? "2px solid var(--danger)"
                  : "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            >
              <div style={{ fontWeight: 900, color: "var(--text)" }}>
                {isIssue ? "⚠️ " : ""}
                {a.label}
              </div>

              <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
                {valueText}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}