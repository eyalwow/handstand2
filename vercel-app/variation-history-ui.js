import {readVariationHistory} from './variation-history.js';
import {ANALYSIS_CATALOG,exerciseById} from './analysis-catalog.js';
const host=document.getElementById('variationHistory'),filter=document.getElementById('variationHistoryFilter');
for(const exercise of ANALYSIS_CATALOG.filter(x=>x.experimental)){
  const option=document.createElement('option');option.value=exercise.id;option.textContent=exercise.name;filter.append(option);
}
function render(){
 host.replaceChildren();
 try {
  const entries=readVariationHistory(localStorage,filter.value);
  if(!entries.length){host.textContent='אין מדידות ניסיוניות בווריאציה הזו.';return;}
  for(const entry of entries){
   const row=document.createElement('article');row.className='history-entry';
   row.textContent=`${exerciseById(entry.exerciseId).name} · ${new Date(entry.date).toLocaleDateString('he-IL')} · חלון אפשרי: ${entry.hold.seconds.toFixed(1)} שנ׳ · ניסיוני, טרם אומת. ללא ציון.`;
   host.append(row);
  }
 }catch{host.textContent='ההיסטוריה הניסיונית אינה זמינה. הנתונים הקיימים לא שונו.';}
}
filter.addEventListener('change',render);
for(const event of ['storage','hashchange','pageshow','analysis-saved'])window.addEventListener(event,render);
render();
