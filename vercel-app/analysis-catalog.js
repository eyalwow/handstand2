import { CAMPAIGN_ARTWORK } from "./campaign-artwork.js";
const entries = [
  ["handstand", "עמידת ידיים", "Handstand", "balance"],
  ["planche", "פלאנץ׳", "Planche", "strength"],
  ["front-lever", "פרונט לבר", "Front Lever", "bar"],
  ["back-lever", "בק לבר", "Back Lever", "bar"],
  ["muscle-up", "עליית כוח", "Muscle Up", "bar"],
  ["pull-up", "מתח", "Pull Up", "bar"],
  ["chin-up", "מתח באחיזה הפוכה", "Chin Up", "bar"],
  ["dip", "מקבילים", "Dip", "strength"],
  ["push-up", "שכיבת סמיכה", "Push Up", "strength"],
  ["l-sit", "אל־סיט", "L-sit", "core"],
  ["v-sit", "וי־סיט", "V-sit", "core"],
  ["human-flag", "דגל אנושי", "Human Flag", "balance"],
  ["dragon-flag", "דראגון פלאג", "Dragon Flag", "core"],
  ["pistol-squat", "סקוואט על רגל אחת", "Pistol Squat", "balance"],
  ["hollow-body", "הולו בודי", "Hollow Body", "core"],
  ["arch-hold", "ארץ׳ הולד", "Arch Hold", "core"],
  ["scapular-pull-up", "מתח שכמות", "Scapular Pull Up", "bar"],
  [
    "handstand-push-up",
    "שכיבת סמיכה בעמידת ידיים",
    "Handstand Push Up",
    "strength",
  ],
  ["toes-to-bar", "רגליים למתח", "Toes to Bar", "core"],
  ["ring-support", "תמיכה על טבעות", "Ring Support", "strength"],
];
export const ANALYSIS_CATALOG = Object.freeze(
  entries.map(([id, name, english, category]) =>
    Object.freeze({
      id,
      name,
      english,
      category,
      artwork: CAMPAIGN_ARTWORK[id] || null,
      status: id === "handstand" ? "available" : "coming-soon",
      engineId: id === "handstand" ? "handstand-v3-fixed" : null,
    }),
  ),
);
export function exerciseById(id) {
  return ANALYSIS_CATALOG.find((exercise) => exercise.id === id) || null;
}
// Display metadata only; thresholds and formulas stay in the original engine.
export const HANDSTAND_METRICS = Object.freeze([
  { key: "banana", label: "קו גוף" },
  { key: "shoulder", label: "כתפיים" },
  { key: "elbow", label: "מרפקים" },
  { key: "lean", label: "איזון" },
  { key: "sway", label: "יציבות" },
]);
