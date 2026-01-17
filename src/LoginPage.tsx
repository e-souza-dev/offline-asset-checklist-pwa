import { useMemo, useState } from "react";
import { USERS } from "./users";
import { setSession } from "./auth";
import { ADMIN_PASSWORDS } from "./adminSecrets";

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [reInput, setReInput] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  function normalizeRe(input: string) {
    return input.replace(/\D/g, "").slice(0, 6);
  }

  const normalizedRe = useMemo(() => normalizeRe(reInput), [reInput]);

  const matchedUser = useMemo(() => {
    if (!/^\d{6}$/.test(normalizedRe)) return undefined;
    return USERS.find((u: any) => String(u.re) === String(normalizedRe));
  }, [normalizedRe]);

  const needsPassword = matchedUser?.role === "admin";

  function handleLogin() {
    setError(null);

    const re = normalizedRe;

    if (!/^\d{6}$/.test(re)) {
      setError("RE inválido. Digite exatamente 6 números.");
      return;
    }

    const user = USERS.find((u: any) => String(u.re) === String(re));

    if (!user) {
      setError("RE não cadastrado. Procure a seção P/4 para regularização.");
      return;
    }

    // ✅ Admin: exige senha
    if (user.role === "admin") {
      const expected = ADMIN_PASSWORDS[String(re)];
      if (!expected) {
        setError("Senha administrativa não configurada para este RE.");
        return;
      }
      if (!pass.trim()) {
        setError("Digite a senha administrativa para continuar.");
        return;
      }
      if (pass !== expected) {
        setError("Senha inválida.");
        return;
      }
    }

    setSession({
      re: String(re),
      role: user.role === "admin" ? "admin" : "driver",
    });

    setPass("");
    onLoggedIn();
  }

  const card: React.CSSProperties = {
    maxWidth: 520,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
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
    background: "var(--bg)",
    color: "var(--text)",
    cursor: "pointer",
    minHeight: 48,
    fontWeight: 800,
  };

  return (
    <div style={card}>
      <h2 style={{ marginTop: 0, color: "var(--text)" }}>Acesso</h2>
      <p style={{ marginTop: 6, color: "var(--text-muted)" }}>
        Digite seu RE para iniciar a sessão.
      </p>

      <section style={panel}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={label}>RE</div>
            <input
              value={reInput}
              onChange={(e) => {
                const next = normalizeRe(e.target.value);
                setReInput(next);
                setError(null);

                // Se deixou de ser admin candidate, limpa senha
                const user = USERS.find((u: any) => String(u.re) === String(next));
                if (!user || user.role !== "admin") setPass("");
              }}
              inputMode="numeric"
              placeholder="Ex: 123456"
              style={input}
            />
          </div>

          {needsPassword && (
            <div>
              <div style={label}>Senha administrativa</div>
              <input
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError(null);
                }}
                type="password"
                placeholder="Digite a senha"
                style={input}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                Este campo aparece apenas para usuários da Administração.
              </div>
            </div>
          )}

          <button onClick={handleLogin} style={btn}>
            Entrar
          </button>

          {error && (
            <div
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
  );
}
