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
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Selecionar viatura</h2>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {FIXED_VEHICLES.map((v) => (
          <li
            key={v.code}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
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
                <div style={{ fontWeight: 900 }}>{v.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {v.plate ? `Placa: ${v.plate}` : "Placa: (não informada)"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {canSeeHistory && (
                  <button
                    onClick={() => onHistory(v.code)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #0f172a",
                      background: "white",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    Histórico
                  </button>
                )}

                <button
                  onClick={() => onSelect(v.code)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #0f172a",
                    background: "#0f172a",
                    color: "white",
                    cursor: "pointer",
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
