import { useEffect, useMemo, useRef, useState } from "react";
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
  const [modeDetail, setModeDetail] = useState<string>(""); // ✅ usado quando mode === "Outros"
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

  // trava evitar "salvar" duplo
  const [isSaving, setIsSaving] = useState(false);

  // destacar campos inválidos
  const [invalidMode, setInvalidMode] = useState(false);
  const [invalidModeDetail, setInvalidModeDetail] = useState(false);
  const [invalidKm, setInvalidKm] = useState(false);

  // refs para rolar até o campo
  const modeRef = useRef<HTMLDivElement | null>(null);
  const kmRef = useRef<HTMLDivElement | null>(null);

  // Mensagem de sucesso do motorista (sem abrir detalhe)
  const [savedOk, setSavedOk] = useState(false);

  // ✅ Validação de KM: último KM registrado por viatura
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [needKmConfirm, setNeedKmConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await db.checklists.where("vehicleCode").equals(vehicleCode).toArray();
        let latest: any = null;

        for (const c of list as any[]) {
          if (!latest) {
            latest = c;
            continue;
          }
          if (String(c.createdAt ?? "") > String(latest.createdAt ?? "")) latest = c;
        }

        const km = latest && Number.isFinite(Number(latest.kmInitial)) ? Number(latest.kmInitial) : null;
        setLastKm(km !== null ? Math.floor(km) : null);
      } catch {
        setLastKm(null);
      }
    })();
  }, [vehicleCode]);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function save(forceKm = false) {
    if (isSaving) return;

    setError(null);
    setInvalidMode(false);
    setInvalidModeDetail(false);
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

    // ✅ Outros: exige descrição curta
    if (mode === "Outros") {
      const d = modeDetail.trim();
      if (d.length < 3) {
        setInvalidModeDetail(true);
        setError("Em 'Outros', descreva brevemente a modalidade (mín. 3 caracteres).");
        scrollTo(modeRef);
        return;
      }
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

    // ✅ Validação: km não pode ser menor que o último registrado (sem confirmação)
    if (lastKm !== null && km < lastKm && !forceKm) {
      setNeedKmConfirm(true);
      setInvalidKm(true);
      setError(
        `Km Inicial menor que o último registrado para esta viatura (último: ${lastKm}). ` +
          `Se estiver correto (ex.: troca de painel/odômetro), confirme para salvar.`
      );
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
        modeDetail: mode === "Outros" ? modeDetail.trim() : "",
        kmInitial: Math.floor(km),
        templateId: template.templateId,
        templateVersion: template.version,
        answers,
      } as any);

      // ✅ Motorista: só mensagem de sucesso
      if (createdByRole === "driver") {
        setSavedOk(true);
        return;
      }

      // ✅ Admin: abre detalhe
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
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "var(--text)" }}>
        <h2 style={{ marginTop: 0, color: "var(--text)" }}>Checklist enviado ✅</h2>
        <p style={{ marginTop: 8, color: "var(--text-muted)" }}>
          Registro salvo com sucesso.
          <br />
          Viatura: <b style={{ color: "var(--text)" }}>{vehicleCode}</b> • Data/Hora:{" "}
          <b style={{ color: "var(--text)" }}>{new Date().toLocaleString("pt-BR")}</b>
        </p>

        <button
          onClick={onBack}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            cursor: "pointer",
            minHeight: 48,
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  if (!vehicle || !template) {
    return (
      <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "var(--text)" }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            cursor: "pointer",
            minHeight: 44,
            color: "var(--text)",
            fontWeight: 700,
          }}
        >
          ← Voltar
        </button>
        <p style={{ marginTop: 12, color: "var(--text-muted)" }}>
          Viatura/template não encontrado. Verifique <b style={{ color: "var(--text)" }}>src/vehicles.ts</b> e{" "}
          <b style={{ color: "var(--text)" }}>src/checklists/templates.ts</b>.
        </p>
      </div>
    );
  }

  const styles = {
    btn: {
      padding: "12px 12px",
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--bg)",
      cursor: "pointer",
      minHeight: 48,
      fontSize: 16,
      color: "var(--text)",
      fontWeight: 800,
    } as React.CSSProperties,
    btnPrimary: {
      marginTop: 12,
      width: "100%",
      padding: 14,
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--bg-surface-2)",
      color: "var(--text)",
      cursor: "pointer",
      minHeight: 52,
      fontSize: 16,
      fontWeight: 900,
    } as React.CSSProperties,
    card: {
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: 16,
      background: "var(--bg-surface)",
    } as React.CSSProperties,
    label: {
      fontWeight: 900,
      marginBottom: 8,
      fontSize: 16,
      color: "var(--text)",
    } as React.CSSProperties,
    input: (invalid: boolean) =>
      ({
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: 12,
        borderRadius: 12,
        border: invalid ? "2px solid var(--danger)" : "1px solid var(--border)",
        fontSize: 16,
        minHeight: 48,
        outline: "none",
        background: "var(--bg-surface-2)",
        color: "var(--text)",
      } as React.CSSProperties),
    hint: {
      marginTop: 6,
      fontSize: 12,
      color: "var(--text-muted)",
      lineHeight: 1.35,
    } as React.CSSProperties,
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, color: "var(--text)" }}>
      <button onClick={onBack} style={styles.btn}>
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12, fontSize: 22, color: "var(--text)" }}>Checklist do dia {todayTag}</h2>

      <p style={{ marginTop: 0, color: "var(--text-muted)", lineHeight: 1.35 }}>
        Viatura: <b style={{ color: "var(--text)" }}>{vehicle.code}</b> • Placa:{" "}
        <b style={{ color: "var(--text)" }}>{vehicle.plate}</b>
        <br />
        Modelo: <b style={{ color: "var(--text)" }}>{template.title}</b>
        <br />
        Usuário: <b style={{ color: "var(--text)" }}>RE {createdByRe}</b>
      </p>

      <section style={{ ...styles.card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)", fontSize: 18 }}>Dados do serviço</h3>

        <div style={{ display: "grid", gap: 12 }}>
          <div ref={modeRef}>
            <div style={styles.label}>Modalidade</div>
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as PolicingMode);
                setInvalidMode(false);
                setError(null);
                setNeedKmConfirm(false);
                if (e.target.value !== "Outros") {
                  setModeDetail("");
                  setInvalidModeDetail(false);
                }
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

            {mode === "Outros" && (
              <div style={{ marginTop: 10 }}>
                <div style={styles.label}>Descrição (Outros)</div>
                <input
                  value={modeDetail}
                  onChange={(e) => {
                    setModeDetail(e.target.value);
                    setInvalidModeDetail(false);
                    setError(null);
                  }}
                  placeholder="Ex: apoio evento, escolta, ronda setorial..."
                  style={styles.input(invalidModeDetail)}
                />
                <div style={styles.hint}>Obrigatório em “Outros”. Mantenha curto e objetivo.</div>
              </div>
            )}
          </div>

          <div ref={kmRef}>
            <div style={styles.label}>Km Inicial</div>
            <input
              value={kmInitial}
              onChange={(e) => {
                setKmInitial(e.target.value);
                setInvalidKm(false);
                setError(null);
                setNeedKmConfirm(false);
              }}
              inputMode="numeric"
              placeholder="Ex: 54321"
              style={styles.input(invalidKm)}
            />

            {lastKm !== null && (
              <div style={styles.hint}>
                Último Km registrado nesta viatura: <b style={{ color: "var(--text)" }}>{lastKm}</b>
              </div>
            )}

            <div style={styles.hint}>
              O horário é registrado automaticamente no momento em que você salva.
            </div>
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h3 style={{ marginTop: 0, fontSize: 18, color: "var(--text)" }}>{template.title}</h3>

        {template.items.map((item) => (
          <div
            key={item.key}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid var(--border-soft)",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 10, color: "var(--text)", fontSize: 16 }}>
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
                    border: "1px solid var(--border)",
                    background: values[item.key] === "yes" ? "var(--bg-surface-2)" : "var(--bg)",
                    color: "var(--text)",
                    cursor: "pointer",
                    minHeight: 48,
                    fontSize: 16,
                    fontWeight: 900,
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
                    border: values[item.key] === "no" ? "2px solid var(--danger)" : "1px solid var(--border)",
                    background: values[item.key] === "no" ? "var(--bg-surface-2)" : "var(--bg)",
                    color: "var(--text)",
                    cursor: "pointer",
                    minHeight: 48,
                    fontSize: 16,
                    fontWeight: 900,
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
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  fontSize: 16,
                  minHeight: 88,
                  background: "var(--bg-surface-2)",
                  color: "var(--text)",
                }}
              />
            )}
          </div>
        ))}

        <button
          onClick={() => save(false)}
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
              border: `2px solid ${needKmConfirm ? "var(--danger)" : "var(--danger)"}`,
              background: "var(--bg-surface-2)",
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            <div>{error}</div>

            {needKmConfirm && (
              <button
                onClick={() => save(true)}
                disabled={isSaving}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  cursor: "pointer",
                  minHeight: 46,
                  fontWeight: 900,
                }}
              >
                Confirmar e salvar mesmo assim
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
