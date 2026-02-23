// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import LoginPage from "./LoginPage";
import { clearSession, getSession, type Session } from "./auth";
import { ensureSeedData } from "./seed";

import HomePage from "./pages/HomePage";
import AssetSelectPage from "./pages/AssetSelectPage";
import ChecklistFillPage from "./pages/ChecklistFillPage";
import HistoryPage from "./pages/HistoryPage";
import ChecklistDetailPage from "./pages/ChecklistDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import { getUserById, normalizeUserId } from "./users";
import UserGreeting from "./components/UserGreeting";

type Page =
  | { name: "home" }
  | { name: "assets" }
  | { name: "fill"; assetCode: string }
  | { name: "history"; assetCode: string }
  | { name: "detail"; checklistId: number }
  | { name: "dashboard" };

function roleLabel(role: Session["role"]) {
  return role === "admin" ? "Admin" : "Operator";
}

function AccessDenied({
  onBack,
}: Readonly<{
  onBack: () => void;
}>) {
  const pageWrap: React.CSSProperties = {
    maxWidth: 820,
    margin: "0 auto",
    padding: 16,
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

  return (
    <div style={pageWrap}>
      <p style={{ color: "var(--text-muted)" }}>Access denied.</p>
      <button onClick={onBack} style={btn}>
        Back
      </button>
    </div>
  );
}

export default function App() {
  const [session, setSessionState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>({ name: "home" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureSeedData();
      } finally {
        if (cancelled) return;
        setSessionState(getSession());
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
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

  const sessionUserId = normalizeUserId(session?.userId);
  const user = useMemo(() => {
    if (!sessionUserId) return undefined;
    return getUserById(sessionUserId);
  }, [sessionUserId]);

  const userDisplay = user
    ? `${user.name} • ID ${user.userId}`
    : sessionUserId
      ? `ID ${sessionUserId}`
      : "";

  if (!ready) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: 16,
          color: "var(--text)",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!session) return <LoginPage onLoggedIn={onLoggedIn} />;

  const isAdmin = session.role === "admin";

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
    <div
      style={{
        fontFamily: "system-ui",
        background: "var(--bg-app)",
        minHeight: "100vh",
      }}
    >
      <div style={topBar}>
        <div>
          <div style={{ fontWeight: 900, color: "var(--text)" }}>
            Offline Asset Checklist
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Session: {roleLabel(session.role)} • {userDisplay}
          </div>
        </div>

        <button onClick={logout} style={btn}>
          Sign out
        </button>
      </div>

      {page.name === "home" && (
        <div style={pageWrap}>
          {user ? (
            <UserGreeting user={user} showId={false} />
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
              <div style={{ fontWeight: 900, fontSize: 16 }}>Welcome 👋</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  color: "var(--text-muted)",
                }}
              >
                ID {sessionUserId || "??????"}
              </div>
            </div>
          )}

          <HomePage
            role={session.role}
            onGoVehicles={() => setPage({ name: "assets" })}
            onGoDashboard={() => setPage({ name: "dashboard" })}
          />
        </div>
      )}

      {page.name === "assets" && (
        <AssetSelectPage
          canSeeHistory={isAdmin}
          onSelect={(assetCode) => setPage({ name: "fill", assetCode })}
          onHistory={(assetCode) => setPage({ name: "history", assetCode })}
        />
      )}

      {page.name === "fill" && (
        <ChecklistFillPage
          assetCode={page.assetCode}
          createdByUserId={sessionUserId}
          createdByRole={session.role}
          onBack={() => setPage({ name: "assets" })}
          onSaved={(checklistId) => setPage({ name: "detail", checklistId })}
        />
      )}

      {page.name === "history" &&
        (isAdmin ? (
          <HistoryPage
            assetCode={page.assetCode}
            onBack={() => setPage({ name: "assets" })}
            onOpenChecklist={(id: number) =>
              setPage({ name: "detail", checklistId: id })
            }
          />
        ) : (
          <AccessDenied onBack={() => setPage({ name: "assets" })} />
        ))}

      {page.name === "detail" && (
        <ChecklistDetailPage
          checklistId={page.checklistId}
          canDelete={isAdmin}
          onDeleted={() => setPage({ name: "home" })}
          onBack={() => setPage({ name: "home" })}
        />
      )}

      {page.name === "dashboard" &&
        (isAdmin ? (
          <AdminDashboardPage
            onBack={() => setPage({ name: "home" })}
            onOpenChecklist={(id: number) =>
              setPage({ name: "detail", checklistId: id })
            }
          />
        ) : (
          <AccessDenied onBack={() => setPage({ name: "home" })} />
        ))}
    </div>
  );
}