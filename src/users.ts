export type UserRole = "admin" | "operacional";

/**
 * Usuário (cadastro local, 100% offline).
 * - RE e dados NÃO precisam ser persistidos no dispositivo (você controla isso no App).
 * - O "display" (Sd PM 201446 E. Souza) é montado só na hora de exibir.
 */
export type User = {
  re: string;              // 6 dígitos
  name: string;            // Ex: "E. Souza"
  rank: string;            // Ex: "Sd PM", "Cb PM", "1º Sgt PM", etc.
  role: UserRole;          // "admin" ou "operacional"
};

export const USERS: User[] = [

  //Cmt de Cia
  { re: "138875", name: "Simões",         rank: "Cap PM", role: "admin" },

  //Sargentos
  { re: "966984", name: "Graziano",       rank: "1º Sgt PM", role: "operacional" },
  { re: "975648", name: "Sabino",         rank: "1º Sgt PM", role: "operacional" },
  { re: "126643", name: "Aurélio",        rank: "1º Sgt PM", role: "operacional" },
  { re: "102876", name: "Nunes",          rank: "1º Sgt PM", role: "operacional" },
  { re: "135747", name: "Marcos",         rank: "1º Sgt PM", role: "operacional" },
  { re: "112332", name: "Rodrigues",      rank: "2º Sgt PM", role: "operacional" },
  { re: "122796", name: "Vitor",          rank: "2º Sgt PM", role: "operacional" },
  { re: "965537", name: "Romano",         rank: "3º Sgt PM", role: "operacional" },
  { re: "961521", name: "Teixeira",       rank: "3º Sgt PM", role: "operacional" },
  { re: "962434", name: "Valéria",        rank: "3º Sgt PM", role: "operacional" },
  { re: "962164", name: "Marcelo",        rank: "3º Sgt PM", role: "operacional" },
  { re: "975580", name: "Leão",           rank: "3º Sgt PM", role: "operacional" },
  { re: "943118", name: "Andros",         rank: "3º Sgt PM", role: "operacional" },

  //Cabos
  { re: "118879", name: "Emmanuel",       rank: "Cb PM", role: "operacional" },
  { re: "981470", name: "Lima",           rank: "Cb PM", role: "operacional" },
  { re: "106167", name: "Cristina Souza", rank: "Cb PM", role: "operacional" },
  { re: "106512", name: "Amaro",          rank: "Cb PM", role: "operacional" },
  { re: "102775", name: "Palmeira",       rank: "Cb PM", role: "operacional" },
  { re: "102862", name: "Pereira",        rank: "Cb PM", role: "operacional" },
  { re: "981409", name: "Bruzaferro",     rank: "Cb PM", role: "operacional" },
  { re: "102878", name: "Charleston",     rank: "Cb PM", role: "operacional" },
  { re: "108903", name: "Candido",        rank: "Cb PM", role: "operacional" },
  { re: "134640", name: "Alves",          rank: "Cb PM", role: "admin" },
  { re: "133332", name: "Cassio",         rank: "Cb PM", role: "operacional" },
  { re: "133395", name: "Eder Augusto",   rank: "Cb PM", role: "operacional" },
  { re: "991921", name: "De Almeida",     rank: "Cb PM", role: "operacional" },
  { re: "129355", name: "Gonçalves",      rank: "Cb PM", role: "operacional" },
  { re: "145415", name: "Jair",           rank: "Cb PM", role: "operacional" },
  { re: "170447", name: "Toscano",        rank: "Cb PM", role: "operacional" },
  { re: "138366", name: "Pizarro",        rank: "Cb PM", role: "operacional" },
  { re: "142774", name: "Filho",          rank: "Cb PM", role: "operacional" },
  { re: "162749", name: "Ribeiro Santos", rank: "Cb PM", role: "operacional" },
  { re: "191352", name: "Luiz",           rank: "Cb PM", role: "operacional" },
  { re: "146142", name: "Vidulic",        rank: "Cb PM", role: "operacional" },
  { re: "146988", name: "Minamoto",       rank: "Cb PM", role: "operacional" },
  { re: "148729", name: "Lourenço",       rank: "Cb PM", role: "operacional" },

  //Soldados 1ª Classe
  { re: "150364", name: "Queiroz",        rank: "Sd PM", role: "operacional" },
  { re: "154807", name: "Odair",          rank: "Sd PM", role: "operacional" },
  { re: "155517", name: "Maicon",         rank: "Sd PM", role: "operacional" },
  { re: "156511", name: "Godoy",          rank: "Sd PM", role: "operacional" },
  { re: "157488", name: "Moreira",        rank: "Sd PM", role: "operacional" },
  { re: "191176", name: "Veronica",       rank: "Sd PM", role: "operacional" },
  { re: "193103", name: "Julia",          rank: "Sd PM", role: "operacional" },
  { re: "201446", name: "E. Souza",       rank: "Sd PM", role: "admin" },
  { re: "211240", name: "G. Marques",     rank: "Sd PM", role: "operacional" },

  //Soldados 2ª Classe
  { re: "231381", name: "Lescova",        rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "232045", name: "Lucas",          rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "241341", name: "Lira",           rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "241800", name: "Cerqueira",      rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "241905", name: "Correia",        rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "242141", name: "Ismael",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "242428", name: "Samuel",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "242553", name: "Almir",          rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "242675", name: "Joabi",          rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "242840", name: "Miqueias",       rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "242959", name: "Fukunaga",       rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "243401", name: "Dantas",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "243722", name: "Piller",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "243779", name: "Oliveira",       rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "243954", name: "Ferreira",       rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244038", name: "Ramos",          rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244085", name: "Natanael",       rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244077", name: "Thaissa",        rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244354", name: "Sergio",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244415", name: "Xavier",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244487", name: "Avelino",        rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244551", name: "Borba",          rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244644", name: "Santana",        rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244653", name: "Carvalho",       rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244694", name: "Aquino",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244728", name: "Andrey",         rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244944", name: "Moura",          rank: "Sd PM 2ª Cl", role: "operacional" },
  { re: "244951", name: "Feitosa",        rank: "Sd PM 2ª Cl", role: "operacional" },
];

export function normalizeRe(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}

export function isValidRe(re: string): boolean {
  return /^\d{6}$/.test(re);
}

export function getUserByRe(re: string): User | undefined {
  return USERS.find((u) => u.re === re);
}

/**
 * Exibição única (somente na UI):
 * "Sd PM 2ª Cl 244951 Feitosa"
 * ou "Cb PM 118879 Emmanuel"
 */
export function formatUserDisplay(u: Pick<User, "rank" | "re" | "name">): string {
  return `${u.rank} ${u.re} ${u.name}`.trim();
}
