// src/LoginPage.tsx
import { useMemo, useState } from "react";
import { DEMO_MODE } from "./config";
import { USERS, getUserById, isValidUserId, normalizeUserId } from "./users";
import { setSession } from "./auth";

type LoginPageProps = Readonly<{
  onLoggedIn: () => void;
}>;

export default function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [userIdInput, setUserIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalizedUserId = useMemo(
    () => normalizeUserId(userIdInput),
    [userIdInput]
  );

  const matchedUser = useMemo(() => {
    if (!isValidUserId(normalizedUserId)) return undefined;
    return getUserById(normalizedUserId);
  }, [normalizedUserId]);

  function loginWithUserId(userId: string) {
    setError(null);

    const normalized = normalizeUserId(userId);

    if (!isValidUserId(normalized)) {
      setError("ID inválido. Digite exatamente 6 números.");
      return;
    }

    const user = getUserById(normalized);
    if (!user) {
      setError("Usuário não encontrado. Use um ID de demonstração.");
      return;
    }

    setSession({
      userId: user.userId,
      role: user.role,
    });

    onLoggedIn();
  }

  function onEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      loginWithUserId(normalizedUserId);
    }
  }

  const demoAdminId = useMemo(
    () => USERS.find((u) => u.role === "admin")?.userId,
    []
  );
  const demoOperatorId = useMemo(
    () => USERS.find((u) => u.role === "operator")?.userId,
    []
  );

  const page: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 16,
  };

  const card: React.CSSProperties = {
    maxWidth: 520,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
    width: "100%",
  };

  const panel: React.CSSProperties = {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg-surface)",
  };

  const label: React.CSSProperties = {
    fontWeight: 800,
    marginBottom: 6,
    color: "var(--text)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--text)",
    outline: "none",
    minHeight: 46,
  };

  const btn: React.CSSProperties = {
    marginTop: 12,
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--text)",
    cursor: "pointer",
    minHeight: 48,
    fontWeight: 800,
  };

  const row: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 12,
  };

  const hint: React.CSSProperties = {
    marginTop: 6,
    fontSize: 12,
    color: "var(--text-muted)",
  };

  const credits: React.CSSProperties = {
    textAlign: "center",
    fontSize: 12,
    opacity: 0.65,
    padding: "10px 0 0",
    color: "var(--text-muted)",
  };

  const demoIdsText = useMemo(() => USERS.map((u) => u.userId).join(", "), []);

  return (
    <div style={page}>
      <div style={card}>
        <h2 style={{ marginTop: 0, color: "var(--text)" }}>Sign in</h2>
        <p style={{ marginTop: 6, color: "var(--text-muted)" }}>
          Offline-first checklist PWA. Use a demo User ID to start a session.
        </p>

        <section style={panel}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={label}>User ID</div>
              <input
                value={userIdInput}
                onChange={(e) => {
                  setUserIdInput(normalizeUserId(e.target.value));
                  setError(null);
                }}
                onKeyDown={onEnter}
                inputMode="numeric"
                placeholder="Ex: 100001"
                style={input}
                aria-invalid={!!error}
                aria-describedby="login-hint"
              />
              {matchedUser ? (
                <div id="login-hint" style={hint}>
                  Matched: <b>{matchedUser.name}</b> ({matchedUser.role})
                </div>
              ) : (
                DEMO_MODE && (
                  <div id="login-hint" style={hint}>
                    Demo IDs: {demoIdsText}
                  </div>
                )
              )}
            </div>

            <button onClick={() => loginWithUserId(normalizedUserId)} style={btn}>
              Enter
            </button>

            {DEMO_MODE && (
              <div style={row}>
                <button
                  onClick={() => {
                    if (!demoAdminId) {
                      setError("No demo admin user configured.");
                      return;
                    }
                    loginWithUserId(demoAdminId);
                  }}
                  style={btn}
                >
                  Demo Admin
                </button>

                <button
                  onClick={() => {
                    if (!demoOperatorId) {
                      setError("No demo operator user configured.");
                      return;
                    }
                    loginWithUserId(demoOperatorId);
                  }}
                  style={btn}
                >
                  Demo Operator
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 12,
                  border: "2px solid var(--danger)",
                  background: "var(--bg-surface-2)",
                  color: "var(--danger)",
                  fontWeight: 800,
                }}
              >
                {error}
              </div>
            )}
          </div>
        </section>
      </div>

      <div style={credits}>
        Built by <b>Ewerton Souza</b> • Portfolio project
      </div>
    </div>
  );
}