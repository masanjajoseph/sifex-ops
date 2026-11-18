/**
 * Tanzanian regions exactly as published in the TISP area list
 * (`level_name = "Region"`). TCRA expects destination regions to match these
 * names — e.g. "Dar-es-salaam" (with hyphens), not "Dar es Salaam",
 * "Mjini Magharibi" for Zanzibar Urban/West, and never the country name "Tanzania".
 *
 * `parent`: TZMAIN = mainland, TZ002 = Zanzibar.
 */
export interface TzRegion {
  code: string;
  name: string;
  parent: "TZMAIN" | "TZ002";
}

export const TZ_REGIONS: TzRegion[] = [
  { code: "12", name: "Mbeya", parent: "TZMAIN" },
  { code: "6", name: "Pwani", parent: "TZMAIN" },
  { code: "22", name: "Njombe", parent: "TZMAIN" },
  { code: "25", name: "Geita", parent: "TZMAIN" },
  { code: "2", name: "Arusha", parent: "TZMAIN" },
  { code: "11", name: "Iringa", parent: "TZMAIN" },
  { code: "16", name: "Kigoma", parent: "TZMAIN" },
  { code: "13", name: "Singida", parent: "TZMAIN" },
  { code: "20", name: "Mara", parent: "TZMAIN" },
  { code: "7", name: "Dar-es-salaam", parent: "TZMAIN" },
  { code: "19", name: "Mwanza", parent: "TZMAIN" },
  { code: "4", name: "Tanga", parent: "TZMAIN" },
  { code: "5", name: "Morogoro", parent: "TZMAIN" },
  { code: "9", name: "Mtwara", parent: "TZMAIN" },
  { code: "14", name: "Tabora", parent: "TZMAIN" },
  { code: "24", name: "Simiyu", parent: "TZMAIN" },
  { code: "18", name: "Kagera", parent: "TZMAIN" },
  { code: "8", name: "Lindi", parent: "TZMAIN" },
  { code: "10", name: "Ruvuma", parent: "TZMAIN" },
  { code: "17", name: "Shinyanga", parent: "TZMAIN" },
  { code: "23", name: "Katavi", parent: "TZMAIN" },
  { code: "1", name: "Dodoma", parent: "TZMAIN" },
  { code: "21", name: "Manyara", parent: "TZMAIN" },
  { code: "15", name: "Rukwa", parent: "TZMAIN" },
  { code: "3", name: "Kilimanjaro", parent: "TZMAIN" },
  { code: "26", name: "Songwe", parent: "TZMAIN" },
  { code: "53", name: "Mjini Magharibi", parent: "TZ002" },
  { code: "51", name: "Kaskazini Unguja", parent: "TZ002" },
  { code: "52", name: "Kusini Unguja", parent: "TZ002" },
  { code: "54", name: "Kaskazini Pemba", parent: "TZ002" },
  { code: "55", name: "Kusini Pemba", parent: "TZ002" },
];

export const TZ_REGION_NAMES: string[] = TZ_REGIONS.map((r) => r.name);

const keyOf = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

const BY_KEY = new Map<string, string>(TZ_REGIONS.map((r) => [keyOf(r.name), r.name]));

/**
 * Returns the canonical TISP spelling of a Tanzanian region. Values that do
 * not match any known region (e.g. a foreign region such as "Guangdong") are
 * returned unchanged.
 */
export function normalizeTzRegion(value: string | null | undefined): string | undefined {
  if (!value) return value ?? undefined;
  return BY_KEY.get(keyOf(value)) ?? value;
}
