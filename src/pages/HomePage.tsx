export default function HomePage({
  role,
  onGoVehicles,
  onGoDashboard,
}: {
  role: "driver" | "admin";
  onGoVehicles: () => void;
  onGoDashboard: () => void;
}) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", color: "white",padding: 16 }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <button
            onClick={onGoVehicles}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Selecionar viatura / Fazer checklist
          </button>

          {role === "admin" && (
            <button
              onClick={onGoDashboard}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #0f172a",
                background: "white",
                color: "#0f172a",
                cursor: "pointer",
              }}
            >
              Dashboard (Administração)
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
