import Dexie from "dexie";
import type { Table } from "dexie";

export type AdminUser = {
  id?: number;
  re: string;
  createdAt: string; // ISO
};

export type PolicingMode =
  | "Cmt Cia"
  | "CGP"
  | "Radio Patrulha"
  | "Base Móvel"
  | "Atividade DEJEM"
  | "Atividade DELEGADA"
  | "Apoio Administrativo"
  | "Outros";

export type ChecklistAnswerValue = "yes" | "no" | string;

export type ChecklistAnswer = {
  key: string;
  label: string;
  type: "yesno" | "text";
  value: ChecklistAnswerValue;
};

export type ChecklistRecord = {
  id?: number;
  vehicleCode: string;
  createdAt: string;
  createdByRe: string;
  createdByRole: "driver" | "admin";

  mode: PolicingMode;
  kmInitial: number;

  // Etapa 7:
  templateId: string; // ex: "DUSTER"
  templateVersion: number; // ex: 1

  answers: ChecklistAnswer[];
};

export class AppDB extends Dexie {
  admins!: Table<AdminUser, number>;
  checklists!: Table<ChecklistRecord, number>;

  constructor() {
    super("checklist_pwa_db");

    this.version(1).stores({
      vehicles: "++id, name, plate, createdAt",
    });

    this.version(2).stores({
      vehicles: "++id, name, plate, createdAt, updatedAt",
      admins: "++id, re, createdAt",
    });

    this.version(3).stores({
      admins: "++id, re, createdAt",
      checklists: "++id, vehicleCode, createdAt, createdByRe, createdByRole",
    });

    this.version(4).stores({
      admins: "++id, re, createdAt",
      checklists:
        "++id, vehicleCode, createdAt, createdByRe, createdByRole, mode, kmInitial",
    });

    // v5: adiciona templateId/templateVersion
    this.version(5).stores({
      admins: "++id, re, createdAt",
      checklists:
        "++id, vehicleCode, createdAt, createdByRe, createdByRole, mode, kmInitial, templateId, templateVersion",
    });
  }
}

export const db = new AppDB();
