import { useEffect, useMemo, useRef, useState } from "react";
import { db, type ChecklistRecord, type PolicingMode } from "../db";
import { FIXED_VEHICLES } from "../vehicles";
import { hasIssues, countIssues } from "../utils/checklist";
import { officerLabel } from "../userLookup";


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
  // dateStr: "YYYY-MM-DD" -> início do dia local
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

function isoFromLocalDateEnd(dateStr: string) {
  // dateStr: "YYYY-MM-DD" -> fim do dia local
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
  // Aceita registros de versões antigas e preenche defaults
  if (!raw || typeof raw !== "object") return null;

  const vehicleCode = String(raw.vehicleCode ?? "").trim();
  const createdAt = String(raw.createdAt ?? "").trim();
  const createdByRe = String(raw.createdByRe ?? "").trim();
  const createdByRoleRaw = raw.createdByRole;

  if (!vehicleCode || !createdAt || !createdByRe) return null;

  const createdByRole: "driver" | "admin" =
    createdByRoleRaw === "admin" ? "admin" : "driver";

  const mode: PolicingMode = isValidMode(raw.mode) ? raw.mode : "Outros";

  const kmN = safeNumber(raw.kmInitial);
  const kmInitial = kmN !== null && kmN >= 0 ? Math.floor(kmN) : 0;

  // ✅ template (compatibilidade com backups antigos)
  // 1) usa o valor do backup se existir
  // 2) tenta inferir pelo cadastro FIXED_VEHICLES
  // 3) fallback "UNKNOWN"
  let templateId = String(raw.templateId ?? "").trim();
  let templateVersion = safeNumber(raw.templateVersion);

  if (!templateId) {
    const v = FIXED_VEHICLES.find((x) => x.code === vehicleCode);
    templateId = v?.model ?? "UNKNOWN";
  }

  if (templateVersion === null || templateVersion === undefined) {
    templateVersion = 1;
  }

  const answersRaw = Array.isArray(raw.answers) ? raw.answers : [];
  const answers = answersRaw
    .filter((a: any) => a && typeof a === "object")
    .map((a: any) => ({
      key: String(a.key ?? ""),
      label: String(a.label ?? ""),
      type: a.type === "text" ? "text" : "yesno",
      value:
        a.type === "text"
          ? String(a.value ?? "")
          : a.value === "no"
          ? "no"
          : "yes",
    }))
    .filter((a: any) => a.key && a.label);

  return {
    vehicleCode,
    createdAt,
    createdByRe,
    createdByRole,
    mode,
    kmInitial,
    templateId,
    templateVersion,
    answers,
  };
}


