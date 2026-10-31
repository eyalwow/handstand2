// Read-only data boundary. Keep the existing storage key and user data intact.
export const ANALYSIS_HISTORY_KEY = "handstand-lab-analyses-v1";
export function readAnalysisHistory(storage) {
  const raw = JSON.parse(storage.getItem(ANALYSIS_HISTORY_KEY) || "[]");
  if (!Array.isArray(raw)) throw new Error("Invalid analysis history");
  return raw
    .filter(
      (entry) =>
        entry &&
        typeof entry.model === "string" &&
        /^(v2-|v3-fixed-|v4-observed-)/.test(entry.model) &&
        Number.isFinite(entry.score) &&
        entry.score >= 0 &&
        entry.score <= 100 &&
        Number.isFinite(Date.parse(entry.date)),
    )
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
