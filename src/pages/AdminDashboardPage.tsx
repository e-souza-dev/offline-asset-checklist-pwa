// src/pages/AdminDashboardPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { db, type ChecklistRecord, type OperationMode } from "../db";
import { FIXED_ASSETS } from "../demo/assets.demo";
import { countIssues, hasIssues } from "../utils/checklist";
import { userLabel } from "../userLookup";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(s: string) {
  const text = String(s ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function isoFromLocalDateStart(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

function isoFromLocalDateEnd(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return dt.toISOString();
}

/**
 * Portfolio-safe modes (no institution-specific labels)
 */
const MODES: readonly OperationMode[] = [
  "Routine",
  "Administrative",
  "Mobile Unit",
  "Special Duty",
  "Other",
] as const;

function isValidMode(value: unknown): value is OperationMode {
  return (
    typeof value === "string" &&
    (MODES as readonly string[]).includes(value)
  );
}

function safeNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

type ImportedAnswer = {
  key?: unknown;
  label?: unknown;
  type?: unknown;
  value?: unknown;
};

type ImportedChecklist = {
  // accept old/new keys
  assetCode?: unknown;
  vehicleCode?: unknown;

  createdAt?: unknown;

  createdByUserId?: unknown;
  createdById?: unknown;
  createdByRe?: unknown;

  createdByRole?: unknown;

  mode?: unknown;
  modeDetail?: unknown;

  kmInitial?: unknown;

  templateId?: unknown;
  templateVersion?: unknown;

  answers?: unknown;
};

/**
 * Clean import normalization (portfolio build):
 * - Supports common alias fields (assetCode/vehicleCode, createdByUserId/createdById/createdByRe)
 * - Normalizes into current schema (assetCode, createdByUserId)
 * - Does NOT try to preserve legacy role names (anything non-admin becomes operator)
 */
function normalizeImportedRecord(raw: ImportedChecklist): Omit<ChecklistRecord, "id"> | null {
  if (!raw || typeof raw !== "object") return null;

  const assetCode = String(raw.assetCode ?? raw.vehicleCode ?? "").trim();
  const createdAt = String(raw.createdAt ?? "").trim();

  const createdByUserId = String(
    raw.createdByUserId ?? raw.createdById ?? raw.createdByRe ?? ""
  ).trim();

  if (!assetCode || !createdAt || !createdByUserId) return null;

  const createdByRole: "operator" | "admin" =
    raw.createdByRole === "admin" ? "admin" : "operator";

  const mode: OperationMode = isValidMode(raw.mode) ? raw.mode : "Other";

  const kmN = safeNumber(raw.kmInitial);
  const kmInitial = kmN !== null && kmN >= 0 ? Math.floor(kmN) : 0;

  const templateId = String(raw.templateId ?? "").trim() || "UNKNOWN";
  const tv = safeNumber(raw.templateVersion);
  const templateVersion =
    tv !== null && tv !== undefined ? Math.floor(tv) : 1;

  const answersRaw = Array.isArray(raw.answers) ? raw.answers : [];
  const answers = answersRaw
    .filter((a): a is ImportedAnswer => !!a && typeof a === "object")
    .map((a) => {
      const key = String(a.key ?? "").trim();
      const label = String(a.label ?? "").trim();
      const type = a.type === "text" ? "text" : "yesno";

      const value =
        type === "text"
          ? String(a.value ?? "")
          : a.value === "no"
            ? "no"
            : "yes";

      return { key, label, type, value } as const;
    })
    .filter((a) => a.key && a.label);

  const modeDetail = String(raw.modeDetail ?? "").trim();

  return {
    assetCode,
    createdAt,
    createdByUserId,
    createdByRole,
    mode,
    modeDetail,
    kmInitial,
    templateId,
    templateVersion,
    answers,
  };
}

function makeDedupeKey(c: { assetCode: string; createdAt: string; createdByUserId: string }) {
  return `${c.assetCode}|${c.createdAt}|${c.createdByUserId}`;
}

function modeDisplay(mode: ChecklistRecord["mode"], modeDetail?: string): string {
  const detail = (modeDetail ?? "").trim();
  if (mode === "Other" && detail) return `Other — ${detail}`;
  return mode;
}

type Props = Readonly<{
  onOpenChecklist: (id: number) => void;
  onBack: () => void;
}>;

export default function AdminDashboardPage({ onOpenChecklist, onBack }: Props) {
  const [all, setAll] = useState<ChecklistRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [swStatus, setSwStatus] = useState<string>("Checking...");

  // filters
  const [filterAsset, setFilterAsset] = useState<string>("");
  const [filterMode, setFilterMode] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");

  async function refresh() {
    setLoading(true);
    try {
      const list = await db.checklists.orderBy("createdAt").reverse().toArray();
      setAll(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!("serviceWorker" in navigator)) {
          if (!cancelled) setSwStatus("Service Worker: not supported in this browser.");
          return;
        }

        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          if (!cancelled) setSwStatus("Service Worker: not registered.");
          return;
        }

        const active = !!reg.active;
        const controller = !!navigator.serviceWorker.controller;

        if (!cancelled) {
          if (active && controller) setSwStatus("Service Worker: active (controlling the app).");
          else if (active) setSwStatus("Service Worker: active (awaiting control/refresh).");
          else setSwStatus("Service Worker: registered (no active worker).");
        }
      } catch {
        if (!cancelled) setSwStatus("Service Worker: failed to check status.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalsByAsset = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of all) {
      map.set(c.assetCode, (map.get(c.assetCode) ?? 0) + 1);
    }
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;

    if (filterAsset) list = list.filter((c) => c.assetCode === filterAsset);
    if (filterMode) list = list.filter((c) => c.mode === filterMode);

    const userSearch = filterUserId.trim();
    if (userSearch) {
      list = list.filter((c) => c.createdByUserId.includes(userSearch));
    }

    if (dateFrom) {
      const fromIso = isoFromLocalDateStart(dateFrom);
      list = list.filter((c) => c.createdAt >= fromIso);
    }

    if (dateTo) {
      const toIso = isoFromLocalDateEnd(dateTo);
      list = list.filter((c) => c.createdAt <= toIso);
    }

    return list;
  }, [all, filterAsset, filterMode, filterUserId, dateFrom, dateTo]);

  function clearFilters() {
    setFilterAsset("");
    setFilterMode("");
    setFilterUserId("");
    setDateFrom("");
    setDateTo("");
  }

  function exportJSON(data: ChecklistRecord[], scopeLabel: string) {
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: scopeLabel,
      total: data.length,
      filters: {
        asset: filterAsset || null,
        mode: filterMode || null,
        userId: filterUserId.trim() || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
      data,
    };

    downloadFile(
      `checklists-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function exportCSVSummary(data: ChecklistRecord[], scopeLabel: string) {
    const header = [
      "id",
      "assetCode",
      "assetName",
      "createdAt",
      "createdByRole",
      "createdByUserId",
      "mode",
      "modeDetail",
      "kmInitial",
      "templateId",
      "templateVersion",
      "notes",
    ].join(",");

    const lines = [header];

    for (const c of data) {
      const a = FIXED_ASSETS.find((x) => x.code === c.assetCode);
      const assetName = a?.name ?? c.assetCode;

      const notes = c.answers.find((x) => x.key === "obs")?.value ?? "";

      lines.push(
        [
          c.id ?? "",
          c.assetCode,
          csvEscape(assetName),
          c.createdAt,
          c.createdByRole,
          c.createdByUserId,
          csvEscape(String(c.mode)),
          csvEscape(String(c.modeDetail ?? "")),
          csvEscape(String(c.kmInitial)),
          csvEscape(String(c.templateId)),
          csvEscape(String(c.templateVersion)),
          csvEscape(String(notes)),
        ].join(",")
      );
    }

    downloadFile(
      `checklists-summary-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv"
    );
  }

  function exportCSVDetailed(data: ChecklistRecord[], scopeLabel: string) {
    const header = [
      "checklistId",
      "assetCode",
      "assetName",
      "createdAt",
      "createdByRole",
      "createdByUserId",
      "mode",
      "modeDetail",
      "kmInitial",
      "templateId",
      "templateVersion",
      "itemKey",
      "itemLabel",
      "itemType",
      "itemValue",
    ].join(",");

    const lines = [header];

    for (const c of data) {
      const a = FIXED_ASSETS.find((x) => x.code === c.assetCode);
      const assetName = a?.name ?? c.assetCode;

      for (const ans of c.answers) {
        lines.push(
          [
            c.id ?? "",
            c.assetCode,
            csvEscape(assetName),
            c.createdAt,
            c.createdByRole,
            c.createdByUserId,
            csvEscape(String(c.mode)),
            csvEscape(String(c.modeDetail ?? "")),
            csvEscape(String(c.kmInitial)),
            csvEscape(String(c.templateId)),
            csvEscape(String(c.templateVersion)),
            csvEscape(ans.key),
            csvEscape(ans.label),
            csvEscape(ans.type),
            csvEscape(String(ans.value ?? "")),
          ].join(",")
        );
      }
    }

    downloadFile(
      `checklists-detailed-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv"
    );
  }

  async function handleImportFile(file: File) {
    setImportStatus("Importing...");

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);

      const rawList: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as any)?.data)
          ? (parsed as any).data
          : [];

      if (!Array.isArray(rawList) || rawList.length === 0) {
        setImportStatus("JSON file does not contain a checklist list (empty data).");
        return;
      }

      const existing = await db.checklists.toArray();
      const existingKeys = new Set<string>(
        existing.map((c) =>
          makeDedupeKey({
            assetCode: c.assetCode,
            createdAt: c.createdAt,
            createdByUserId: c.createdByUserId,
          })
        )
      );

      let validCount = 0;
      let addedCount = 0;
      let skippedDup = 0;
      let skippedInvalid = 0;

      const toAdd: Omit<ChecklistRecord, "id">[] = [];

      for (const raw of rawList) {
        const normalized = normalizeImportedRecord(raw as ImportedChecklist);
        if (!normalized) {
          skippedInvalid++;
          continue;
        }

        validCount++;

        const key = makeDedupeKey(normalized);
        if (existingKeys.has(key)) {
          skippedDup++;
          continue;
        }

        existingKeys.add(key);
        toAdd.push(normalized);
      }

      if (toAdd.length > 0) {
        await db.checklists.bulkAdd(toAdd);
        addedCount = toAdd.length;
      }

      await refresh();

      setImportStatus(
        `Import completed. Read: ${rawList.length} • Valid: ${validCount} • Imported: ${addedCount} • Duplicates skipped: ${skippedDup} • Invalid skipped: ${skippedInvalid}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportStatus(`Import failed: ${msg}`);
    }
  }

  function clickImport() {
    setImportStatus("");
    fileInputRef.current?.click();
  }

  const pageWrap: React.CSSProperties = {
    maxWidth: 980,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
  };

  const card: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 16,
    background: "var(--bg-surface)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    cursor: "pointer",
    minHeight: 44,
    fontWeight: 700,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--text)",
    cursor: "pointer",
    minHeight: 44,
    fontWeight: 900,
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--text)",
    boxSizing: "border-box",
    outline: "none",
    minHeight: 44,
  };

  const label: React.CSSProperties = {
    fontWeight: 900,
    marginBottom: 6,
    color: "var(--text)",
  };

  const help: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 8,
    lineHeight: 1.35,
  };

  return (
    <div style={pageWrap}>
      <button onClick={onBack} style={btn}>
        ← Back
      </button>

      <h2 style={{ marginTop: 12, marginBottom: 6, color: "var(--text)" }}>
        Admin Dashboard
      </h2>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        Total saved checklists:{" "}
        <b style={{ color: "var(--text)" }}>{all.length}</b> • Showing
        (filtered):{" "}
        <b style={{ color: "var(--text)" }}>{filtered.length}</b>
        {loading ? " • Loading..." : ""}
      </p>

      {/* App Status */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>App Status</h3>
        <div style={help}>{swStatus}</div>
        <div style={help}>
          Tip: to validate PWA behavior, run{" "}
          <b style={{ color: "var(--text)" }}>npm run preview</b> (port 4173).
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          if (f) handleImportFile(f);
        }}
      />

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>
          Backup (export / import)
        </h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => exportJSON(filtered, "filtered")} style={btnPrimary}>
            Export JSON (filtered)
          </button>

          <button onClick={() => exportJSON(all, "all")} style={btn}>
            Export JSON (all)
          </button>

          <button onClick={clickImport} style={btn}>
            Import JSON backup
          </button>
        </div>

        {importStatus && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
            {importStatus}
          </div>
        )}

        <div style={help}>
          Import adds records that did not exist yet. Duplicates are ignored
          (asset + timestamp + user).
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Export CSV</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => exportCSVSummary(filtered, "filtered")} style={btnPrimary}>
            CSV summary (filtered)
          </button>

          <button onClick={() => exportCSVDetailed(filtered, "filtered")} style={btn}>
            CSV detailed (filtered)
          </button>

          <span style={{ width: 16 }} />

          <button onClick={() => exportCSVSummary(all, "all")} style={btn}>
            CSV summary (all)
          </button>

          <button onClick={() => exportCSVDetailed(all, "all")} style={btn}>
            CSV detailed (all)
          </button>
        </div>

        <div style={help}>
          Summary = 1 row per checklist. Detailed = 1 row per checklist item
          (better for analytics/auditing).
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Filters</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={label}>Asset</div>
            <select value={filterAsset} onChange={(e) => setFilterAsset(e.target.value)} style={input}>
              <option value="">(all)</option>
              {FIXED_ASSETS.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>Mode</div>
            <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} style={input}>
              <option value="">(all)</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>User ID (contains)</div>
            <input
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="Ex: 100 (matches 100001)"
              style={input}
              inputMode="numeric"
            />
          </div>

          <div>
            <div style={label}>Date (from)</div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={input} />
          </div>

          <div>
            <div style={label}>Date (to)</div>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={input} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={clearFilters} style={btn}>
            Clear filters
          </button>

          <button onClick={refresh} style={btn}>
            Refresh data
          </button>
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Totals by asset</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {FIXED_ASSETS.map((a) => (
            <li
              key={a.code}
              style={{
                display: "flex",
                justifyContent: "space-between",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 10,
                background: "var(--bg)",
                color: "var(--text)",
              }}
            >
              <span>
                <b>{a.name}</b>
              </span>
              <span style={{ fontWeight: 900 }}>{totalsByAsset.get(a.code) ?? 0}</span>
            </li>
          ))}
        </ul>
        <div style={help}>
          Note: this summary is based on all stored records. The list below is filtered.
        </div>
      </section>

      <section style={card}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Checklists (filtered)</h3>

        {filtered.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No checklists found with current filters.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {filtered.map((c) => {
              const a = FIXED_ASSETS.find((x) => x.code === c.assetCode);
              const assetName = a?.name ?? c.assetCode;

              const issue = hasIssues(c);
              const issueCount = countIssues(c);

              return (
                <li
                  key={c.id}
                  style={{
                    border: issue ? "2px solid var(--danger)" : "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--bg)",
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
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontWeight: 900, color: "var(--text)" }}>
                        {issue ? "⚠️ " : ""}
                        {assetName}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(c.createdAt).toLocaleString("en-US")} • {userLabel(c.createdByUserId)}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Mode:{" "}
                        <b style={{ color: "var(--text)" }}>
                          {modeDisplay(c.mode, c.modeDetail)}
                        </b>{" "}
                        • Initial km: <b style={{ color: "var(--text)" }}>{c.kmInitial}</b>
                      </div>

                      {issue && (
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "var(--danger)" }}>
                          ⚠️ {issueCount} issue(s) found
                        </div>
                      )}
                    </div>

                    <button onClick={() => onOpenChecklist(c.id!)} style={btn}>
                      Open
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}