function makeDedupeKey(c: {
  vehicleCode: string;
  createdAt: string;
  createdByRe: string;
}) {
  return `${c.vehicleCode}|${c.createdAt}|${c.createdByRe}`;
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

  // filtros
  const [filterVehicle, setFilterVehicle] = useState<string>(""); // vehicleCode
  const [filterMode, setFilterMode] = useState<string>(""); // PolicingMode
  const [filterRe, setFilterRe] = useState<string>(""); // parcial
  const [dateFrom, setDateFrom] = useState<string>(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>(""); // YYYY-MM-DD

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

  const totalsByVehicle = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of all) map.set(c.vehicleCode, (map.get(c.vehicleCode) ?? 0) + 1);
    return map;
  }, [all]);

  const filtered = useMemo(() => {
    let list = all;

    if (filterVehicle) {
      list = list.filter((c) => c.vehicleCode === filterVehicle);
    }

    if (filterMode) {
      list = list.filter((c) => String((c as any).mode ?? "") === filterMode);
    }

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

  // NOVO: CSV detalhado (1 linha por item do checklist)
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

  // NOVO: Importar JSON (restore)
  async function handleImportFile(file: File) {
    setImportStatus("Importando...");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Aceita dois formatos:
      // 1) { data: [...] }
      // 2) [ ... ]
      const rawList: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.data)
        ? parsed.data
        : [];

      if (!Array.isArray(rawList) || rawList.length === 0) {
        setImportStatus("Arquivo JSON não contém lista de checklists (data vazia).");
        return;
      }

      // Monta set de chaves existentes para evitar duplicatas
      const existing = await db.checklists.toArray();
      const existingKeys = new Set<string>(
        existing.map((c) => makeDedupeKey(c))
      );

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

        const key = makeDedupeKey(normalized);
        if (existingKeys.has(key)) {
          skippedDup++;
          continue;
        }

        existingKeys.add(key);
        toAdd.push(normalized);
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

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <button
        onClick={onBack}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#0f172a",
          cursor: "pointer",
        }}
      >
        ← Voltar
      </button>

      <h2 style={{ marginTop: 12 }}>Dashboard (Admin)</h2>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Total de checklists salvos: <b>{all.length}</b> • Mostrando (com filtros):{" "}
        <b>{filtered.length}</b>
        {loading ? " • Carregando..." : ""}
      </p>

      {/* Import (input escondido) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          // permitir importar o mesmo arquivo duas vezes (reset)
          e.currentTarget.value = "";
          if (f) handleImportFile(f);
        }}
      />

      {/* Export / Import */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Backup (exportar / importar)</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => exportJSON(filtered, "filtrado")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Exportar JSON (filtrado)
          </button>

          <button
            onClick={() => exportJSON(all, "tudo")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Exportar JSON (tudo)
          </button>

          <button
            onClick={clickImport}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Importar backup JSON
          </button>
        </div>

        {importStatus && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            {importStatus}
          </div>
        )}

        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          Importação adiciona registros que não existiam ainda. Duplicados são ignorados (por viatura + data/hora + RE).
        </div>
      </section>

      {/* Export CSV */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Exportar CSV (Excel)</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => exportCSVSummary(filtered, "filtrado")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            CSV resumo (filtrado)
          </button>

          <button
            onClick={() => exportCSVDetailed(filtered, "filtrado")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            CSV detalhado (filtrado)
          </button>

          <span style={{ width: 16 }} />

          <button
            onClick={() => exportCSVSummary(all, "tudo")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            CSV resumo (tudo)
          </button>

          <button
            onClick={() => exportCSVDetailed(all, "tudo")}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            CSV detalhado (tudo)
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
          Resumo = 1 linha por checklist. Detalhado = 1 linha por item do checklist (melhor para auditoria/estatística).
        </div>
      </section>

      {/* Filtros */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Filtros</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Viatura</div>
            <select
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
            >
              <option value="">(todas)</option>
              {FIXED_VEHICLES.map((v) => (
                <option key={v.code} value={v.code}>
                  {v.name} {v.plate ? `(${v.plate})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Modalidade</div>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
            >
              <option value="">(todas)</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>RE (contém)</div>
            <input
              value={filterRe}
              onChange={(e) => setFilterRe(e.target.value)}
              placeholder="Ex: 123 (acha 001234)"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
              inputMode="numeric"
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Data (de)</div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Data (até)</div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            onClick={clearFilters}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Limpar filtros
          </button>

          <button
            onClick={refresh}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "white",
              cursor: "pointer",
            }}
          >
            Atualizar dados
          </button>
        </div>
      </section>

      {/* Resumo por viatura */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Resumo por viatura (total)</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {FIXED_VEHICLES.map((v) => (
            <li
              key={v.code}
              style={{
                display: "flex",
                justifyContent: "space-between",
                border: "1px solid #f1f5f9",
                borderRadius: 10,
                padding: 10,
              }}
            >
              <span>
                <b>{v.name}</b>{" "}
                <span style={{ opacity: 0.7, fontSize: 12 }}>{v.plate ? `• ${v.plate}` : ""}</span>
              </span>
              <span>{totalsByVehicle.get(v.code) ?? 0}</span>
            </li>
          ))}
        </ul>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
          Observação: este resumo é do total armazenado. A lista abaixo é do total filtrado.
        </div>
      </section>

      {/* Lista */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Checklists (lista filtrada)</h3>

        {filtered.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nenhum checklist encontrado com os filtros atuais.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {filtered.map((c) => {
              const v = FIXED_VEHICLES.find((x) => x.code === c.vehicleCode);
              const vehicleName = v?.name ?? c.vehicleCode;
              const plate = v?.plate ?? "";

              const mode = (c as any).mode ?? "(não informado)";
              const kmInitial = Number.isFinite((c as any).kmInitial) ? (c as any).kmInitial : "(não informado)";

              const issue = hasIssues(c);
              const issueCount = countIssues(c);

              return (
               <li
                  key={c.id}
                  style={{
                    border: issue ? "2px solid #dc2626" : "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 12,
                    background: issue ? "#fef2f2" : "white",
                    color: "#0f172a",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                  <div>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>
                        {issue ? "⚠️ " : ""}
                        {vehicleName}{" "}
                        <span style={{ fontSize: 12, color: "rgba(15,23,42,0.75)" }}>
                          {plate ? `• ${plate}` : ""}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: "rgba(15,23,42,0.85)" }}>
                        {new Date(c.createdAt).toLocaleString("pt-BR")} • {officerLabel(c.createdByRe)}

                      </div>

                      <div style={{ fontSize: 12, color: "rgba(15,23,42,0.85)" }}>
                        Modalidade: <b>{mode}</b> • Km Inicial: <b>{kmInitial}</b>
                      </div>

                      {issue && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#b91c1c",
                          }}
                        >
                          ⚠️ {issueCount} apontamento(s) neste checklist
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenChecklist(c.id!)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #0f172a",
                        background: "white",
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                    >
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
