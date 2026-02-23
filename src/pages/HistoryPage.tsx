// src/pages/HistoryPage.tsx
import { useEffect, useMemo, useState } from "react";
import { db, type ChecklistRecord, type Role } from "../db";
import { FIXED_ASSETS } from "../demo/assets.demo";
import { countIssues, hasIssues } from "../utils/checklist";
import { normalizeUserId, userLabel } from "../userLookup";

type Props = Readonly<{
  assetCode: string;
  onOpenChecklist: (id: number) => void;
  onBack: () => void;
}>;

function modeDisplay(mode: ChecklistRecord["mode"], modeDetail?: string): string {
  const detail = (modeDetail ?? "").trim();
  if (mode === "Other" && detail) return `Other — ${detail}`;
  return mode;
}

function roleLabel(role: Role): string {
  return role === "admin" ? "Admin" : "Operator";
}

export default function HistoryPage({ assetCode, onOpenChecklist, onBack }: Props) {
  const [items, setItems] = useState<ChecklistRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const assetName = useMemo(() => {
    const a = FIXED_ASSETS.find((x) => x.code === assetCode);
    return a?.name ?? assetCode;
  }, [assetCode]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Efficient query by indexed field
        const list = await db.checklists.where("assetCode").equals(assetCode).toArray();

        // Most recent first (createdAt is ISO string)
        list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

        if (!cancelled) setItems(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetCode]);

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

  return (
    <div style={pageWrap}>
      <button onClick={onBack} style={btn}>
        ← Back
      </button>

      <h2 style={{ marginTop: 12, color: "var(--text)" }}>History</h2>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        Asset: <b style={{ color: "var(--text)" }}>{assetName}</b>
      </p>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading history...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          No checklists saved for this asset yet.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {items.map((c) => {
            const issue = hasIssues(c);
            const issueCount = countIssues(c);

            const createdById = normalizeUserId(c.createdByUserId);
            const createdByName = userLabel(c.createdByUserId);

            return (
              <li
                key={c.id}
                style={{
                  border: issue
                    ? "2px solid var(--danger)"
                    : "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--bg-surface)",
                  color: "var(--text)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {issue ? "⚠️ " : ""}
                      {new Date(c.createdAt).toLocaleString("en-US")}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Created by: {roleLabel(c.createdByRole)} •{" "}
                      <b style={{ color: "var(--text)" }}>{createdByName}</b> •{" "}
                      <span style={{ color: "var(--text-muted)" }}>
                        ID {createdById || "??????"}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Mode:{" "}
                      <b style={{ color: "var(--text)" }}>
                        {modeDisplay(c.mode, c.modeDetail)}
                      </b>{" "}
                      • Initial odometer:{" "}
                      <b style={{ color: "var(--text)" }}>{c.kmInitial}</b>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Template:{" "}
                      <b style={{ color: "var(--text)" }}>{c.templateId}</b> •
                      Version:{" "}
                      <b style={{ color: "var(--text)" }}>
                        {c.templateVersion}
                      </b>
                    </div>

                    {issue && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          fontWeight: 900,
                          color: "var(--danger)",
                        }}
                      >
                        ⚠️ {issueCount} issue(s)
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenChecklist(c.id!)}
                    style={btn}
                    aria-label={`Open checklist ${c.id ?? ""}`}
                  >
                    Open
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}