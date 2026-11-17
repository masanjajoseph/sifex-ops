/**
 * TCRA timestamps are expressed in Tanzania time (Africa/Dar_es_Salaam, UTC+3)
 * regardless of where the server runs. The production server runs in UTC, so
 * formatting with the server's local methods would send timestamps three hours
 * behind what TCRA expects.
 */
const TCRA_TIME_ZONE = "Africa/Dar_es_Salaam";

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TCRA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function toTcraTimestamp(date: Date = new Date()): string {
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  // Intl renders midnight as "24" in some ICU versions; normalise it.
  const hour = get("hour") === "24" ? "00" : get("hour");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}.${ms}`;
}
