// src/pages/ChecklistFillPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { db, type ChecklistAnswer, type OperationMode } from "../db";
import { FIXED_ASSETS } from "../demo/assets.demo";
import { TEMPLATES } from "../checklists/templates";

function formatTagDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = d
    .toLocaleString("en-US", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mmm}${yy}`;
}

const MODES: readonly OperationMode[] = [
  "Routine",
  "Administrative",
  "Mobile Unit",
  "Special Duty",
  "Other",
] as const;

type Props = Readonly<{
  assetCode: string;
  createdByUserId: string;
  createdByRole: "operator" | "admin";
  onSaved: (checklistId: number) => void;
  onBack: () => void;
}>;

type TemplateItem = Readonly<{
  key: string;
  label: string;
  type: "yesno" | "text";
}>;

type Template = Readonly<{
  templateId: string;
  version: number;
  title: string;
  items: readonly TemplateItem[];
}>;

type ValuesByKey = Record<string, string>;

function initValues(template: Template | null): ValuesByKey {
  const initial: ValuesByKey = {};
  const items = template?.items ?? [];
  for (const item of items) {
    initial[item.key] = item.type === "yesno" ? "yes" : "";
  }
  return initial;
}

function isISODateString(v: unknown): v is string {
  return typeof v === "string" && Number.isFinite(Date.parse(v));
}

function parseKm(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const km = Number(trimmed);
  if (!Number.isFinite(km) || km < 0) return null;
  return Math.floor(km);
}

type ChecklistListRow = Readonly<{
  createdAt: string;
  kmInitial: number;
}>;

export default function ChecklistFillPage({
  assetCode,
  createdByUserId,
  createdByRole,
  onSaved,
  onBack,
}: Props) {
  const asset = useMemo(
    () => FIXED_ASSETS.find((a) => a.code === assetCode) ?? null,
    [assetCode]
  );

  const template = useMemo<Template | null>(() => {
    if (!asset) return null;
    const t = TEMPLATES[asset.model];
    return t
      ? {
          templateId: t.templateId,
          version: t.version,
          title: t.title,
          items: t.items,
        }
      : null;
  }, [asset]);

  const todayTag = useMemo(() => formatTagDate(new Date()), []);

  const [mode, setMode] = useState<OperationMode | "">("");
  const [modeDetail, setModeDetail] = useState<string>("");
  const [kmInitial, setKmInitial] = useState<string>("");

  const [values, setValues] = useState<ValuesByKey>(() => initValues(template));
  const [error, setError] = useState<string | null>(null);

  // prevent double save
  const [isSaving, setIsSaving] = useState(false);

  // invalid highlights
  const [invalidMode, setInvalidMode] = useState(false);
  const [invalidModeDetail, setInvalidModeDetail] = useState(false);
  const [invalidKm, setInvalidKm] = useState(false);

  // refs to scroll
  const modeRef = useRef<HTMLDivElement | null>(null);
  const kmRef = useRef<HTMLDivElement | null>(null);

  // operator success screen
  const [savedOk, setSavedOk] = useState(false);

  // km validation: last km by asset
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [needKmConfirm, setNeedKmConfirm] = useState(false);

  // Reset values if template changes (edge-case safety)
  useEffect(() => {
    setValues(initValues(template));
  }, [template?.templateId, template?.version]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Grab only the fields we need (createdAt, kmInitial) and compute "latest" safely.
        const list = (await db.checklists
          .where("assetCode")
          .equals(assetCode)
          .toArray()) as unknown[];

        const candidates: ChecklistListRow[] = list
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const r = x as Record<string, unknown>;
            if (!isISODateString(r.createdAt)) return null;
            if (!Number.isFinite(Number(r.kmInitial))) return null;
            return { createdAt: r.createdAt, kmInitial: Number(r.kmInitial) };
          })
          .filter((x): x is ChecklistListRow => x !== null);

        let latest: ChecklistListRow | null = null;
        for (const c of candidates) {
          if (!latest) latest = c;
          else if (c.createdAt > latest.createdAt) latest = c;
        }

        const km = latest ? Math.floor(latest.kmInitial) : null;
        if (!cancelled) setLastKm(km);
      } catch {
        if (!cancelled) setLastKm(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetCode]);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function save(forceKm = false) {
    if (isSaving) return;

    setError(null);
    setInvalidMode(false);
    setInvalidModeDetail(false);
    setInvalidKm(false);

    if (!asset || !template) {
      setError("Asset/template not found. Check demo assets and templates.");
      return;
    }

    if (!mode) {
      setInvalidMode(true);
      setError("Select an operation mode to continue.");
      scrollTo(modeRef);
      return;
    }

    // Other requires short description
    if (mode === "Other") {
      const d = modeDetail.trim();
      if (d.length < 3) {
        setInvalidModeDetail(true);
        setError("For 'Other', describe briefly (min. 3 characters).");
        scrollTo(modeRef);
        return;
      }
    }

    const km = parseKm(kmInitial);
    if (km === null) {
      setInvalidKm(true);
      setError("Invalid odometer value. Use numbers only (e.g., 54321).");
      scrollTo(kmRef);
      return;
    }

    // km cannot be lower than last without confirmation
    if (lastKm !== null && km < lastKm && !forceKm) {
      setNeedKmConfirm(true);
      setInvalidKm(true);
      setError(
        `Initial odometer is lower than the last saved value for this asset (last: ${lastKm}). ` +
          `If correct (e.g., odometer replacement), confirm to save.`
      );
      scrollTo(kmRef);
      return;
    }

    const answers: ChecklistAnswer[] = template.items.map((item) => {
      if (item.type === "yesno") {
        const v = values[item.key] === "no" ? "no" : "yes";
        return { key: item.key, label: item.label, type: "yesno", value: v };
      }
      return {
        key: item.key,
        label: item.label,
        type: "text",
        value: values[item.key] ?? "",
      };
    });

    try {
      setIsSaving(true);

      const now = new Date().toISOString();

      const id = await db.checklists.add({
        assetCode,
        createdAt: now,
        createdByUserId,
        createdByRole,
        mode,
        modeDetail: mode === "Other" ? modeDetail.trim() : "",
        kmInitial: km,
        templateId: template.templateId,
        templateVersion: template.version,
        answers, // persisted + sanitized by DB hooks too
      });

      // operator: show success screen only
      if (createdByRole === "operator") {
        setSavedOk(true);
        return;
      }

      // admin: open detail
      onSaved(id);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const pageWrap: React.CSSProperties = {
    maxWidth: 820,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
  };

  const styles = {
    btn: {
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      cursor: "pointer",
      minHeight: 48,
      fontSize: 16,
      color: "var(--text)",
      fontWeight: 800,
    } as React.CSSProperties,
    btnPrimary: {
      marginTop: 12,
      width: "100%",
      padding: 14,
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--bg-surface-2)",
      color: "var(--text)",
      cursor: "pointer",
      minHeight: 52,
      fontSize: 16,
      fontWeight: 900,
    } as React.CSSProperties,
    card: {
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 16,
      background: "var(--bg-surface)",
    } as React.CSSProperties,
    label: {
      fontWeight: 900,
      marginBottom: 8,
      fontSize: 16,
      color: "var(--text)",
    } as React.CSSProperties,
    input: (invalid: boolean) =>
      ({
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 12,
        borderRadius: 12,
        border: invalid ? "2px solid var(--danger)" : "1px solid var(--border)",
        fontSize: 16,
        minHeight: 48,
        outline: "none",
        background: "var(--bg-surface-2)",
        color: "var(--text)",
      } as React.CSSProperties),
    hint: {
      marginTop: 6,
      fontSize: 12,
      color: "var(--text-muted)",
      lineHeight: 1.35,
    } as React.CSSProperties,
  };

  // operator success screen
  if (createdByRole === "operator" && savedOk) {
    return (
      <div style={pageWrap}>
        <h2 style={{ marginTop: 0, color: "var(--text)" }}>
          Checklist saved ✅
        </h2>
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
          Record saved successfully.
          <br />
          Asset: <b style={{ color: "var(--text)" }}>{assetCode}</b> • Timestamp:{" "}
          <b style={{ color: "var(--text)" }}>
            {new Date().toLocaleString("en-US")}
          </b>
        </p>

        <button onClick={onBack} style={{ ...styles.btn, width: "100%" }}>
          Back
        </button>
      </div>
    );
  }

  if (!asset || !template) {
    return (
      <div style={pageWrap}>
        <button onClick={onBack} style={styles.btn}>
          ← Back
        </button>
        <p style={{ marginTop: 12, color: "var(--text-muted)" }}>
          Asset/template not found. Check{" "}
          <b style={{ color: "var(--text)" }}>src/demo/assets.demo.ts</b> and{" "}
          <b style={{ color: "var(--text)" }}>src/checklists/templates.ts</b>.
        </p>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <button onClick={onBack} style={styles.btn}>
        ← Back
      </button>

      <h2 style={{ marginTop: 12, fontSize: 22, color: "var(--text)" }}>
        Daily Checklist {todayTag}
      </h2>

      <p style={{ marginTop: 0, color: "var(--text-muted)", lineHeight: 1.35 }}>
        Asset: <b style={{ color: "var(--text)" }}>{asset.code}</b>
        <br />
        Template: <b style={{ color: "var(--text)" }}>{template.title}</b>
        <br />
        User: <b style={{ color: "var(--text)" }}>ID {createdByUserId}</b>
      </p>

      <section style={{ ...styles.card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)", fontSize: 18 }}>
          Session Data
        </h3>

        <div style={{ display: "grid", gap: 12 }}>
          <div ref={modeRef}>
            <div style={styles.label}>Operation mode</div>
            <select
              value={mode}
              onChange={(e) => {
                const next = e.target.value;
                setMode(next === "" ? "" : (next as OperationMode));
                setInvalidMode(false);
                setError(null);
                setNeedKmConfirm(false);

                if (next !== "Other") {
                  setModeDetail("");
                  setInvalidModeDetail(false);
                }
              }}
              style={styles.input(invalidMode)}
            >
              <option value="">Select...</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {mode === "Other" && (
              <div style={{ marginTop: 10 }}>
                <div style={styles.label}>Description (Other)</div>
                <input
                  value={modeDetail}
                  onChange={(e) => {
                    setModeDetail(e.target.value);
                    setInvalidModeDetail(false);
                    setError(null);
                  }}
                  placeholder="e.g., event support, escort, facility checks..."
                  style={styles.input(invalidModeDetail)}
                />
                <div style={styles.hint}>
                  Required when “Other”. Keep it short and objective.
                </div>
              </div>
            )}
          </div>

          <div ref={kmRef}>
            <div style={styles.label}>Initial odometer</div>
            <input
              value={kmInitial}
              onChange={(e) => {
                setKmInitial(e.target.value);
                setInvalidKm(false);
                setError(null);
                setNeedKmConfirm(false);
              }}
              inputMode="numeric"
              placeholder="e.g., 54321"
              style={styles.input(invalidKm)}
            />

            {lastKm !== null && (
              <div style={styles.hint}>
                Last odometer saved for this asset:{" "}
                <b style={{ color: "var(--text)" }}>{lastKm}</b>
              </div>
            )}

            <div style={styles.hint}>
              Timestamp is recorded automatically when you save.
            </div>
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0, fontSize: 18, color: "var(--text)" }}>
          {template.title}
        </h3>

        {template.items.map((item) => (
          <div
            key={item.key}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid var(--border-soft)",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                marginBottom: 10,
                color: "var(--text)",
                fontSize: 16,
              }}
            >
              {item.label}
            </div>

            {item.type === "yesno" ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setValue(item.key, "yes")}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background:
                      values[item.key] === "yes"
                        ? "var(--bg-surface-2)"
                        : "var(--bg)",
                    color: "var(--text)",
                    cursor: "pointer",
                    minHeight: 48,
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setValue(item.key, "no")}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 12,
                    border:
                      values[item.key] === "no"
                        ? "2px solid var(--danger)"
                        : "1px solid var(--border)",
                    background:
                      values[item.key] === "no"
                        ? "var(--bg-surface-2)"
                        : "var(--bg)",
                    color: "var(--text)",
                    cursor: "pointer",
                    minHeight: 48,
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <textarea
                value={values[item.key] ?? ""}
                onChange={(e) => setValue(item.key, e.target.value)}
                placeholder="Write notes..."
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 16,
                  minHeight: 88,
                  background: "var(--bg-surface-2)",
                  color: "var(--text)",
                }}
              />
            )}
          </div>
        ))}

        <button
          onClick={() => save(false)}
          disabled={isSaving}
          style={{
            ...styles.btnPrimary,
            opacity: isSaving ? 0.75 : 1,
          }}
        >
          {isSaving ? "Saving..." : "Save checklist"}
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "2px solid var(--danger)",
              background: "var(--bg-surface-2)",
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            <div>{error}</div>

            {needKmConfirm && (
              <button
                onClick={() => save(true)}
                disabled={isSaving}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  cursor: "pointer",
                  minHeight: 46,
                  fontWeight: 900,
                }}
              >
                Confirm and save anyway
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}