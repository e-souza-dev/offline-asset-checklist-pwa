export type ChecklistItem = {
  key: string;
  label: string;
  type: "yesno" | "text";
};

export const DAILY_CHECKLIST: ChecklistItem[] = [
  { key: "pneus", label: "Pneus em condições?", type: "yesno" },
  { key: "luzes", label: "Luzes funcionando?", type: "yesno" },
  { key: "sirene", label: "Sirene/Giroflex ok?", type: "yesno" },
  { key: "combustivel", label: "Nível de combustível adequado?", type: "yesno" },
  { key: "obs", label: "Observações", type: "text" },
];
