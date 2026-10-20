// Sends tags to the Power Automate flow, which saves them in Dataverse.
//
// Each tag can create two rows in the same Dataverse table:
//   "record" - sent automatically when the tag is generated. Field number as
//              typed (012). A full background log, mistakes included.
//   "report" - sent when the user taps Report in History. Field number with
//              the A- prefix (A-012). Only the tags the user chose to report.
// In Power BI, rows whose Field Number starts with "A-" are the reported set.
import { SYNC_URL } from "./config";

const TIMEOUT_MS = 15000;

export const REPORT_FIELD_PREFIX = "A-";

// The report row needs its own Tag ID, otherwise the flow's duplicate check
// would see the record row's ID and skip it.
export const REPORT_TAG_ID_SUFFIX = "-A";

export const syncEnabled = () => Boolean(SYNC_URL);

export const reportFieldNumber = (fieldNumber) => {
  const value = String(fieldNumber ?? "").trim();
  // Don't double up if someone already typed "A-012"
  return value.toUpperCase().startsWith(REPORT_FIELD_PREFIX.toUpperCase())
    ? value
    : `${REPORT_FIELD_PREFIX}${value}`;
};

// What the flow receives (must match the flow trigger's JSON schema)
export const toPayload = (entry, kind = "record") => {
  const isReport = kind === "report";
  return {
    tagId: isReport ? `${entry.id}${REPORT_TAG_ID_SUFFIX}` : entry.id,
    fieldNumber: isReport
      ? reportFieldNumber(entry.fieldNumber)
      : String(entry.fieldNumber ?? "").trim(),
    reiHours: Number(entry.rei),
    start: entry.start,
    finish: entry.finish,
    reentry: entry.reentry,
    createdAt: entry.createdAt,
  };
};

// Returns true only when the flow confirms the row is saved.
// Any failure (offline, timeout, flow error) returns false so it is
// retried later.
export async function sendTag(entry, kind = "record") {
  if (!SYNC_URL) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(entry, kind)),
      signal: controller.signal,
    });
    return res.ok;
  } catch (err) {
    console.warn(`Tag ${kind} upload failed, will retry:`, err?.message || err);
    return false;
  } finally {
    clearTimeout(timer);
  }
}
