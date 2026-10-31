import {exerciseById} from './analysis-catalog.js';
export const VARIATION_HISTORY_KEY='movalyt-variation-observations-v1';
export function readVariationHistory(storage, exerciseId) {
  const raw=JSON.parse(storage.getItem(VARIATION_HISTORY_KEY)||'[]');
  if(!Array.isArray(raw)||raw.some(x=>!x||x.model!=='front-lever-observation-v1'||!exerciseById(x.exerciseId)?.experimental||
    x.validated!==false||!Number.isFinite(Date.parse(x.date))||!Number.isFinite(x.hold?.seconds)||x.hold.seconds<1.5))throw Error('Invalid variation history');
  return raw.filter(x=>!exerciseId||x.exerciseId===exerciseId).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
export function saveVariationObservation(storage, result, date=new Date().toISOString()) {
  if(result.status!=='observed'||result.validated!==false||result.score!==null||!exerciseById(result.exerciseId)?.experimental)throw Error('Not an experimental observation');
  const old=readVariationHistory(storage);
  // Dedicated key: never migrate, overwrite or compare legacy Handstand grades.
  const entry={date,exerciseId:result.exerciseId,model:result.model,validated:false,hold:result.hold,metrics:result.metrics};
  const next=[entry,...old].slice(0,100);
  storage.setItem(VARIATION_HISTORY_KEY,JSON.stringify(next));
  return entry;
}
