import type { VehicleModel } from "./checklists/templates";

export type Vehicle = {
  code: string;   // prefixo / identificação interna
  plate: string;  // placa
  name: string;   // nome amigável (admin)
  model: VehicleModel;
};

export const FIXED_VEHICLES: Vehicle[] = [
  { code: "M-25100", name: "M-25100 - Spin 2022", plate: "FNP-2A61", model: "SPIN" },
  { code: "M-25101", name: "M-25101 - Duster 2020", plate: "FFN-8D11", model: "DUSTER" },
  { code: "M-25102", name: "M-25102 - Duster 2026", plate: "AAA-0000", model: "DUSTER" },
  { code: "M-25103", name: "M-25103 - Duster 2026", plate: "UGM-5F70", model: "DUSTER" },
  { code: "M-25104", name: "M-25104 - Duster 2026", plate: "UER-5J50", model: "DUSTER" },
  { code: "M-25105", name: "M-25105 - Duster 2026", plate: "QSR-2B47", model: "DUSTER" },
  { code: "M-25111", name: "M-25111 - Duster 2019", plate: "DZZ-4368", model: "DUSTER" },
  { code: "M-25113", name: "M-25113 - Duster 2020", plate: "FCC-0I61", model: "DUSTER" },
  { code: "M-25115", name: "M-25115 - Duster 2020", plate: "FCQ-1D26", model: "DUSTER" },
  { code: "M-25118", name: "M-25118 - Spin 2022", plate: "ENZ-9J95", model: "SPIN" },
  { code: "M-25119", name: "M-25119 - Spin 2022", plate: "FNT-3I06", model: "SPIN" },
  { code: "M-25122", name: "M-25122 - Gol 2019", plate: "DYB-7490", model: "GOL" },
  { code: "M-25125", name: "M-25125 - Duster 2021", plate: "FCU-5A44", model: "DUSTER" },
  { code: "M-25126", name: "M-25126 - Ranger 2022", plate: "FUV-6H55", model: "RANGER" },
  { code: "M-25127", name: "M-25127 - Ranger 2022", plate: "GDI-4H84", model: "RANGER" },
  { code: "M-25128", name: "M-25128 - Ranger 2022", plate: "GHX-2B43", model: "RANGER" },
  { code: "M-25193", name: "M-25193 - Sprinter 2019", plate: "CSM-3202", model: "SPRINTER" },
];
