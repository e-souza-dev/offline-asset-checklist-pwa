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

import { USERS } from "./users";
import UserGreeting from "./components/UserGreeting";

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

  const sessionRe = session?.re ?? "";
  const user = useMemo(() => {
    if (!sessionRe) return undefined;
    return USERS.find((u: any) => String(u.re) === String(sessionRe));
  }, [sessionRe]);

  const userDisplay = user ? formatUserDisplaySafe(user) : sessionRe ? `RE ${sessionRe}` : "";

  if (!ready) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 16, color: "var(--text)" }}>
        <p style={{ color: "var(--text-muted)" }}>Carregando...</p>
      </div>
    );
  }

  if (!session) return <LoginPage onLoggedIn={onLoggedIn} />;

  const canSeeHistory = session.role === "admin";
  const roleLabel = session.role === "admin" ? "Administração" : "Operacional";

  const topBar: React.CSSProperties = {
    borderBottom: "1px solid var(--border)",
    padding: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    background: "var(--bg-surface)",
    color: "var(--text)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    cursor: "pointer",
    color: "var(--text)",
    fontWeight: 700,
    minHeight: 44,
  };

  const pageWrap: React.CSSProperties = {
    maxWidth: 820,
    margin: "0 auto",
    padding: 16,
    color: "var(--text)",
  };

  return (
    <div style={{ fontFamily: "system-ui", background: "var(--bg-app)", minHeight: "100vh" }}>
      <div style={topBar}>
        <div>
          <div style={{ fontWeight: 900, color: "var(--text)" }}>Manutenção de Primeiro Escalão</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Sessão: {roleLabel} • {userDisplay}
          </div>
        </div>

        <button onClick={logout} style={btn}>
          Sair
        </button>
      </div>

      {page.name === "home" && (
        <div style={pageWrap}>
          {user ? (
            <UserGreeting user={user} showRe={false} />
          ) : (
            <div
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--bg-surface)",
                color: "var(--text)",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 16 }}>Bem-vindo 👋</div>
              <div style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)" }}>
                RE {session.re}
              </div>
            </div>
          )}

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
            <div style={pageWrap}>
              <p style={{ color: "var(--text-muted)" }}>Acesso negado.</p>
              <button onClick={() => setPage({ name: "vehicles" })} style={btn}>
                Voltar
              </button>
            </div>
          )}
        </>
      )}

      {page.name === "detail" && (
        <ChecklistDetailPage
          checklistId={page.checklistId}
          canDelete={session.role === "admin"}
          onDeleted={() => setPage({ name: "home" })}
          onBack={() => setPage({ name: "home" })}
        />
      )}

      {page.name === "dashboard" && session.role === "admin" && (
        <AdminDashboardPage
          onBack={() => setPage({ name: "home" })}
          onOpenChecklist={(id: number) => setPage({ name: "detail", checklistId: id })}
        />
      )}

      {page.name === "dashboard" && session.role !== "admin" && (
        <div style={pageWrap}>
          <p style={{ color: "var(--text-muted)" }}>Acesso negado.</p>
        </div>
      )}
    </div>
  );
}
