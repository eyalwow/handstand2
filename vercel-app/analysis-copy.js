// Presentation only. No exercise IDs, scoring thresholds or analysis dispatch change.
const familyNames = {'planche':'Planche','front-lever':'Front Lever','l-sit':'L-Sit'};
const variations = {tuck:'Tuck','advanced-tuck':'Advanced Tuck','super-advanced-tuck':'Super Advanced Tuck','one-leg':'One Leg',straddle:'Straddle',full:'Full',lean:'Lean'};
export function exerciseEnglish(x) {
  if(!x.variation || x.id==='handstand')return x.english;
  if(x.id==='planche-lean')return 'Planche Lean';
  return `${x.assistance==='band'?'Banded ':''}${variations[x.baseVariation]||x.variation} ${familyNames[x.familyId]||''}`.trim();
}
export const FAMILY_COPY = Object.freeze({
  planche:'משפחת תרגילי כוח ושליטה על ידיים ישרות, מהטיה קדימה ועד להחזקה אופקית. ניתוח וידאו עדיין אינו זמין.',
  'front-lever':'משפחת החזקות מתחת למוט, עם התקדמות מטאק לגוף ישר. ניתוח ניסיוני בחמש וריאציות, ללא ציון.',
  'l-sit':'החזקה על ידיים ישרות עם הרמת הרגליים לפנים. ניתוח וידאו עדיין אינו זמין.'
});
export function instructionsFor(x) {
  if(x.id==='planche-lean')return ['מקם כפות ידיים על הרצפה ברוחב הכתפיים, בידיים ישרות.', 'מעמידת פלאנק, הטה כתפיים קדימה בהדרגה. אצבעות הרגליים נשארות על הרצפה.', 'שמור גוף בקו ישר וליבה פעילה. חזור בשליטה ובטווח נוח לפרקי הידיים.'];
  if(x.id==='handstand')return ['תרגל במרחב פנוי ועם דרך ירידה בטוחה; היעזר בקיר לפי הצורך.', 'דחוף את הרצפה, שמור ידיים ישרות וכתפיים פעילות.', 'צלם מהצד את כל הגוף, כולל כניסה, החזקה וירידה. הניתוח אינו קובע אם נעזרת בקיר.'];
  return x.criteria;
}
