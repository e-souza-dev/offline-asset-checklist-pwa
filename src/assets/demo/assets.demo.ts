// src/assets/demo/assets.demo.ts
import type { AssetModel } from "../../checklists/templates";

export type DemoAsset = Readonly<{
  code: string;
  name: string;
  model: AssetModel;
}>;

export const FIXED_ASSETS: readonly DemoAsset[] = [
  { code: "ASSET-001", name: "Fleet Unit 01", model: "TYPE_A" },
  { code: "ASSET-002", name: "Fleet Unit 02", model: "TYPE_B" },
  { code: "ASSET-003", name: "Fleet Unit 03", model: "TYPE_C" },
] as const;