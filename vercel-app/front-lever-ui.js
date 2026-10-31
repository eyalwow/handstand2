import {exerciseById} from './analysis-catalog.js';
import {saveVariationObservation} from './variation-history.js';
const reasons={'choose-variation':'יש לבחור וריאציה מפורשת.', 'camera-angle':'יש לאשר צילום צד יציב לפני הניתוח.',
  'invalid-input':'נתוני הסרטון אינם תקינים.', 'invalid-timing':'תזמון הפריימים אינו רציף.',
  'no-hold':'לא נצפתה החזקה רציפה ויציבה מספיק.', 'tracking-or-view':'המעקב או זווית הצילום אינם מספיקים למדידה. יש לכלול כתפיים, מרפקים, כפות ידיים ואגן.'};
export function renderFrontLever(result, host) {
  host.replaceChildren();
  const add=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;host.append(node);};
  add('h2',exerciseById(result.exerciseId)?.name||'Front Lever');
  add('p','ניתוח ניסיוני · טרם אומת בווידאו אמיתי · ללא ציון');
  add('p','הווריאציה נבחרה ידנית ואינה מאומתת אוטומטית. השלד אינו מוכיח תלייה, היעדר תמיכה או מנח בעומק.');
  if(result.status!=='observed'){add('p',reasons[result.reason]||'אין מדידה מספקת.');return;}
  add('p',`חלון החזקה אפשרי שנצפה: ${result.hold.start.toFixed(1)}–${result.hold.end.toFixed(1)} שנ׳ · ${result.hold.seconds.toFixed(1)} שנ׳. זו אינה קביעה שהתרגיל בוצע נכון.`);
  add('p','הגו והזרוע נמדדו בצד '+(result.metrics.observedSide==='left'?'שמאל':'ימין')+' שנראה במעקב. אין להסיק סימטריה בין הצדדים.');
  const labels={trunkTiltDegrees:'נטיית הגו מהאופק',elbowDegrees:'זווית מרפק',shoulderDegrees:'זווית כתף',hipDegrees:'זווית אגן',leftKneeDegrees:'זווית ברך שמאל',rightKneeDegrees:'זווית ברך ימין'};
  for(const [key,label] of Object.entries(labels))add('p',`${label}: ${result.metrics[key]===null?'לא נראתה מספיק למדידה':Math.round(result.metrics[key])+'° (היטל דו־ממדי)'}`);
  if(result.metrics.lineDeviationTorsoLengths!==null)add('p',`סטיית קרסול מקו הגו: ${result.metrics.lineDeviationTorsoLengths.toFixed(2)} אורכי גו. פיסוק ועומק משפיעים על המדידה.`);
  add('p',`ביטחון נקודות המעקב בחלון: ${Math.round(result.metrics.trackingConfidence*100)}%. זה אינו מדד לדיוק התרגיל.`);
  add('p','ליישור ברכיים יש לעיין בזווית הנמדדת רק כשהברך והקרסול נראים. אין יעד ניקוד או המלצת אימון בשלב זה.');
}
export function persistFrontLever(result, host) {
  if(result.status!=='observed')return;
  try {saveVariationObservation(localStorage,result);window.dispatchEvent(new Event('analysis-saved'));}
  catch {const p=document.createElement('p');p.textContent='המדידה לא נשמרה. ההיסטוריה הקיימת לא שונתה.';host.append(p);}
}
