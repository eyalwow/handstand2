import {ANALYSIS_CATALOG,exerciseById} from './analysis-catalog.js';
import {analysisFor,analysisAvailability,analysisAvailabilityLabel,variationsFor} from './analysis-registry.js';
export {variationsFor} from './analysis-registry.js';
import {analysisMediaFigure} from './analysis-media.js';
import {readLibrarySelection,saveLibrarySelection} from './library-state.js';
import {readVariationHistory} from './variation-history.js';
const $=id=>document.getElementById(id);
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
export const availabilityLabel = x => analysisAvailabilityLabel(x.id);
export const catalogCountLabel = count => count === 1 ? 'תרגיל אחד' : `${count} תרגילים ומשפחות`;
export function createAnalysisLibrary({onAnalyze,isBusy}){
  let selected='handstand',family='handstand',assistance='none';
  const notice=$('libraryNotice');
  const error=e=>{notice.hidden=false;notice.textContent=e.message || 'שמירת הבחירה אינה זמינה.';};
  try{selected=readLibrarySelection(localStorage).exerciseId;}catch(e){error(e);}
  const restored=exerciseById(selected);family=restored.variation?restored.familyId:restored.id;assistance=restored.assistance||'none';
  function choose(id){
    if(isBusy())return false;
    selected=id;try{saveLibrarySelection(localStorage,id);}catch(e){error(e);}return true;
  }
  function open(x){
    if(isBusy())return;
    if(variationsFor(x.id).length){family=x.id;assistance='none';
      if(exerciseById(selected).familyId===family)assistance=exerciseById(selected).assistance||'none';
      else choose(variationsFor(family)[0].id);
      location.hash='variations';renderVariations();
    }else{if(!choose(x.id))return;location.hash='guide';renderGuide();}
  }
  function card(x,variation=false){
    const button=node('button',null,'library-card');button.type='button';button.dataset.exercise=x.id;
    button.append(analysisMediaFigure(x.id));
    const content=node('span',null,'library-card-content');
    content.append(node('span',x.difficulty,'library-difficulty'),node('strong',variation?x.variationLabel:x.name),...(!variation?[node('span',x.measurement,'library-measurement')]:[]),node('span',availabilityLabel(x),'library-status'));
    if(variation){button.setAttribute('aria-pressed',String(x.id===selected));button.onclick=()=>{if(choose(x.id)){renderVariations();$('variationGrid').querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});}};}
    else {content.append(node('span',variationsFor(x.id).length?'בחירת וריאציה ←':'הנחיות ופרטים ←','library-action'));button.onclick=()=>open(x);}
    button.append(content);return button;
  }
  function renderCatalog(){
    const query=$('librarySearch').value.trim().toLocaleLowerCase('he'),filter=$('libraryFilter').value;
    const bases=ANALYSIS_CATALOG.filter(x=>!x.variation || x.id==='handstand');
    const matches=bases.filter(x=>(!query || [x.name,x.english,x.category,x.equipment,...variationsFor(x.id).flatMap(v=>[v.name,v.english])].filter(Boolean).join(' ').toLocaleLowerCase('he').includes(query)) &&
      (filter==='all'||(filter==='supported'?analysisAvailability(x.id).status!=='unavailable':filter==='training'?x.source==='training':x.source!=='training')));
    $('catalogGrid').replaceChildren(...matches.map(x=>card(x)));
    $('catalogCount').textContent=`${catalogCountLabel(matches.length)} · ${ANALYSIS_CATALOG.length} אפשרויות בקטלוג המלא`;
    $('catalogEmpty').hidden=matches.length>0;
  }
  function renderVariations(){
    const all=variationsFor(family);
    if(!all.length){location.hash='guide';return;}
    $('variations-title').textContent='בחר וריאציה · '+exerciseById(family).name;
    $('assistanceOptions').hidden=!all.some(x=>x.assistance==='band');
    for(const b of $('assistanceOptions').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.assistance===assistance));
    const list=all.filter(x=>(x.assistance||'none')===assistance);
    $('variationGrid').replaceChildren(...list.map(x=>card(x,true)));
    $('variationContinue').disabled=!list.some(x=>x.id===selected);
    $('selectedVariationName').textContent='נבחר: '+exerciseById(selected).variationLabel;
  }
  function renderGuide(){
    const x=exerciseById(selected),config=analysisFor(x.id,{allowExperimental:true});
    $('guide-title').textContent=x.name;
    $('guideWorkout').hidden=x.id!=='planche-lean';
    $('guideBack').href=variationsFor(x.familyId).length?'#variations':'#catalog';
    $('guideArtwork').replaceChildren(analysisMediaFigure(x.id,{motion:true}));
    $('guideDefinition').textContent=x.definition || 'צילום ברור הוא הבסיס למדידה שימושית.';
    $('guideAvailability').textContent=availabilityLabel(x);
    $('guideFilming').textContent=x.filming;
    $('guideCriteria').replaceChildren(...x.criteria.map(text=>node('li',text)));
    $('guideLimit').textContent=x.id==='handstand'?'זמן ההחזקה ומדד הטכניקה מוצגים בנפרד. הניתוח מבוסס על היטל דו־ממדי ותלוי באיכות המעקב; המדד אינו ציון מאמן מכויל.':x.experimental?'בדיקה ניסיונית בלבד. מנח הווריאציה, האחיזה והיעדר תמיכה אינם מאומתים אוטומטית. אין ציון טכניקה.':'מנוע ניתוח לתרגיל זה עדיין לא מומש ואומת. הנחיות אלה הן הכנה לצילום; כרגע לא ניתן להעלות סרטון לניתוח התרגיל.';
    const button=$('guideAnalyze');button.disabled=!config;button.textContent=config?(x.experimental?'המשך לבדיקה ניסיונית':'התחל ניתוח'):'ניתוח בהמשך';
    $('guideHistory').textContent='היסטוריית הבחירה הזו';
    if(x.experimental){try{const h=readVariationHistory(localStorage,x.id);$('guideHistory').textContent=h.length?`${h.length} מדידות ניסיוניות בווריאציה זו. המדידה האחרונה: ${h[0].hold.seconds.toFixed(1)} שנ׳ — חלון אפשרי, ללא ציון.`:'אין עדיין מדידות לווריאציה זו.';}catch{$('guideHistory').textContent='קריאת ההיסטוריה אינה זמינה. הנתונים לא שונו.';}}
    else if(x.id!=='handstand')$('guideHistory').textContent='עדיין אין ניתוח זמין לבחירה זו. היסטוריית האימונים הקיימת נשמרת במסך התכניות.';
    $('guideHistoryLink').hidden=x.id!=='handstand'&&!x.experimental;
    $('guideHistoryLink').onclick=()=>{if(x.experimental){$('variationHistoryFilter').value=x.id;$('variationHistoryFilter').dispatchEvent(new Event('change'));}};
    button.onclick=()=>{if(config&&!isBusy()){onAnalyze(x.id);location.hash='analyze';}};
  }
  $('librarySearch').addEventListener('input',renderCatalog);$('libraryFilter').addEventListener('change',renderCatalog);
  for(const b of $('assistanceOptions').querySelectorAll('button'))b.onclick=()=>{
    assistance=b.dataset.assistance;
    const old=exerciseById(selected),next=variationsFor(family).find(x=>x.assistance===assistance&&x.baseVariation===old.baseVariation);
    if(next)choose(next.id);renderVariations();
  };
  const actionbar=$('variationActionbar');
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{
    const height=actionbar.getBoundingClientRect().height;
    if(height>0)document.documentElement.style.setProperty('--variation-action-height',`${height}px`);
  }).observe(actionbar,{box:'border-box'}); // Safe-area padding changes the border box, even when text height is unchanged.
  $('variationContinue').onclick=()=>{location.hash='guide';renderGuide();};
  renderCatalog();renderGuide();
  return {sync(id){if(!choose(id))return;const x=exerciseById(id);family=x.variation?x.familyId:x.id;assistance=x.assistance||'none';},render(screen){if(screen==='catalog')renderCatalog();if(screen==='variations')renderVariations();if(screen==='guide')renderGuide();}};
}
