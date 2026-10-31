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
export const EXERCISE_FAMILIES = Object.freeze({
  handstand:'עמידת ידיים', 'front-lever':'Front Lever', planche:'Planche', 'l-sit':'L-Sit', other:'תרגילים נוספים'
});
const filming = 'מצלמה קבועה בגובה הגוף, מהצד, ללא סיבוב. כל הגוף והמפרקים בפריים ובתאורה ברורה.';
const leverFilming = filming + ' יש לכלול גם את הידיים ונקודת האחיזה. צלמו כניסה, החזקה ברורה ויציאה. אין להסיק תמיכה או עומק מהשלד.';
const variants = [
  ['front-lever','tuck','Tuck','בינוני'], ['front-lever','advanced-tuck','Advanced Tuck','מתקדם'],
  ['front-lever','one-leg','One Leg','מתקדם'], ['front-lever','straddle','Straddle','מתקדם מאוד'], ['front-lever','full','Full','מתקדם מאוד'],
  ['planche','tuck','Tuck','מתקדם'], ['planche','advanced-tuck','Advanced Tuck','מתקדם מאוד'],
  ['planche','straddle','Straddle','מתקדם מאוד'], ['planche','full','Full','מתקדם מאוד'],
  ['l-sit','tuck','Tuck','בסיס'], ['l-sit','one-leg','One Leg','בינוני'], ['l-sit','full','Full','בינוני']
];
export const ANALYSIS_CATALOG = Object.freeze([
  ...entries.map(([id, name, english, category]) =>
    Object.freeze({
      id,
      name,
      english,
      category,
      artwork: CAMPAIGN_ARTWORK[id] || null,
      status: id === "handstand" ? "available" : "coming-soon",
      engineId: id === "handstand" ? "handstand-v3-fixed" : null,
      familyId: ['handstand','front-lever','planche','l-sit'].includes(id)?id:'other',
      variation: id==='handstand'?'standard':null,
      difficulty: id==='handstand'?'מתקדם':'תלוי וריאציה',
      filming: id==='front-lever'?leverFilming:filming,
      validation: id==='handstand'?'existing':'unvalidated',
      historyId: id,
    }),
  ),
  ...variants.map(([familyId, variation, label, difficulty])=>Object.freeze({
    id: `${familyId}-${variation}`, familyId, variation, name:`${EXERCISE_FAMILIES[familyId]} · ${label}`,
    english:`${EXERCISE_FAMILIES[familyId]} ${label}`, category:familyId==='l-sit'?'core':'strength',
    difficulty, filming:familyId==='front-lever'?leverFilming:filming,
    artwork:null, status:'coming-soon', validation:'unvalidated',
    experimental:familyId==='front-lever', engineId:familyId==='front-lever'?'front-lever-observation-v1':null,
    historyId:`${familyId}-${variation}`
  }))
]);
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
