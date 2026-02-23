// src/pages/AssetSelectPage.tsx
import { FIXED_ASSETS } from "../demo/assets.demo";

type Props = Readonly<{
  onSelect: (assetCode: string) => void;
  onHistory: (assetCode: string) => void;
  canSeeHistory: boolean;
}>;

export default function AssetSelectPage({
  onSelect,
  onHistory,
  canSeeHistory,
}: Props) {
  const pageWrap: React.CSSProperties = {
    maxWidth: 820,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
  };

  const card: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 12,
    background: "var(--bg-surface)",
  };

  const btnBase: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    color: "var(--text)",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 44,
  };

  return (
    <div style={pageWrap}>
      <h2 style={{ marginTop: 0, marginBottom: 12, color: "var(--text)" }}>
        Select asset
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
        {FIXED_ASSETS.map((a) => (
          <li key={a.code} style={card}>
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
                  {a.name}
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Code: {a.code}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {canSeeHistory && (
                  <button
                    onClick={() => onHistory(a.code)}
                    style={{
                      ...btnBase,
                      background: "var(--bg)",
                      fontWeight: 600,
                    }}
                  >
                    History
                  </button>
                )}

                <button
                  onClick={() => onSelect(a.code)}
                  style={{
                    ...btnBase,
                    background: "var(--bg-accent)",
                    fontWeight: 800,
                  }}
                >
                  Start checklist
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.4,
        }}
      >
        Demo note: assets are defined locally for portfolio purposes. In a real
        deployment, this catalog could be managed by admins or fetched from a
        backend.
      </div>
    </div>
  );
}