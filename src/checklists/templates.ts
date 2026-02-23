// src/checklists/templates.ts

export type ChecklistItem =
  | Readonly<{ key: string; label: string; type: "yesno" }>
  | Readonly<{ key: string; label: string; type: "text" }>;

/**
 * Portfolio-safe: generic asset types.
 */
export type AssetModel = "TYPE_A" | "TYPE_B" | "TYPE_C" | "TYPE_D" | "TYPE_E";

export type ChecklistTemplate = Readonly<{
  templateId: AssetModel;
  version: number;
  title: string;
  items: readonly ChecklistItem[];
}>;

// Common items (generic, no institution-specific content)
const COMMON_ITEMS = [
  { key: "docs", label: "Required documents available and valid?", type: "yesno" },
  { key: "tires", label: "Tires in good condition (no cuts/bulges, correct pressure)?", type: "yesno" },
  { key: "lights", label: "Lights/signals working (headlights/turn/brake/reverse)?", type: "yesno" },
  { key: "horn", label: "Horn working?", type: "yesno" },
  { key: "brakes", label: "Brakes OK (firm pedal / no unusual noise)?", type: "yesno" },
  { key: "wipers", label: "Wipers and washer system working?", type: "yesno" },
  { key: "glass", label: "Windows and mirrors intact (no cracks)?", type: "yesno" },
  { key: "ac", label: "Air conditioning / ventilation working?", type: "yesno" },
  { key: "tools", label: "Safety kit present (triangle/jack/wrench, etc.)?", type: "yesno" },
  { key: "seats", label: "Seats and seatbelts in good condition?", type: "yesno" },
  { key: "doors", label: "Doors/locks/windows working properly?", type: "yesno" },
  { key: "obs", label: "Notes / issues observed", type: "text" },
] as const satisfies readonly ChecklistItem[];

// Type-specific items (still generic)
const TYPE_A_ITEMS = [
  { key: "a_rear", label: "Rear door/hatch working properly (open/close/lock)?", type: "yesno" },
  { key: "a_trans", label: "Transmission behavior OK (smooth shifting)?", type: "yesno" },
] as const satisfies readonly ChecklistItem[];

const TYPE_B_ITEMS = [
  { key: "b_rear", label: "Rear door/hatch working properly (open/close/lock)?", type: "yesno" },
] as const satisfies readonly ChecklistItem[];

const TYPE_C_ITEMS = [
  { key: "c_trunk", label: "Trunk/rear door working properly (open/close/lock)?", type: "yesno" },
] as const satisfies readonly ChecklistItem[];

const TYPE_D_ITEMS = [
  { key: "d_cargo", label: "Cargo area organized and no dangerous loose items?", type: "yesno" },
  { key: "d_cover", label: "Cargo cover in good condition?", type: "yesno" },
  { key: "d_steps", label: "Side steps/footsteps OK (no looseness)?", type: "yesno" },
  { key: "d_trans", label: "Transmission behavior OK (smooth shifting)?", type: "yesno" },
  { key: "d_drive", label: "Drive mode indicators/selectors OK (if applicable)?", type: "yesno" },
] as const satisfies readonly ChecklistItem[];

const TYPE_E_ITEMS = [
  { key: "e_doors", label: "Rear/side doors OK (locks and operation)?", type: "yesno" },
  { key: "e_cabin", label: "Cabin lighting and interior area OK (no loose items)?", type: "yesno" },
] as const satisfies readonly ChecklistItem[];

/**
 * Extra: compile-time guard against duplicate keys inside a template.
 * If keys collide (e.g., "doors" duplicated), TS will error.
 */
type ItemKeyOf<T extends readonly ChecklistItem[]> = T[number]["key"];
type HasDuplicateKeys<T extends readonly ChecklistItem[], Seen extends string = never> =
  T extends readonly [infer H, ...infer R]
    ? H extends ChecklistItem
      ? H["key"] extends Seen
        ? true
        : R extends readonly ChecklistItem[]
          ? HasDuplicateKeys<R, Seen | H["key"]>
          : false
      : false
    : false;

type AssertNoDupes<T extends readonly ChecklistItem[]> =
  HasDuplicateKeys<T> extends true ? never : T;

function defineTemplate<const T extends readonly ChecklistItem[]>(
  template: Omit<ChecklistTemplate, "items"> & { items: AssertNoDupes<T> }
): ChecklistTemplate {
  return template;
}

export const TEMPLATES: Readonly<Record<AssetModel, ChecklistTemplate>> = {
  TYPE_A: defineTemplate({
    templateId: "TYPE_A",
    version: 1,
    title: "Checklist — Asset Type A",
    items: [...COMMON_ITEMS, ...TYPE_A_ITEMS] as const,
  }),
  TYPE_B: defineTemplate({
    templateId: "TYPE_B",
    version: 1,
    title: "Checklist — Asset Type B",
    items: [...COMMON_ITEMS, ...TYPE_B_ITEMS] as const,
  }),
  TYPE_C: defineTemplate({
    templateId: "TYPE_C",
    version: 1,
    title: "Checklist — Asset Type C",
    items: [...COMMON_ITEMS, ...TYPE_C_ITEMS] as const,
  }),
  TYPE_D: defineTemplate({
    templateId: "TYPE_D",
    version: 1,
    title: "Checklist — Asset Type D",
    items: [...COMMON_ITEMS, ...TYPE_D_ITEMS] as const,
  }),
  TYPE_E: defineTemplate({
    templateId: "TYPE_E",
    version: 1,
    title: "Checklist — Asset Type E",
    items: [...COMMON_ITEMS, ...TYPE_E_ITEMS] as const,
  }),
} as const;