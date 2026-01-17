import { useEffect, useMemo, useState } from "react";
import LoginPage from "./LoginPage";
import { clearSession, getSession, type Session } from "./auth";
import { ensureSeedData } from "./seed";

import HomePage from "./pages/HomePage";
import VehicleSelectPage from "./pages/VehicleSelectPage";
import ChecklistFillPage from "./pages/ChecklistFillPage";
import HistoryPage from "./pages/HistoryPage";
import ChecklistDetailPage from "./pages/ChecklistDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

// ✅ Só precisa existir: export const USERS = [...]
import { USERS } from "./users";

type Page =
  | { name: "home" }
  | { name: "vehicles" }
  | { name: "fill"; vehicleCode: string }
  | { name: "history"; vehicleCode: string }
  | { name: "detail"; checklistId: number }
  | { name: "dashboard" };

function formatUserDisplaySafe(u: any): string {
  const rank = String(u?.rank ?? "").trim();
  const re = String(u?.re ?? "").trim();
  const name = String(u?.name ?? "").trim();
  return [rank, re, name].filter(Boolean).join(" ");
}

export default function App() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>({ name: "home" });

  useEffect(() => {
    (async () => {
      await ensureSeedData();
      setSessionState(getSession());
      setReady(true);
    })();
  }, []);

  function onLoggedIn() {
    setSessionState(getSession());
    setPage({ name: "home" });
  }

  function logout() {
    clearSession();
    setSessionState(null);
    setPage({ name: "home" });
  }

  // ✅ Hook SEMPRE executa, mesmo sem sessão
  const sessionRe = session?.re ?? "";
  const user = useMemo(() => {
    if (!sessionRe) return undefined;
    return USERS.find((u: any) => String(u.re) === String(sessionRe));
  }, [sessionRe]);

  const userDisplay = user ? formatUserDisplaySafe(user) : sessionRe ? `RE ${sessionRe}` : "";

  if (!ready) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 16, fontFamily: "system-ui", color: "#0f172a" }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!session) return <LoginPage onLoggedIn={onLoggedIn} />;

  const canSeeHistory = session.role === "admin";
  const roleLabel = session.role === "admin" ? "Administração" : "Operacional";

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          padding: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          color: "white",
        }}
      >
        <div>
          <div style={{ fontWeight: 900 }}>Manutenção de Primeiro Escalão</div>
          <div style={{ fontSize: 12, color: "white" }}>
            Sessão: {roleLabel} • {userDisplay}
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            color: "#0f172a",
          }}
        >
          Sair
        </button>
      </div>

      {page.name === "home" && (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#0f172a" }}>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "white",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>Bem-vindo</div>
            <div style={{ marginTop: 6, fontSize: 14, color: "rgba(15,23,42,0.85)" }}>
              {user ? `${user.rank} ${user.name}` : `RE ${session.re}`}
            </div>
          </div>

          <HomePage
            role={session.role}
            onGoVehicles={() => setPage({ name: "vehicles" })}
            onGoDashboard={() => setPage({ name: "dashboard" })}
          />
        </div>
      )}

      {page.name === "vehicles" && (
        <VehicleSelectPage
          canSeeHistory={canSeeHistory}
          onSelect={(vehicleCode) => setPage({ name: "fill", vehicleCode })}
          onHistory={(vehicleCode) => setPage({ name: "history", vehicleCode })}
        />
      )}

      {page.name === "fill" && (
        <ChecklistFillPage
          vehicleCode={page.vehicleCode}
          createdByRe={session.re}
          createdByRole={session.role}
          onBack={() => setPage({ name: "vehicles" })}
          onSaved={(checklistId) => setPage({ name: "detail", checklistId })}
        />
      )}

      {page.name === "history" && (
        <>
          {session.role === "admin" ? (
            <HistoryPage
              vehicleCode={page.vehicleCode}
              onBack={() => setPage({ name: "vehicles" })}
              onOpenChecklist={(id: number) => setPage({ name: "detail", checklistId: id })}
            />
          ) : (
            <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#0f172a" }}>
              <p>Acesso negado.</p>
              <button
                onClick={() => setPage({ name: "vehicles" })}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                Voltar
              </button>
            </div>
          )}
        </>
      )}

      {page.name === "detail" && (
        <ChecklistDetailPage checklistId={page.checklistId} onBack={() => setPage({ name: "home" })} />
      )}

      {page.name === "dashboard" && session.role === "admin" && (
        <AdminDashboardPage
          onBack={() => setPage({ name: "home" })}
          onOpenChecklist={(id: number) => setPage({ name: "detail", checklistId: id })}
        />
      )}

      {page.name === "dashboard" && session.role !== "admin" && (
        <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#0f172a" }}>
          <p>Acesso negado.</p>
        </div>
      )}
    </div>
  );
}
