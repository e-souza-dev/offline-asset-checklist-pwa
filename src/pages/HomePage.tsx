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
    <div
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: 16,
        color: "var(--text)",
      }}
    >
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <button
            onClick={onGoVehicles}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-accent)",
              color: "var(--text)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Selecionar viatura / Fazer checklist
          </button>

          {role === "admin" && (
            <button
              onClick={onGoDashboard}
              style={{
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: 500,
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
