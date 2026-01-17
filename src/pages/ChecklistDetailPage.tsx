import { useEffect, useMemo, useState } from "react";
import { db, type ChecklistRecord } from "../db";
import { FIXED_VEHICLES } from "../vehicles";
import { hasIssues, countIssues } from "../utils/checklist";
import { USERS } from "../users";

type Props = {
  checklistId: number;
  onBack: () => void;
};

function normalizeRe(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 6);
}

function officerLabel(createdByRe: unknown): string {
  const re = normalizeRe(createdByRe);
  const u = USERS.find((x: any) => normalizeRe(x.re) === re);
  if (!u) return `RE ${re || "??????"}`;
  return `${u.rank} ${u.name}`.trim(); // Ex: "Sd PM E. Souza"
}

export default function ChecklistDetailPage({ checklistId, onBack }: Props) {
  const [item, setItem] = useState<ChecklistRecord | null>(null);

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

  if (!item) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#0f172a" }}>
        <button
          onClick={onBack}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            color: "#0f172a",
          }}
        >
          ← Voltar
        </button>

        <p style={{ marginTop: 12, color: "rgba(15,23,42,0.85)" }}>
          Carregando checklist...
        </p>
      </div>
    );
  }

  const mode = (item as any).mode ?? "(não informado)";
  const kmInitial = Number.isFinite((item as any).kmInitial)
    ? (item as any).kmInitial
    : "(não informado)";
  const templateId = (item as any).templateId ?? "(não informado)";
  const templateVersion = Number.isFinite((item as any).templateVersion)
    ? (item as any).templateVersion
    : "(?)";

  const issue = hasIssues(item);
  const issueCount = countIssues(item);

  const createdRe = normalizeRe((item as any).createdByRe);
  const createdLabel = officerLabel((item as any).createdByRe);

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#0f172a" }}>
      <button
        onClick={onBack}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "white",
          cursor: "pointer",
          color: "#0f172a",
        }}
      >
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12 }}>
        {issue ? "⚠️ " : ""}
        Checklist
      </h2>

<div
  style={{
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    background: "#202124",          // cinza estilo ChatGPT
    border: "1px solid #202124",
    color: "white",
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
      {item.createdByRole === "admin" ? "Admin" : "Motorista"} • {createdLabel} •
      RE {createdRe}
    </b>
  </div>

  <div>
    Modalidade: <b>{mode}</b> • Km Inicial: <b>{kmInitial}</b>
  </div>

  <div>
    Template: <b>{templateId}</b> • Versão: <b>{templateVersion}</b>
  </div>
</div>


      {issue && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 10,
            border: "2px solid #dc2626",
            background: "#fef2f2",
            color: "#b91c1c",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          ⚠️ Este checklist possui {issueCount} apontamento(s).
        </div>
      )}

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "transparent",
          color: "#0f172a",
        }}
      >
        {item.answers.map((a) => {
          const isIssue = a.type === "yesno" && a.value === "no";
          const valueText =
            a.type === "yesno"
              ? a.value === "no"
                ? "Não"
                : "Sim"
              : (a.value as string) || "(vazio)";

          return (
            <div
              key={a.key}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border: isIssue ? "2px solid #dc2626" : "1px solid #f1f5f9",
                background: isIssue ? "#fef2f2" : "white",
                color: "#0f172a",
              }}
            >
              <div style={{ fontWeight: 800, color: "#0f172a" }}>
                {isIssue ? "⚠️ " : ""}
                {a.label}
              </div>

              <div style={{ marginTop: 6, color: "rgba(15,23,42,0.9)" }}>
                {valueText}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
