import type { User } from "../users";
import { formatUserDisplay } from "../users";

export default function UserGreeting({
  user,
  showRe = false,
}: {
  user: User;
  showRe?: boolean;
}) {
  // Exibição única só na UI
  // Se você quiser mostrar RE, use formatUserDisplay(user)
  const greetingText = showRe
    ? formatUserDisplay(user) // "Sd PM 201446 E. Souza"
    : `${user.rank} ${user.name}`; // "Sd PM E. Souza"

  return (
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
      <div style={{ fontWeight: 900, fontSize: 16, color: "var(--text)" }}>
        Bem-vindo 👋
      </div>
      <div style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)" }}>
        {greetingText}
      </div>
    </div>
  );
}
