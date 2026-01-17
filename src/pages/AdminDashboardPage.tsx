import { useEffect, useMemo, useRef, useState } from "react";
import { db, type ChecklistRecord, type PolicingMode } from "../db";
import { FIXED_VEHICLES } from "../vehicles";
import { hasIssues, countIssues } from "../utils/checklist";
import { officerLabel } from "../userLookup";
import { APP_VERSION } from "../version";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(s: string) {
  const text = String(s ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function isoFromLocalDateStart(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

function isoFromLocalDateEnd(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return dt.toISOString();
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

function isValidMode(value: unknown): value is PolicingMode {
  return typeof value === "string" && (MODES as string[]).includes(value);
}

function safeNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeImportedRecord(raw: any): Omit<ChecklistRecord, "id"> | null {
  if (!raw || typeof raw !== "object") return null;

  const vehicleCode = String(raw.vehicleCode ?? "").trim();
  const createdAt = String(raw.createdAt ?? "").trim();
  const createdByRe = String(raw.createdByRe ?? "").trim();
  const createdByRoleRaw = raw.createdByRole;

  if (!vehicleCode || !createdAt || !createdByRe) return null;

  const createdByRole: "driver" | "admin" = createdByRoleRaw === "admin" ? "admin" : "driver";
  const mode: PolicingMode = isValidMode(raw.mode) ? raw.mode : "Outros";

  const kmN = safeNumber(raw.kmInitial);
  const kmInitial = kmN !== null && kmN >= 0 ? Math.floor(kmN) : 0;

  let templateId = String(raw.templateId ?? "").trim();
  let templateVersion = safeNumber(raw.templateVersion);

  if (!templateId) {
    const v = FIXED_VEHICLES.find((x) => x.code === vehicleCode);
    templateId = v?.model ?? "UNKNOWN";
  }

  if (templateVersion === null || templateVersion === undefined) templateVersion = 1;

  const answersRaw = Array.isArray(raw.answers) ? raw.answers : [];
  const answers = answersRaw
    .filter((a: any) => a && typeof a === "object")
    .map((a: any) => ({
      key: String(a.key ?? ""),
      label: String(a.label ?? ""),
      type: a.type === "text" ? "text" : "yesno",
      value: a.type === "text" ? String(a.value ?? "") : a.value === "no" ? "no" : "yes",
    }))
    .filter((a: any) => a.key && a.label);

  const modeDetail = String(raw.modeDetail ?? "").trim();

  return {
    vehicleCode,
    createdAt,
    createdByRe,
    createdByRole,
    mode,
    modeDetail,
    kmInitial,
    templateId,
    templateVersion,
    answers,
  } as any;
}

function makeDedupeKey(c: { vehicleCode: string; createdAt: string; createdByRe: string }) {
  return `${c.vehicleCode}|${c.createdAt}|${c.createdByRe}`;
}

function modeDisplay(c: any): string {
  const mode = String(c?.mode ?? "(não informado)");
  const detail = String(c?.modeDetail ?? "").trim();
  if (mode === "Outros" && detail) return `Outros — ${detail}`;
  return mode;
}

export default function AdminDashboardPage({
  onOpenChecklist,
  onBack,
}: {
  onOpenChecklist: (id: number) => void;
  onBack: () => void;
}) {
  const [all, setAll] = useState<ChecklistRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // status PWA
  const [swStatus, setSwStatus] = useState<string>("Verificando...");

  // filtros
  const [filterVehicle, setFilterVehicle] = useState<string>("");
  const [filterMode, setFilterMode] = useState<string>("");
  const [filterRe, setFilterRe] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string>("");

  async function refresh() {
    setLoading(true);
    try {
      const list = await db.checklists.orderBy("createdAt").reverse().toArray();
      setAll(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator)) {
          setSwStatus("Service Worker: não suportado neste navegador.");
          return;
        }

        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          setSwStatus("Service Worker: não registrado.");
          return;
        }

        const active = !!reg.active;
        const controller = !!navigator.serviceWorker.controller;

        if (active && controller) setSwStatus("Service Worker: ativo (controlando o app).");
        else if (active) setSwStatus("Service Worker: ativo (aguardando controle/refresh).");
        else setSwStatus("Service Worker: registrado (sem worker ativo).");
      } catch {
        setSwStatus("Service Worker: falha ao verificar.");
      }
    })();
  }, []);

  const totalsByVehicle = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of all) map.set(c.vehicleCode, (map.get(c.vehicleCode) ?? 0) + 1);
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;

    if (filterVehicle) list = list.filter((c) => c.vehicleCode === filterVehicle);
    if (filterMode) list = list.filter((c) => String((c as any).mode ?? "") === filterMode);

    if (filterRe.trim()) {
      const re = filterRe.trim();
      list = list.filter((c) => String(c.createdByRe).includes(re));
    }

    if (dateFrom) {
      const fromIso = isoFromLocalDateStart(dateFrom);
      list = list.filter((c) => c.createdAt >= fromIso);
    }

    if (dateTo) {
      const toIso = isoFromLocalDateEnd(dateTo);
      list = list.filter((c) => c.createdAt <= toIso);
    }

    return list;
  }, [all, filterVehicle, filterMode, filterRe, dateFrom, dateTo]);

  function clearFilters() {
    setFilterVehicle("");
    setFilterMode("");
    setFilterRe("");
    setDateFrom("");
    setDateTo("");
  }

  function exportJSON(data: ChecklistRecord[], scopeLabel: string) {
    const payload = {
      exportedAt: new Date().toISOString(),
      scope: scopeLabel,
      total: data.length,
      filters: {
        vehicle: filterVehicle || null,
        mode: filterMode || null,
        re: filterRe.trim() || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
      data,
    };

    downloadFile(
      `checklists-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  }

  function exportCSVSummary(data: ChecklistRecord[], scopeLabel: string) {
    const header = [
      "id",
      "vehicleCode",
      "vehicleName",
      "plate",
      "createdAt",
      "createdByRole",
      "createdByRe",
      "mode",
      "modeDetail",
      "kmInitial",
      "templateId",
      "templateVersion",
      "obs",
    ].join(",");

    const lines = [header];

    for (const c of data) {
      const v = FIXED_VEHICLES.find((x) => x.code === c.vehicleCode);
      const vehicleName = v?.name ?? c.vehicleCode;
      const plate = v?.plate ?? "";

      const obs = c.answers.find((a) => a.key === "obs")?.value ?? "";

      const mode = (c as any).mode ?? "";
      const modeDetail = (c as any).modeDetail ?? "";
      const kmInitial = Number.isFinite((c as any).kmInitial) ? (c as any).kmInitial : "";

      const templateId = (c as any).templateId ?? "";
      const templateVersion = Number.isFinite((c as any).templateVersion) ? (c as any).templateVersion : "";

      lines.push(
        [
          c.id ?? "",
          c.vehicleCode,
          csvEscape(vehicleName),
          csvEscape(plate),
          c.createdAt,
          c.createdByRole,
          c.createdByRe,
          csvEscape(String(mode)),
          csvEscape(String(modeDetail)),
          csvEscape(String(kmInitial)),
          csvEscape(String(templateId)),
          csvEscape(String(templateVersion)),
          csvEscape(String(obs)),
        ].join(",")
      );
    }

    downloadFile(
      `checklists-resumo-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv"
    );
  }

  function exportCSVDetailed(data: ChecklistRecord[], scopeLabel: string) {
    const header = [
      "checklistId",
      "vehicleCode",
      "vehicleName",
      "plate",
      "createdAt",
      "createdByRole",
      "createdByRe",
      "mode",
      "modeDetail",
      "kmInitial",
      "templateId",
      "templateVersion",
      "itemKey",
      "itemLabel",
      "itemType",
      "itemValue",
    ].join(",");

    const lines = [header];

    for (const c of data) {
      const v = FIXED_VEHICLES.find((x) => x.code === c.vehicleCode);
      const vehicleName = v?.name ?? c.vehicleCode;
      const plate = v?.plate ?? "";

      const mode = (c as any).mode ?? "";
      const modeDetail = (c as any).modeDetail ?? "";
      const kmInitial = Number.isFinite((c as any).kmInitial) ? (c as any).kmInitial : "";

      const templateId = (c as any).templateId ?? "";
      const templateVersion = Number.isFinite((c as any).templateVersion) ? (c as any).templateVersion : "";

      for (const a of c.answers) {
        lines.push(
          [
            c.id ?? "",
            c.vehicleCode,
            csvEscape(vehicleName),
            csvEscape(plate),
            c.createdAt,
            c.createdByRole,
            c.createdByRe,
            csvEscape(String(mode)),
            csvEscape(String(modeDetail)),
            csvEscape(String(kmInitial)),
            csvEscape(String(templateId)),
            csvEscape(String(templateVersion)),
            csvEscape(a.key),
            csvEscape(a.label),
            csvEscape(a.type),
            csvEscape(String(a.value ?? "")),
          ].join(",")
        );
      }
    }

    downloadFile(
      `checklists-detalhado-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
      "text/csv"
    );
  }

  async function handleImportFile(file: File) {
    setImportStatus("Importando...");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const rawList: any[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : [];

      if (!Array.isArray(rawList) || rawList.length === 0) {
        setImportStatus("Arquivo JSON não contém lista de checklists (data vazia).");
        return;
      }

      const existing = await db.checklists.toArray();
      const existingKeys = new Set<string>(existing.map((c) => makeDedupeKey(c)));

      let parsedCount = 0;
      let addedCount = 0;
      let skippedDup = 0;
      let skippedInvalid = 0;

      const toAdd: Omit<ChecklistRecord, "id">[] = [];

      for (const raw of rawList) {
        const normalized = normalizeImportedRecord(raw);
        if (!normalized) {
          skippedInvalid++;
          continue;
        }

        parsedCount++;

        const key = makeDedupeKey(normalized as any);
        if (existingKeys.has(key)) {
          skippedDup++;
          continue;
        }

        existingKeys.add(key);
        toAdd.push(normalized as any);
      }

      if (toAdd.length > 0) {
        await db.checklists.bulkAdd(toAdd);
        addedCount = toAdd.length;
      }

      await refresh();

      setImportStatus(
        `Importação concluída. Lidos: ${rawList.length} • Válidos: ${parsedCount} • Importados: ${addedCount} • Duplicados ignorados: ${skippedDup} • Inválidos ignorados: ${skippedInvalid}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportStatus(`Falha ao importar: ${msg}`);
    }
  }

  function clickImport() {
    setImportStatus("");
    fileInputRef.current?.click();
  }

  const card: React.CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 16,
    background: "var(--bg-surface)",
  };

  const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    cursor: "pointer",
    minHeight: 44,
    fontWeight: 700,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--text)",
    cursor: "pointer",
    minHeight: 44,
    fontWeight: 900,
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--text)",
    boxSizing: "border-box",
    outline: "none",
    minHeight: 44,
  };

  const label: React.CSSProperties = {
    fontWeight: 900,
    marginBottom: 6,
    color: "var(--text)",
  };

  const help: React.CSSProperties = {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 8,
    lineHeight: 1.35,
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16, color: "var(--text)" }}>
      <button onClick={onBack} style={btn}>
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12, marginBottom: 6, color: "var(--text)" }}>Dashboard (Admin)</h2>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        Total de checklists salvos: <b style={{ color: "var(--text)" }}>{all.length}</b> • Mostrando (com filtros):{" "}
        <b style={{ color: "var(--text)" }}>{filtered.length}</b>
        {loading ? " • Carregando..." : ""}
      </p>

      {/* Status do App */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Status do App</h3>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
          <div>
            Versão: <b style={{ color: "var(--text)" }}>{APP_VERSION}</b>
          </div>
          <div>{swStatus}</div>
        </div>
        <div style={help}>
          Dica: para validar PWA, teste no <b style={{ color: "var(--text)" }}>npm run preview</b> (porta 4173).
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          if (f) handleImportFile(f);
        }}
      />

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Backup (exportar / importar)</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => exportJSON(filtered, "filtrado")} style={btnPrimary}>
            Exportar JSON (filtrado)
          </button>

          <button onClick={() => exportJSON(all, "tudo")} style={btn}>
            Exportar JSON (tudo)
          </button>

          <button onClick={clickImport} style={btn}>
            Importar backup JSON
          </button>
        </div>

        {importStatus && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>{importStatus}</div>
        )}

        <div style={help}>
          Importação adiciona registros que não existiam ainda. Duplicados são ignorados (por viatura + data/hora + RE).
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Exportar CSV (Excel)</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => exportCSVSummary(filtered, "filtrado")} style={btnPrimary}>
            CSV resumo (filtrado)
          </button>

          <button onClick={() => exportCSVDetailed(filtered, "filtrado")} style={btn}>
            CSV detalhado (filtrado)
          </button>

          <span style={{ width: 16 }} />

          <button onClick={() => exportCSVSummary(all, "tudo")} style={btn}>
            CSV resumo (tudo)
          </button>

          <button onClick={() => exportCSVDetailed(all, "tudo")} style={btn}>
            CSV detalhado (tudo)
          </button>
        </div>

        <div style={help}>
          Resumo = 1 linha por checklist. Detalhado = 1 linha por item do checklist (melhor para auditoria/estatística).
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Filtros</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div>
            <div style={label}>Viatura</div>
            <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)} style={input}>
              <option value="">(todas)</option>
              {FIXED_VEHICLES.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.name} {v.plate ? `(${v.plate})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>Modalidade</div>
            <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} style={input}>
              <option value="">(todas)</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={label}>RE (contém)</div>
            <input
              value={filterRe}
              onChange={(e) => setFilterRe(e.target.value)}
              placeholder="Ex: 123 (acha 001234)"
              style={input}
              inputMode="numeric"
            />
          </div>

          <div>
            <div style={label}>Data (de)</div>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={input} />
          </div>

          <div>
            <div style={label}>Data (até)</div>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={input} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={clearFilters} style={btn}>
            Limpar filtros
          </button>

          <button onClick={refresh} style={btn}>
            Atualizar dados
          </button>
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Resumo por viatura (total)</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {FIXED_VEHICLES.map((v) => (
            <li
              key={v.code}
              style={{
                display: "flex",
                justifyContent: "space-between",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 10,
                background: "var(--bg)",
                color: "var(--text)",
              }}
            >
              <span>
                <b>{v.name}</b>{" "}
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{v.plate ? `• ${v.plate}` : ""}</span>
              </span>
              <span style={{ fontWeight: 900 }}>{totalsByVehicle.get(v.code) ?? 0}</span>
            </li>
          ))}
        </ul>
        <div style={help}>Observação: este resumo é do total armazenado. A lista abaixo é do total filtrado.</div>
      </section>

      <section style={card}>
        <h3 style={{ marginTop: 0, color: "var(--text)" }}>Checklists (lista filtrada)</h3>

        {filtered.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nenhum checklist encontrado com os filtros atuais.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {filtered.map((c) => {
              const v = FIXED_VEHICLES.find((x) => x.code === c.vehicleCode);
              const vehicleName = v?.name ?? c.vehicleCode;
              const plate = v?.plate ?? "";

              const kmInitial = Number.isFinite((c as any).kmInitial) ? (c as any).kmInitial : "(não informado)";

              const issue = hasIssues(c);
              const issueCount = countIssues(c);

              return (
                <li
                  key={c.id}
                  style={{
                    border: issue ? "2px solid var(--danger)" : "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--bg)",
                    color: "var(--text)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontWeight: 900, color: "var(--text)" }}>
                        {issue ? "⚠️ " : ""}
                        {vehicleName}{" "}
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{plate ? `• ${plate}` : ""}</span>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(c.createdAt).toLocaleString("pt-BR")} • {officerLabel(c.createdByRe)}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Modalidade: <b style={{ color: "var(--text)" }}>{modeDisplay(c as any)}</b> • Km Inicial:{" "}
                        <b style={{ color: "var(--text)" }}>{kmInitial}</b>
                      </div>

                      {issue && (
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, color: "var(--danger)" }}>
                          ⚠️ {issueCount} apontamento(s) neste checklist
                        </div>
                      )}
                    </div>

                    <button onClick={() => onOpenChecklist(c.id!)} style={btn}>
                      Abrir
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
