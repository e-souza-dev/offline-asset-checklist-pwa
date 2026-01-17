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

  // Exibir graduação + nome (como você quer)
  return `${u.rank} ${u.name}`.trim();

  // Se quiser com RE junto, troque pela linha abaixo:
  // return `${u.rank} ${u.re} ${u.name}`.trim();
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
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#ffffffff" }}>
      <button
        onClick={onBack}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#0f172a",
          cursor: "pointer",
          color: "#ffffffff",
        }}
      >
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12 }}>Histórico</h2>
      <p style={{ marginTop: 0, color: "rgba(255, 255, 255, 1)" }}>
        Viatura: <b>{vehicleName}</b>
      </p>

      {items.length === 0 ? (
        <p style={{ color: "rgba(255, 255, 255, 1)" }}>
          Nenhum checklist salvo para esta viatura ainda.
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

            const mode = (c as any).mode ?? "(não informado)";
            const kmInitial = Number.isFinite((c as any).kmInitial)
              ? (c as any).kmInitial
              : "(não informado)";

            const templateId = (c as any).templateId ?? "(não informado)";
            const templateVersion = Number.isFinite((c as any).templateVersion)
              ? (c as any).templateVersion
              : "(?)";

            return (
              <li
                key={c.id}
                style={{
                  border: issue ? "2px solid #dc2626" : "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 12,
                  background: "#0f172a",
                  color: "#ffffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {issue ? "⚠️ " : ""}
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                    </div>

                    <div style={{ fontSize: 12, color: "white" }}>
                      Feito por:{" "}
                      {c.createdByRole === "admin" ? "Admin" : "Motorista"} •{" "}
                      <b>{officerLabelLocal((c as any).createdByRe)}</b>
                      {" • "}
                      <span style={{ opacity: 0.8 }}>
                        RE {normalizeRe((c as any).createdByRe)}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "white" }}>
                      Modalidade: <b>{mode}</b> • Km Inicial: <b>{kmInitial}</b>
                    </div>

                    <div style={{ fontSize: 12, color: "white" }}>
                      Template: <b>{templateId}</b> • Versão: <b>{templateVersion}</b>
                    </div>

                    {issue && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#b91c1c",
                        }}
                      >
                        ⚠️ {issueCount} apontamento(s)
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenChecklist(c.id!)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #ffffffff",
                      background: "#0f172a",
                      color: "#ffffffff",
                      cursor: "pointer",
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
