import { useMemo, useRef, useState } from "react";
import { db, type ChecklistAnswer, type PolicingMode } from "../db";
import { FIXED_VEHICLES } from "../vehicles";
import { TEMPLATES } from "../checklists/templates";

function formatTagDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = d
    .toLocaleString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mmm}${yy}`;
}

const MODES: PolicingMode[] = [
  "Cmt Cia",
  "CGP",
  "Radio Patrulha",
  "Base Móvel",
  "Atividade DEJEM",
  "Atividade DELEGADA",
  "Apoio Administrativo",
  "Outros",
];

export default function ChecklistFillPage({
  vehicleCode,
  createdByRe,
  createdByRole,
  onSaved,
  onBack,
}: {
  vehicleCode: string;
  createdByRe: string;
  createdByRole: "driver" | "admin";
  onSaved: (checklistId: number) => void;
  onBack: () => void;
}) {
  const vehicle = useMemo(
    () => FIXED_VEHICLES.find((v) => v.code === vehicleCode) ?? null,
    [vehicleCode]
  );

  const template = useMemo(() => {
    if (!vehicle) return null;
    return TEMPLATES[vehicle.model];
  }, [vehicle]);

  const todayTag = useMemo(() => formatTagDate(new Date()), []);

  const [mode, setMode] = useState<PolicingMode | "">("");
  const [kmInitial, setKmInitial] = useState<string>("");

  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const items = template?.items ?? [];
    for (const item of items) {
      initial[item.key] = item.type === "yesno" ? "yes" : "";
    }
    return initial;
  });

  const [error, setError] = useState<string | null>(null);

  // ✅ 12.1: trava para evitar "salvar" duplo
  const [isSaving, setIsSaving] = useState(false);

  // ✅ 12.2: para destacar campos inválidos
  const [invalidMode, setInvalidMode] = useState(false);
  const [invalidKm, setInvalidKm] = useState(false);

  // refs para rolar até o campo
  const modeRef = useRef<HTMLDivElement | null>(null);
  const kmRef = useRef<HTMLDivElement | null>(null);

  // ✅ Mensagem de sucesso do motorista (sem abrir detalhe)
  const [savedOk, setSavedOk] = useState(false);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function save() {
    if (isSaving) return;

    setError(null);
    setInvalidMode(false);
    setInvalidKm(false);

    if (!vehicle || !template) {
      setError("Viatura/template não encontrado. Verifique o cadastro no código.");
      return;
    }

    if (!mode) {
      setInvalidMode(true);
      setError("Selecione a modalidade para continuar.");
      scrollTo(modeRef);
      return;
    }

    if (!kmInitial.trim()) {
      setInvalidKm(true);
      setError("Informe o Km Inicial para continuar.");
      scrollTo(kmRef);
      return;
    }

    const km = Number(kmInitial);
    if (!Number.isFinite(km) || km < 0) {
      setInvalidKm(true);
      setError("Km Inicial inválido. Digite apenas números (ex: 54321).");
      scrollTo(kmRef);
      return;
    }

    const answers: ChecklistAnswer[] = (template.items ?? []).map((item) => ({
      key: item.key,
      label: item.label,
      type: item.type,
      value:
        item.type === "yesno"
          ? values[item.key] === "no"
            ? "no"
            : "yes"
          : values[item.key] ?? "",
    }));

    try {
      setIsSaving(true);

      const now = new Date().toISOString();

      const id = await db.checklists.add({
        vehicleCode,
        createdAt: now,
        createdByRe,
        createdByRole,
        mode: mode as PolicingMode,
        kmInitial: Math.floor(km),
        templateId: template.templateId,
        templateVersion: template.version,
        answers,
      });

      // ✅ Motorista: só mensagem de sucesso
      if (createdByRole === "driver") {
        setSavedOk(true);
        return;
      }

      // ✅ Admin: abre detalhe como antes
      onSaved(id);
    } catch (e) {
      setError("Falha ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  // ✅ Tela de sucesso do motorista
  if (createdByRole === "driver" && savedOk) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "white" }}>
        <h2 style={{ marginTop: 0 }}>Checklist enviado ✅</h2>
        <p style={{ marginTop: 8, color: "white" }}>
          Registro salvo com sucesso.
          <br />
          Viatura: <b>{vehicleCode}</b> • Data/Hora:{" "}
          <b>{new Date().toLocaleString("pt-BR")}</b>
        </p>

        <button
          onClick={onBack}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "1px solid white",
            background: "#0f172a",
            color: "white",
            cursor: "pointer",
            minHeight: 48,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!vehicle || !template) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#0f172a" }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            minHeight: 44,
            color: "#0f172a",
          }}
        >
          ← Voltar
        </button>
        <p style={{ marginTop: 12 }}>
          Viatura/template não encontrado. Verifique <b>src/vehicles.ts</b> e{" "}
          <b>src/checklists/templates.ts</b>.
        </p>
      </div>
    );
  }

  // ✅ Estilos “mobile-first” só desta tela (motorista)
  const styles = {
    btn: {
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      background: "white",
      cursor: "pointer",
      minHeight: 48,
      fontSize: 16,
      color: "#0f172a",
    } as React.CSSProperties,
    btnPrimary: {
      marginTop: 12,
      width: "100%",
      padding: 14,
      borderRadius: 12,
      border: "1px solid #0f172a",
      background: "#0f172a",
      color: "white",
      cursor: "pointer",
      minHeight: 52,
      fontSize: 16,
      fontWeight: 800,
    } as React.CSSProperties,
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 16,
      background: "white",
    } as React.CSSProperties,
    label: {
      fontWeight: 800,
      marginBottom: 8,
      fontSize: 16,
      color: "#0f172a",
    } as React.CSSProperties,
    input: (invalid: boolean) =>
      ({
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      padding: 12,
      borderRadius: 12,
      border: invalid ? "2px solid #dc2626" : "1px solid #cbd5e1",
      fontSize: 16,
      minHeight: 48,
      outline: "none",
      } as React.CSSProperties),
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "#ffffffff" }}>
      <button onClick={onBack} style={styles.btn}>
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12, fontSize: 22 }}>
        Checklist do dia {todayTag}
      </h2>

      <p style={{ marginTop: 0, color: "#ffffffff", lineHeight: 1.35 }}>
        Viatura: <b>{vehicle.code}</b> • Placa: <b>{vehicle.plate}</b>
        <br />
        Modelo: <b>{template.title}</b>
        <br />
        Usuário: <b>RE {createdByRe}</b>
      </p>

      <section style={{ ...styles.card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "#0f172a", fontSize: 18 }}>Dados do serviço</h3>

        <div style={{ display: "grid", gap: 12 }}>
          <div ref={modeRef}>
            <div style={styles.label}>Modalidade</div>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as PolicingMode);
                setInvalidMode(false);
              }}
              style={styles.input(invalidMode)}
            >
              <option value="">Selecione...</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div ref={kmRef}>
            <div style={styles.label}>Km Inicial</div>
            <input
              value={kmInitial}
              onChange={(e) => {
                setKmInitial(e.target.value);
                setInvalidKm(false);
              }}
              inputMode="numeric"
              placeholder="Ex: 54321"
              style={styles.input(invalidKm)}
            />
          </div>

          <div style={{ fontSize: 16, color: "rgba(15,23,42,0.75)" }}>
            O horário é registrado automaticamente no momento em que você salva.
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0, fontSize: 18 }}>{template.title}</h3>

        {template.items.map((item) => (
          <div
            key={item.key}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 10, color: "#0f172a", fontSize: 16 }}>
              {item.label}
            </div>

            {item.type === "yesno" ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setValue(item.key, "yes")}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: values[item.key] === "yes" ? "#0f172a" : "white",
                    color: values[item.key] === "yes" ? "white" : "#0f172a",
                    cursor: "pointer",
                    minHeight: 48,
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setValue(item.key, "no")}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: values[item.key] === "no" ? "#0f172a" : "white",
                    color: values[item.key] === "no" ? "white" : "#0f172a",
                    cursor: "pointer",
                    minHeight: 48,
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  Não
                </button>
              </div>
            ) : (
              <textarea
                value={values[item.key] ?? ""}
                onChange={(e) => setValue(item.key, e.target.value)}
                placeholder="Digite observações..."
                rows={3}
                style={{
                  width: "95%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 16,
                  minHeight: 88,
                }}
              />
            )}
          </div>
        ))}

        <button
          onClick={save}
          disabled={isSaving}
          style={{
            ...styles.btnPrimary,
            opacity: isSaving ? 0.75 : 1,
          }}
        >
          {isSaving ? "Salvando..." : "Salvar checklist"}
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
            }}
          >
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
