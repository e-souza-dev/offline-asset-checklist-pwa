import { useEffect, useMemo, useState } from "react";
import { db, type ChecklistRecord } from "../db";
import { FIXED_VEHICLES } from "../vehicles";
import { hasIssues, countIssues } from "../utils/checklist";
import { USERS } from "../users";

type Props = {
  checklistId: number;
  onBack: () => void;
  canDelete?: boolean;
  onDeleted?: () => void;
};

function normalizeRe(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 6);
}

function officerLabel(createdByRe: unknown): string {
  const re = normalizeRe(createdByRe);
  const u = USERS.find((x: any) => normalizeRe(x.re) === re);
  if (!u) return `RE ${re || "??????"}`;
  return `${u.rank} ${u.name}`.trim();
}

function modeDisplay(item: any): string {
  const mode = String(item?.mode ?? "(não informado)");
  const detail = String(item?.modeDetail ?? "").trim();
  if (mode === "Outros" && detail) return `Outros — ${detail}`;
  return mode;
}

export default function ChecklistDetailPage({ checklistId, onBack, canDelete = false, onDeleted }: Props) {
  const [item, setItem] = useState<ChecklistRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const found = await db.checklists.get(checklistId);
      setItem(found ?? null);
    })();
  }, [checklistId]);

  const vehicleName = useMemo(() => {
    if (!item) return "";
    const v = FIXED_VEHICLES.find((x) => x.code === item.vehicleCode);
    return v?.name ?? item.vehicleCode;
  }, [item]);

  async function handleDelete() {
    if (!canDelete) return;
    if (!item) return;

    const ok = window.confirm("Confirma excluir este checklist? Esta ação não pode ser desfeita.");
    if (!ok) return;

    try {
      setBusy(true);
      setMsg(null);
      await db.checklists.delete(checklistId);
      setMsg("Checklist excluído com sucesso.");
      onDeleted?.();
    } catch {
      setMsg("Falha ao excluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

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
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "var(--text)" }}>
        <button onClick={onBack} style={btn}>
          ← Voltar
        </button>

        <p style={{ marginTop: 12, color: "var(--text-muted)" }}>Carregando checklist...</p>
      </div>
    );
  }

  const kmInitial = Number.isFinite((item as any).kmInitial) ? (item as any).kmInitial : "(não informado)";
  const templateId = (item as any).templateId ?? "(não informado)";
  const templateVersion = Number.isFinite((item as any).templateVersion) ? (item as any).templateVersion : "(?)";

  const issue = hasIssues(item);
  const issueCount = countIssues(item);

  const createdRe = normalizeRe((item as any).createdByRe);
  const createdLabel = officerLabel((item as any).createdByRe);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "var(--text)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={onBack} style={btn}>
          ← Voltar
        </button>

        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={busy}
            style={{
              ...btn,
              border: "2px solid var(--danger)",
              color: "var(--text)",
              background: "var(--bg-surface)",
              opacity: busy ? 0.75 : 1,
            }}
          >
            {busy ? "Excluindo..." : "Excluir checklist"}
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
          Viatura: <b>{vehicleName}</b>
        </div>

        <div>
          Data: <b>{new Date(item.createdAt).toLocaleString("pt-BR")}</b>
        </div>

        <div>
          Feito por:{" "}
          <b>
            {item.createdByRole === "admin" ? "Admin" : "Motorista"} • {createdLabel} • RE {createdRe}
          </b>
        </div>

        <div>
          Modalidade: <b>{modeDisplay(item as any)}</b> • Km Inicial: <b>{kmInitial}</b>
        </div>

        <div>
          Template: <b>{templateId}</b> • Versão: <b>{templateVersion}</b>
        </div>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 10,
            border: msg.includes("sucesso") ? "1px solid var(--border)" : "2px solid var(--danger)",
            background: "var(--bg-surface-2)",
            color: "var(--text)",
            fontWeight: 800,
            fontSize: 13,
          }}
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
          ⚠️ Este checklist possui {issueCount} apontamento(s).
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
            a.type === "yesno" ? (a.value === "no" ? "Não" : "Sim") : (a.value as string) || "(vazio)";

          return (
            <div
              key={a.key}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 10,
                border: isIssue ? "2px solid var(--danger)" : "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            >
              <div style={{ fontWeight: 900, color: "var(--text)" }}>
                {isIssue ? "⚠️ " : ""}
                {a.label}
              </div>

              <div style={{ marginTop: 6, color: "var(--text-muted)" }}>{valueText}</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
