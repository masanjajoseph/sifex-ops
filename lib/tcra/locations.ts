/**
 * Location formatting for TCRA event payloads.
 *
 * TCRA does not want company or branch wording in `postedBranch` /
 * `destinationBranch`; locations must read as real places. SIFEX creates AWBs
 * against stations (CAN, HKG, DAR, ZNZ, DXB, ...), so those stations are
 * rendered as `COUNTRY - City`:
 *
 *   CAN Guangzhou      -> CN - Guangzhou
 *   HKG Hong Kong      -> HK - Hong Kong
 *   DXB Dubai          -> AE - Dubai
 *   DAR Dar es Salaam  -> TZ - Dar es salaam
 *   ZNZ Zanzibar       -> TZ - Zanzibar
 *   Dodoma / Msalato   -> TZ - Dodoma
 *
 * Anything already in `CC - City` form is returned unchanged.
 */

interface KnownLocation {
  country: string;
  city: string;
  codes: string[];
  pattern: RegExp;
}

const KNOWN_LOCATIONS: KnownLocation[] = [
  { country: "CN", city: "Guangzhou", codes: ["CAN", "GD"], pattern: /guangzhou|guangdong/i },
  { country: "HK", city: "Hong Kong", codes: ["HKG", "HK"], pattern: /hong\s*kong/i },
  { country: "AE", city: "Dubai", codes: ["DXB", "DUBAI"], pattern: /dubai/i },
  { country: "AE", city: "Sharjah", codes: ["SHJ"], pattern: /sharjah/i },
  {
    country: "TZ",
    city: "Dar es salaam",
    codes: ["DAR", "DARES", "TZ-02"],
    pattern: /dar[\s-]*es[\s-]*salaam|dar\b|kariakoo|ilala|kinondoni|temeke|^main$/i,
  },
  { country: "TZ", city: "Zanzibar", codes: ["ZNZ", "TZ-06"], pattern: /zanzibar/i },
  { country: "TZ", city: "Dodoma", codes: ["DOD", "DODOMA"], pattern: /dodoma|msalato|mtumba/i },
  { country: "TZ", city: "Arusha", codes: ["ARK", "JRO"], pattern: /arusha/i },
  { country: "TZ", city: "Mwanza", codes: ["MWZ", "MWANZA"], pattern: /mwanza/i },
  { country: "TZ", city: "Mbeya", codes: ["MBI", "MBEYA"], pattern: /mbeya/i },
  { country: "KE", city: "Nairobi", codes: ["NBO"], pattern: /nairobi/i },
  { country: "ZA", city: "Johannesburg", codes: ["JNB"], pattern: /johannesburg/i },
  { country: "OM", city: "Muscat", codes: ["MCT"], pattern: /muscat/i },
  { country: "IN", city: "Mumbai", codes: ["BOM"], pattern: /mumbai/i },
  { country: "ET", city: "Addis Ababa", codes: ["ADD"], pattern: /addis\s*ababa/i },
  { country: "TR", city: "Istanbul", codes: ["IST"], pattern: /istanbul/i },
];

const ALREADY_FORMATTED = /^[A-Z]{2}\s*-\s*\S/;

const COMPANY_OR_BRANCH_WORDS =
  /\b(sifex|sifongo|freight|logistics|branch|station|office|warehouse|hub|depot)\b/gi;

export function toTcraLocation(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "Unknown";

  // Known stations/cities win, so the canonical spelling is stable
  // ("TZ - Dar es salaam", not "TZ - Dar es Salaam").
  const probe = raw.replace(COMPANY_OR_BRANCH_WORDS, " ").replace(/\s+/g, " ").trim();
  for (const loc of KNOWN_LOCATIONS) {
    if (loc.pattern.test(probe)) return `${loc.country} - ${loc.city}`;
    if (loc.codes.some((code) => new RegExp(`(^|[^A-Za-z])${code}([^A-Za-z]|$)`, "i").test(probe))) {
      return `${loc.country} - ${loc.city}`;
    }
  }

  if (ALREADY_FORMATTED.test(raw)) {
    const [country, ...rest] = raw.split("-");
    const city = rest.join("-").trim();
    return city ? `${country.trim()} - ${city}` : `${country.trim()} - Unknown`;
  }

  return probe || "Unknown";
}

/** ISO 3166-1 alpha-2 country code implied by a location string, if known. */
export function countryOfLocation(value: string | null | undefined): string | undefined {
  const formatted = toTcraLocation(value);
  const match = formatted.match(/^([A-Z]{2})\s*-\s*/);
  return match?.[1];
}
