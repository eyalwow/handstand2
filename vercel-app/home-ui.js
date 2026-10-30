import {readAnalysisHistory} from "./analysis-history.js";
const byId = id => document.getElementById(id);
const dateLabel = date => new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(date));
function renderHistory() {
 const recent=byId('home-analysis-history'),list=byId('history-list');
 recent.replaceChildren();list.replaceChildren();
 let entries;
 try {
  entries=readAnalysisHistory(localStorage);
 } catch {
  recent.textContent='לא ניתן לקרוא את ההיסטוריה במכשיר הזה.';
  list.textContent='הנתונים השמורים לא זמינים כרגע. לא שינינו אותם. אפשר לנסות לפתוח מחדש את הדפדפן.';
  return;
 }
 if(!entries.length){
  recent.textContent='עוד לא ניתחת ניסיון. הסרטון הראשון יהיה נקודת ההתחלה שלך.';
  const empty=document.createElement('p');empty.className='empty-analysis';empty.textContent='כאן יופיעו הניסיונות שלך. אחרי ניתוח מוצלח עם החזקה מספקת תישמר מדידה, ללא הווידאו.';list.append(empty);return;
 }
 const row=(entry,previous)=>{
  const item=document.createElement('article');item.className='history-entry';
  const info=document.createElement('div');
  const title=document.createElement('h3');title.textContent='עמידת ידיים';
  const date=document.createElement('time');date.dateTime=entry.date;date.textContent=dateLabel(entry.date);
  const score=document.createElement('strong');score.className='history-score';score.textContent=String(Math.round(entry.score));const scale=document.createElement("small");scale.textContent=" / 100";score.append(scale);score.setAttribute('aria-label',`ציון טכניקה ${Math.round(entry.score)} מתוך 100`);
  info.append(title,date);item.append(info,score);
  const details=document.createElement('details');details.className='history-details';const summary=document.createElement('summary');summary.textContent='i';summary.setAttribute('aria-label','פרטי המדידה');details.append(summary);item.append(details);
  const note=document.createElement('p');note.textContent='סיכום מדידה בלבד · הווידאו אינו נשמר';details.append(note);
  if(previous&&previous.model===entry.model){
   const delta=Math.round(entry.score)-Math.round(previous.score),comparison=document.createElement('p');comparison.className='history-comparison';comparison.textContent=`${delta>0?'+':''}${delta} נקודות מהמדידה הקודמת באותו סוג ניתוח. זווית צילום ותמיכת קיר עשויות להשפיע על ההשוואה.`;details.append(comparison);
  }
  return item;
 };
 recent.append(row(entries[0],entries[1]));
 entries.forEach((entry,i)=>list.append(row(entry,entries[i+1])));
}
renderHistory();
for(const event of ['storage','hashchange','pageshow','analysis-saved']) window.addEventListener(event,renderHistory);
