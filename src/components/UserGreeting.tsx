import type { User } from "../users";
import { formatUserDisplay } from "../users";

export default function UserGreeting({
  user,
  showId = false,
}: {
  user: User;
  showId?: boolean;
}) {
  const greetingText = showId ? formatUserDisplay(user) : user.name;

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
        Welcome 👋
      </div>

      <div style={{ marginTop: 6, fontSize: 14, color: "var(--text-muted)" }}>
        {greetingText}
      </div>
    </div>
  );
}