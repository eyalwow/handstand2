// Read-only stored summaries. Legacy records contain no video or full metric report.
import {readAnalysisHistory} from './analysis-history.js';
import {readVariationHistory} from './variation-history.js';
import {analysisMediaFigure} from './analysis-media.js';
import {renderFrontLever} from './front-lever-ui.js';
const dialog=document.getElementById('historyReportDialog'),body=document.getElementById('historyReportBody');
const paragraph=text=>{const p=document.createElement('p');p.textContent=text;body.append(p);};
document.getElementById('closeHistoryReport').addEventListener('click',()=>dialog.close());
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-history-index], [data-variation-index]');if(!button)return;
 body.replaceChildren();
 try{
  if(button.hasAttribute('data-history-index')){
   const entries=readAnalysisHistory(localStorage),index=Number(button.dataset.historyIndex),entry=entries[index];
   if(!entry)throw Error('missing');
   body.append(analysisMediaFigure('handstand'));
   paragraph('עמידת ידיים · '+new Date(entry.date).toLocaleString('he-IL'));
   const score=document.createElement('strong');score.className='saved-report-score';score.textContent=Math.round(entry.score)+' / 100';body.append(score);
   paragraph('מדד הטכניקה שנשמר בזמן הניתוח. אפשר להשוות רק מדידות מאותה שיטת חישוב ובתנאי צילום דומים.');
   const previous=entries[index+1];
   if(previous?.model===entry.model){const delta=Math.round(entry.score)-Math.round(previous.score);paragraph(`${delta>0?'+':''}${delta} נקודות בהשוואה למדידה הקודמת מאותו סוג ניתוח. תנאי צילום עשויים להשפיע על ההשוואה.`);}
   paragraph('נשמר כאן סיכום ציון ותאריך בלבד. הווידאו, השלד, זמן ההחזקה ופירוט המדדים אינם נשמרים ברשומה הזו ואינם זמינים לשחזור.');
  }else{
   const entry=readVariationHistory(localStorage,button.dataset.variationId)[Number(button.dataset.variationIndex)];
   if(!entry)throw Error('missing');
   body.append(analysisMediaFigure(entry.exerciseId));
   paragraph(new Date(entry.date).toLocaleString('he-IL'));
   const host=document.createElement('section');body.append(host);
   renderFrontLever({...entry,status:'observed',score:null},host);
   paragraph('מדידה ניסיונית שנשמרה במכשיר. סרטון המקור אינו נשמר; אין כאן ציון ביצוע.');
  }
 }catch{paragraph('לא ניתן לפתוח את המדידה השמורה. הנתונים הקיימים לא שונו.');}
 dialog.showModal();document.getElementById('historyReportTitle').focus();
});
