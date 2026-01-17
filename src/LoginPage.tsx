import { useState } from "react";
import { USERS } from "./users";
import { setSession } from "./auth";

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [reInput, setReInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function normalizeRe(input: string) {
    return input.replace(/\D/g, "").slice(0, 6);
  }

  function handleLogin() {
    setError(null);

    const re = normalizeRe(reInput);

    if (!/^\d{6}$/.test(re)) {
      setError("RE inválido. Digite exatamente 6 números.");
      return;
    }

    const user = USERS.find((u: any) => String(u.re) === String(re));

    if (!user) {
      setError("RE não cadastrado. Procure a seção P/4 para regularização.");
      return;
    }

    // ✅ mapeamento seguro para o tipo Session atual
    const sessionRole = user.role === "admin" ? "admin" : "driver";

    setSession({
      re: String(user.re),
      role: sessionRole,
    });

    onLoggedIn();
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui",
        fontSize: 32,
        color: "white",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Entrar</h2>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <label style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>
          Digite seu RE (6 dígitos)
        </label>

        <input
          value={reInput}
          onChange={(e) => setReInput(normalizeRe(e.target.value))}
          inputMode="numeric"
          placeholder="Ex: 123456"
          style={{
            width: "95%",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            fontSize: 20,
            minHeight: 48,
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
        />

        <button
          onClick={handleLogin}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "1px solid white",
            background: "#0f172a",
            color: "white",
            cursor: "pointer",
            minHeight: 52,
            fontSize: 20,
            fontWeight: 900,
          }}
        >
          Entrar
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "2px solid #ef4444",
              background: "#fef2f2",
              color: "#b91c1c",
              fontWeight: 800,
              fontSize: 20,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 12, color: "white" }}>
          Acesso permitido somente para o efetivo da 1ª Cia do 25º BPM/M.
        </div>
      </div>
    </div>
  );
}
