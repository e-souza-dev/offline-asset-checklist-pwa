import { useEffect, useMemo, useState } from "react";
import { db, type ChecklistRecord } from "../db";
import { FIXED_VEHICLES } from "../vehicles";
import { hasIssues, countIssues } from "../utils/checklist";
import { USERS } from "../users";

type Props = {
  vehicleCode: string;
  onOpenChecklist: (id: number) => void;
  onBack: () => void;
};

function normalizeRe(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 6);
}

function officerLabelLocal(createdByRe: unknown): string {
  const re = normalizeRe(createdByRe);
  const u = USERS.find((x: any) => normalizeRe(x.re) === re);
  if (!u) return `RE ${re || "??????"}`;
  return `${u.rank} ${u.name}`.trim();
}

function modeDisplay(c: any): string {
  const mode = String(c?.mode ?? "(não informado)");
  const detail = String(c?.modeDetail ?? "").trim();
  if (mode === "Outros" && detail) return `Outros — ${detail}`;
  return mode;
}

export default function HistoryPage({ vehicleCode, onOpenChecklist, onBack }: Props) {
  const [items, setItems] = useState<ChecklistRecord[]>([]);

  const vehicleName = useMemo(() => {
    const v = FIXED_VEHICLES.find((x) => x.code === vehicleCode);
    return v?.name ?? vehicleCode;
  }, [vehicleCode]);

  async function refresh() {
    const list = await db.checklists
      .where("vehicleCode")
      .equals(vehicleCode)
      .reverse()
      .sortBy("createdAt");

    setItems(list);
  }

  useEffect(() => {
    refresh();
  }, [vehicleCode]);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "var(--text)" }}>
      <button
        onClick={onBack}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg)",
          cursor: "pointer",
          color: "var(--text)",
          fontWeight: 800,
          minHeight: 44,
        }}
      >
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12, color: "var(--text)" }}>Histórico</h2>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        Viatura: <b style={{ color: "var(--text)" }}>{vehicleName}</b>
      </p>

      {items.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Nenhum checklist salvo para esta viatura ainda.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {items.map((c) => {
            const issue = hasIssues(c);
            const issueCount = countIssues(c);

            const kmInitial = Number.isFinite((c as any).kmInitial) ? (c as any).kmInitial : "(não informado)";
            const templateId = (c as any).templateId ?? "(não informado)";
            const templateVersion = Number.isFinite((c as any).templateVersion) ? (c as any).templateVersion : "(?)";

            return (
              <li
                key={c.id}
                style={{
                  border: issue ? "2px solid var(--danger)" : "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 12,
                  background: "var(--bg-surface)",
                  color: "var(--text)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {issue ? "⚠️ " : ""}
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Feito por: {c.createdByRole === "admin" ? "Admin" : "Motorista"} •{" "}
                      <b style={{ color: "var(--text)" }}>{officerLabelLocal((c as any).createdByRe)}</b>{" "}
                      • <span style={{ color: "var(--text-muted)" }}>RE {normalizeRe((c as any).createdByRe)}</span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Modalidade: <b style={{ color: "var(--text)" }}>{modeDisplay(c as any)}</b> • Km Inicial:{" "}
                      <b style={{ color: "var(--text)" }}>{kmInitial}</b>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Template: <b style={{ color: "var(--text)" }}>{templateId}</b> • Versão:{" "}
                      <b style={{ color: "var(--text)" }}>{templateVersion}</b>
                    </div>

                    {issue && (
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "var(--danger)" }}>
                        ⚠️ {issueCount} apontamento(s)
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenChecklist(c.id!)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      cursor: "pointer",
                      minHeight: 44,
                      fontWeight: 800,
                    }}
                  >
                    Abrir
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
