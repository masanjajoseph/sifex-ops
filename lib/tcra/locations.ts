/**
 * TCRA geographical values.
 *
 * Confirmed against the live gateway (see the acceptance reports):
 *   - `postedBranch`      = city only, e.g. "Guangzhou" (no company/branch words)
 *   - `postedRegion`      = ISO 3166-1 alpha-2 country code, e.g. "CN"
 *   - `destinationBranch` = for Tanzania, the exact TISP `area_name`
 *                           ("Dar-es-salaam", "Mjini Magharibi", ...);
 *                           for foreign destinations, the city name
 *   - `destinationRegion` = ISO 3166-1 alpha-2 country code, e.g. "TZ"
 *
 * TISP `area_name` values are copied verbatim from the TISP area list and are
 * never translated or re-cased.
 */

export interface TcraLocationParts {
  /** ISO 3166-1 alpha-2 country code ("CN", "TZ", "AE", ...) or "Unknown". */
  country: string;
  /** City name for foreign locations, TISP `area_name` for Tanzania. */
  branch: string;
}

interface KnownLocation {
  country: string;
  city: string;
  /** TISP `area_name` — only for Tanzania. */
  tisp?: string;
  /** Station codes and accepted aliases. */
  codes: string[];
  pattern: RegExp;
}

const KNOWN_LOCATIONS: KnownLocation[] = [
  { country: "CN", city: "Guangzhou", codes: ["CAN", "GD"], pattern: /guangzhou|guangdong/i },
  { country: "HK", city: "Hong Kong", codes: ["HKG"], pattern: /hong\s*kong/i },
  { country: "AE", city: "Dubai", codes: ["DXB"], pattern: /dubai/i },
  { country: "AE", city: "Sharjah", codes: ["SHJ"], pattern: /sharjah/i },
  {
    country: "TZ",
    city: "Dar es Salaam",
    tisp: "Dar-es-salaam",
    codes: ["DAR", "TZ-02"],
    pattern: /dar[\s-]*es[\s-]*salaam|dar\b|kariakoo|ilala|kinondoni|temeke|^main$/i,
  },
  {
    country: "TZ",
    city: "Zanzibar",
    tisp: "Mjini Magharibi",
    codes: ["ZNZ", "TZ-06"],
    pattern: /zanzibar|mjini\s*magharibi|unguja/i,
  },
  {
    country: "TZ",
    city: "Dodoma",
    tisp: "Dodoma",
    codes: ["DOD"],
    pattern: /dodoma|msalato|mtumba/i,
  },
  { country: "TZ", city: "Arusha", tisp: "Arusha", codes: ["ARK", "JRO"], pattern: /arusha/i },
  { country: "TZ", city: "Mwanza", tisp: "Mwanza", codes: ["MWZ"], pattern: /mwanza/i },
  { country: "TZ", city: "Mbeya", tisp: "Mbeya", codes: ["MBI"], pattern: /mbeya/i },
  { country: "TZ", city: "Tanga", tisp: "Tanga", codes: ["TGT"], pattern: /tanga/i },
  { country: "TZ", city: "Morogoro", tisp: "Morogoro", codes: ["MOR"], pattern: /morogoro/i },
  { country: "TZ", city: "Kigoma", tisp: "Kigoma", codes: ["TKQ"], pattern: /kigoma/i },
  { country: "KE", city: "Nairobi", codes: ["NBO"], pattern: /nairobi/i },
  { country: "ZA", city: "Johannesburg", codes: ["JNB"], pattern: /johannesburg/i },
  { country: "OM", city: "Muscat", codes: ["MCT"], pattern: /muscat/i },
  { country: "IN", city: "Mumbai", codes: ["BOM"], pattern: /mumbai/i },
  { country: "ET", city: "Addis Ababa", codes: ["ADD"], pattern: /addis\s*ababa/i },
  { country: "TR", city: "Istanbul", codes: ["IST"], pattern: /istanbul/i },
];

const COMPANY_OR_BRANCH_WORDS =
  /\b(sifex|sifongo|freight|logistics|branch|station|office|warehouse|hub|depot)\b/gi;

const COUNTRY_PREFIX = /^([A-Z]{2})\s*-\s*(.+)$/;

/**
 * Resolves a free-form location (station name, AWB station, "CN - Guangzhou",
 * a TISP region name, ...) into the two values TCRA expects.
 */
export function resolveTcraLocation(value: string | null | undefined): TcraLocationParts {
  const raw = (value ?? "").trim();
  if (!raw) return { country: "Unknown", branch: "Unknown" };

  const probe = raw.replace(COMPANY_OR_BRANCH_WORDS, " ").replace(/\s+/g, " ").trim();

  // "CN - Guangzhou" / "TZ - Dar es salaam" style values.
  const prefixed = probe.match(COUNTRY_PREFIX);
  if (prefixed) {
    const country = prefixed[1];
    const rest = prefixed[2].trim();
    for (const loc of KNOWN_LOCATIONS) {
      if (loc.pattern.test(rest) || loc.codes.some((code) => matchesCode(rest, code))) {
        return known(loc, country);
      }
    }
    return { country, branch: rest };
  }

  for (const loc of KNOWN_LOCATIONS) {
    if (loc.pattern.test(probe) || loc.codes.some((code) => matchesCode(probe, code))) {
      return known(loc, loc.country);
    }
  }

  return { country: "Unknown", branch: probe || "Unknown" };
}

function known(loc: KnownLocation, country: string): TcraLocationParts {
  // Tanzania destinations must use the TISP area_name; foreign ones use the city.
  const branch = loc.country === "TZ" ? loc.tisp ?? loc.city : loc.city;
  return { country, branch };
}

function matchesCode(value: string, code: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(code)}([^A-Za-z0-9]|$)`, "i").test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface TcraEventGeography {
  postedBranch: string;
  postedRegion: string;
  destinationBranch: string;
  destinationRegion: string;
}

/** Builds the four geographical fields of a TCRA event from AWB locations. */
export function resolveTcraEventGeography(input: {
  postedBranch?: string | null;
  destinationBranch?: string | null;
}): TcraEventGeography {
  const origin = resolveTcraLocation(input.postedBranch);
  const destination = resolveTcraLocation(input.destinationBranch);
  return {
    postedBranch: origin.branch,
    postedRegion: origin.country,
    destinationBranch: destination.branch,
    destinationRegion: destination.country,
  };
}
