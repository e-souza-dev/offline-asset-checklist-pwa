// src/db.ts
import Dexie, { type Table } from "dexie";

export type Role = "admin" | "operator";

export type OperationMode =
  | "Routine"
  | "Administrative"
  | "Mobile Unit"
  | "Special Duty"
  | "Other";

export type ChecklistAnswerValue = "yes" | "no" | string;

export type ChecklistAnswer = Readonly<{
  key: string;
  label: string;
  type: "yesno" | "text";
  value: ChecklistAnswerValue;
}>;

export type ChecklistRecord = {
  id?: number;

  assetCode: string;
  createdAt: string; // ISO

  createdByUserId: string;
  createdByRole: Role;

  mode: OperationMode;
  modeDetail?: string;

  kmInitial: number;

  templateId: string;
  templateVersion: number;

  answers: ChecklistAnswer[];
};

export type Asset = {
  id?: number;
  code: string;
  name: string;
  type?: string; // optional label for UI ("Type A", etc.)
  createdAt: string; // ISO
  updatedAt?: string; // ISO
};

export type AdminUser = {
  id?: number;
  userId: string;
  createdAt: string; // ISO
};

export class AppDB extends Dexie {
  assets!: Table<Asset, number>;
  admins!: Table<AdminUser, number>;
  checklists!: Table<ChecklistRecord, number>;

  constructor() {
    super("offline_asset_checklist_db");

    this.version(1).stores({
      assets: "++id,&code,name,type,createdAt,updatedAt",
      admins: "++id,&userId,createdAt",
      checklists:
        "++id,assetCode,createdAt,createdByUserId,createdByRole,mode,templateId,templateVersion",
    });

    this.assets = this.table("assets");
    this.admins = this.table("admins");
    this.checklists = this.table("checklists");
  }
}

export const db = new AppDB();