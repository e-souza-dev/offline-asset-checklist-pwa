import { FIXED_VEHICLES } from "../vehicles";

export default function VehicleSelectPage({
  onSelect,
  onHistory,
  canSeeHistory,
}: {
  onSelect: (vehicleCode: string) => void;
  onHistory: (vehicleCode: string) => void;
  canSeeHistory: boolean;
}) {
  return (
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: 16,
        color: "var(--text)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12, color: "var(--text)" }}>
        Selecionar viatura
      </h2>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 10,
        }}
      >
        {FIXED_VEHICLES.map((v) => (
          <li
            key={v.code}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 12,
              background: "var(--bg-surface)",
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
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 800, color: "var(--text)" }}>
                  {v.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {v.plate ? `Placa: ${v.plate}` : "Placa: (não informada)"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canSeeHistory && (
                  <button
                    onClick={() => onHistory(v.code)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Histórico
                  </button>
                )}

                <button
                  onClick={() => onSelect(v.code)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-accent)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Fazer checklist
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
