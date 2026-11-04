import { CAMPAIGN_ARTWORK } from "./campaign-artwork.js";
import { EXERCISES } from "./exercise-library.js";
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
  handstand:'עמידת ידיים', 'front-lever':'פרונט לבר', planche:'פלאנץ׳', 'l-sit':'אל־סיט', other:'תרגילים נוספים'
});
const filming = 'מצלמה קבועה בגובה הגוף, מהצד, ללא סיבוב. כל הגוף והמפרקים בפריים ובתאורה ברורה.';
const leverFilming = filming + ' יש לכלול גם את הידיים ונקודת האחיזה. צלמו כניסה, החזקה ברורה ויציאה. אין להסיק תמיכה או עומק מהשלד.';
const progressions = [
  ['tuck','טאק','מתקדם','ירכיים וברכיים כפופות קרוב לגו.'],
  ['advanced-tuck','אדוונס טאק','מתקדם','אגן פתוח יותר מטאק; הברכיים נשארות כפופות.'],
  ['super-advanced-tuck','סופר אדוונס טאק','מתקדם מאוד','ירכיים פתוחות יותר מאדוונס טאק; שוקיים כפופות. שם אימוני שאינו תקן אחיד — יש לבדוק את המנח.'],
  ['one-leg','רגל אחת','מתקדם מאוד','רגל אחת ישרה בהמשך הגו, השנייה מכונסת. יש לצלם את שתי הרגליים.'],
  ['straddle','סטראדל','מתקדם מאוד','שתי ברכיים ישרות ורגליים מפושקות בבירור. עומק הפיסוק אינו ניתן לאימות מצילום צד יחיד.'],
  ['full','מלא','מתקדם מאוד','שתי רגליים ישרות וצמודות בהמשך הגו.'],
];
const variants = ['planche','front-lever'].flatMap(familyId => progressions.flatMap(([variation,label,difficulty,definition]) =>
  [false,true].map(band => ({familyId, variation:variation+(band?'-band':''), label:label+(band?' עם גומיית עזר':''),
    difficulty, definition, assistance:band?'band':'none', baseVariation:variation}))));
variants.push(...[['tuck','טאק','בסיס'],['one-leg','רגל אחת','בינוני'],['full','מלא','בינוני']].map(([variation,label,difficulty])=>
  ({familyId:'l-sit',variation,label,difficulty,definition:variation==='full'?'רגליים ישרות קדימה, ידיים ישרות ואגן מעל המשטח.':variation==='one-leg'?'רגל אחת ישרה קדימה והשנייה כפופה.':'ברכיים מכונסות, ידיים ישרות וכפות הרגליים באוויר.',assistance:'none',baseVariation:variation})));
variants.push({familyId:'planche',variation:'lean',label:'הטיית פלאנץ׳',difficulty:'בינוני',
  definition:'הטיית פלאנץ׳ — Planche Lean: מעמידת פלאנק על ידיים ישרות, הטו את הכתפיים לפנים בהדרגה תוך שמירת גוף ישר ואצבעות הרגליים על הרצפה. חזרו בשליטה ובטווח ללא כאב.',
  assistance:'none',baseVariation:'lean'});
const experimentalVariants = new Set(['tuck','advanced-tuck','one-leg','straddle','full']);
const holds = new Set(['handstand','planche','front-lever','back-lever','l-sit','v-sit','human-flag','hollow-body','arch-hold','ring-support']);
export const measurementFor = id => holds.has(id) ? 'זמן החזקה + טכניקה' : 'חזרות + טכניקה';
// Training records use their existing Hebrew names as identity. New deterministic
// catalog IDs are additive; neither training objects nor stored records migrate.
export const trainingCatalogId = name => 'training-'+Array.from(name).map(c=>c.codePointAt(0).toString(16)).join('-');
const criteriaFor = familyId => familyId==='planche'
  ? ['מרפקים ישרים, כתפיים לפנים ביחס לכפות הידיים.', 'כפות הרגליים באוויר; השלד לבדו אינו מוכיח היעדר תמיכה.', 'מנח אגן ורגליים בהתאם לווריאציה שנבחרה.']
  : familyId==='front-lever' ? ['ידיים ישרות והגוף מתחת למוט.', 'גו קרוב לאופק; זוויות כתף, מרפק ואגן בהיטל הצילום.', 'אחיזה, היעדר תמיכה ועומק אינם מאומתים על ידי השלד.']
  : ['ידיים ישרות ואגן באוויר.', 'מנח ברכיים וירכיים בהתאם לווריאציה שנבחרה.'];
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
      familyId: id,
      measurement: measurementFor(id),
      criteria: id==='handstand'?['זמן החזקה נצפה, קו גוף, כתפיים, מרפקים ויציבות.', 'מדד הטכניקה הדו־ממדי אינו ציון מאמן מכויל.']:['קריטריוני מדידה יוגדרו וייבדקו לפני הפעלת הניתוח.'],
      variation: id==='handstand'?'standard':null,
      difficulty: ['planche','front-lever','l-sit'].includes(id)?'לפי וריאציה':({ 'hollow-body':'מתחיל','arch-hold':'מתחיל','push-up':'בינוני','scapular-pull-up':'בינוני','ring-support':'מתקדם' }[id]||'מתקדם'),
      filming: id==='front-lever'?leverFilming:filming,
      validation: id==='handstand'?'existing':'unvalidated',
      historyId: id,
    }),
  ),
  ...variants.map(({familyId,variation,label,difficulty,definition,assistance,baseVariation})=>Object.freeze({
    id: `${familyId}-${variation}`, familyId, variation, variationLabel:label, name:`${EXERCISE_FAMILIES[familyId]} · ${label}`,
    english:variation==='lean'?'Planche Lean':`${familyId} ${variation}`, category:familyId==='l-sit'?'core':'strength',
    difficulty, definition, assistance, baseVariation, measurement:'זמן החזקה + טכניקה',
    criteria:Object.freeze(variation==='lean'?[
      'ידיים ישרות וכתפיים נעות לפנים ביחס לכפות הידיים.',
      'אצבעות הרגליים נשארות על הרצפה; גוף בקו ישר וליבה פעילה.',
      'הגדילו את ההטיה בהדרגה ובטווח נוח לפרקי הידיים.'
    ]:criteriaFor(familyId)),
    filming:(familyId==='front-lever'?leverFilming:filming)+(assistance==='band'?' כללו את עיגון הגומייה ואת מגע התמיכה באגן בפריים. כוח הסיוע אינו נמדד.':''),
    artwork:null, status:'coming-soon', validation:'unvalidated',
    experimental:familyId==='front-lever' && experimentalVariants.has(variation),
    engineId:familyId==='front-lever' && experimentalVariants.has(variation)?'front-lever-observation-v1':null,
    historyId:`${familyId}-${variation}`
  })),
  ...EXERCISES.map(item=>Object.freeze({
    id:trainingCatalogId(item.name),historyId:trainingCatalogId(item.name),familyId:'training',
    name:item.name,english:'',category:item.category,difficulty:item.level,equipment:item.equipment,
    definition:item.tip,filming,measurement:'סוג המדידה יוגדר לפני הפעלת ניתוח',
    criteria:Object.freeze(['התרגיל קיים בספריית האימונים. מנוע ניתוח ייעודי טרם מומש.']),
    source:'training',legacyName:item.name,variation:null,artwork:null,status:'coming-soon',engineId:null,validation:'unvalidated'
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
