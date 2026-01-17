export type ChecklistItem =
  | { key: string; label: string; type: "yesno" }
  | { key: string; label: string; type: "text" };

export type VehicleModel = "SPIN" | "DUSTER" | "GOL" | "RANGER" | "SPRINTER";

export type ChecklistTemplate = {
  templateId: VehicleModel;
  version: number;
  title: string;
  items: ChecklistItem[];
};

// Itens comuns a todos os veículos
const COMMON_ITEMS: ChecklistItem[] = [
  { key: "card", label: "Cartão de abastecimento em ordem?", type: "yesno" },
  { key: "pneus", label: "Pneus em bom estado (sem cortes/bolhas, calibragem ok)?", type: "yesno" },
  { key: "luzes", label: "Luzes/sinalização funcionando (faróis/setas/freio/ré)?", type: "yesno" },
  { key: "sinal", label: "Sirene e sinalizador (giroflex/LED) funcionando?", type: "yesno" },
  { key: "freios", label: "Freios OK (pedal firme / sem ruídos anormais)?", type: "yesno" },
  { key: "limpador", label: "Limpador e lavador do para-brisa funcionando?", type: "yesno" },
  { key: "vidros", label: "Vidros e espelhos sem rachaduras?", type: "yesno" },
  { key: "ar", label: "Ar condicionado funcionando?", type: "yesno" },
  { key: "equip", label: "Equipamentos obrigatórios/conferência geral (triângulo/macaco/chave)?", type: "yesno" },
  { key: "bancos", label: "Bancos e cintos em condições de uso?", type: "yesno" },
  { key: "portas", label: "Portas/travas/vidros elétricos OK?", type: "yesno" },
  { key: "obs", label: "Observações / defeitos percebidos", type: "text" },

];

// Específicos por modelo (iniciais — você ajusta depois)
const SPIN_ITEMS: ChecklistItem[] = [
  { key: "spin_portamalas", label: "Guarda-preso/porta traseira OK (abre/fecha, travas)?", type: "yesno" },
  { key: "spin_cambio", label: "Funcionamento do câmbio automático OK (passa corretamente as marchas)?", type: "yesno" },
];

const DUSTER_ITEMS: ChecklistItem[] = [
  { key: "duster_portamalas", label: "Guarda-preso/porta traseira OK (abre/fecha, travas)?", type: "yesno" },
];

const GOL_ITEMS: ChecklistItem[] = [
  { key: "gol_portamalas", label: "Porta-malas/porta traseira OK (abre/fecha, travas)?", type: "yesno" },
];

const RANGER_ITEMS: ChecklistItem[] = [
  { key: "ranger_cacamba", label: "Caçamba organizada e sem itens soltos perigosos?", type: "yesno" },
  { key: "ranger_lona", label: "Lona de proteção da caçamba em boas condições?", type: "yesno" },
  { key: "ranger_estribo", label: "Estribos e degraus OK (sem folgas)?", type: "yesno" },
  { key: "ranger_cambio", label: "Funcionamento do câmbio automático OK (passa corretamente as marchas)?", type: "yesno" },
  { key: "ranger_4x4", label: "Seletor/indicadores de tração (4x2 - 4L - 4H) OK?", type: "yesno" },
];

const SPRINTER_ITEMS: ChecklistItem[] = [
  { key: "sprinter_portas", label: "Portas traseiras e corrediça OK (travas e funcionamento)?", type: "yesno" },
  { key: "sprinter_interno", label: "Iluminação interna e compartimento OK (sem itens soltos)?", type: "yesno" },
];

export const TEMPLATES: Record<VehicleModel, ChecklistTemplate> = {
  SPIN: {
    templateId: "SPIN",
    version: 1,
    title: "Checklist — Chevrolet Spin",
    items: [...COMMON_ITEMS, ...SPIN_ITEMS],
  },
  DUSTER: {
    templateId: "DUSTER",
    version: 1,
    title: "Checklist — Renault Duster",
    items: [...COMMON_ITEMS, ...DUSTER_ITEMS],
  },
  GOL: {
    templateId: "GOL",
    version: 1,
    title: "Checklist — Volkswagen Gol",
    items: [...COMMON_ITEMS, ...GOL_ITEMS],
  },
  RANGER: {
    templateId: "RANGER",
    version: 1,
    title: "Checklist — Ford Ranger",
    items: [...COMMON_ITEMS, ...RANGER_ITEMS],
  },
  SPRINTER: {
    templateId: "SPRINTER",
    version: 1,
    title: "Checklist — Mercedes Sprinter",
    items: [...COMMON_ITEMS, ...SPRINTER_ITEMS],
  },
};
