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
 byId('recent-heading').textContent=entries.length?'הניתוח האחרון שלך':'עוד לא ניתחת ניסיון';
 if(!entries.length){
  recent.textContent='כאן יופיעו הניסיונות שניתחת.';
  const empty=document.createElement('p');empty.className='empty-analysis';empty.textContent='עדיין אין מדידות שמורות.';list.append(empty);return;
 }
 const row=(entry,previous,index)=>{
  const item=document.createElement('article');item.className='history-entry';
  const info=document.createElement('div');
  const title=document.createElement('h3');title.textContent='עמידת ידיים';
  const date=document.createElement('time');date.dateTime=entry.date;date.textContent=dateLabel(entry.date);
  const score=document.createElement('strong');score.className='history-score';score.textContent=String(Math.round(entry.score));const scale=document.createElement("small");scale.textContent=" / 100";score.append(scale);score.setAttribute('aria-label',`ציון טכניקה ${Math.round(entry.score)} מתוך 100`);
  const image=document.createElement('img');image.src='./assets/catalog/handstand-corrected.webp';image.alt='';image.width=64;image.height=64;image.loading='lazy';
  info.append(title,date);item.append(image,info,score);
  const open=document.createElement('button');open.type='button';open.className='history-open';open.textContent='פתיחת סיכום המדידה';open.setAttribute('data-history-index',String(index));open.setAttribute('aria-haspopup','dialog');item.append(open);
  const note=document.createElement('p');note.className='history-storage-note';note.textContent='סיכום מדידה · הסרטון אינו נשמר';item.append(note);
  if(previous&&previous.model===entry.model){
   const delta=Math.round(entry.score)-Math.round(previous.score),comparison=document.createElement('p');comparison.className='history-comparison';comparison.textContent=`${delta>0?'+':''}${delta} נקודות מהמדידה הקודמת באותו סוג ניתוח. זווית צילום ותמיכת קיר עשויות להשפיע על ההשוואה.`;item.append(comparison);
  }
  return item;
 };
 recent.append(row(entries[0],entries[1],0));
 entries.forEach((entry,i)=>list.append(row(entry,entries[i+1],i)));
}
renderHistory();
for(const event of ['storage','hashchange','pageshow','analysis-saved']) window.addEventListener(event,renderHistory);
