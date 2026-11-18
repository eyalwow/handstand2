/* Focused mobile UX acceptance, using fresh local test profiles only.
 * Optional --video exercises decode/review, never inference or upload. */
const{chromium}=require('playwright'),{spawn}=require('node:child_process'),fs=require('node:fs'),{resolve}=require('node:path'),assert=require('node:assert/strict');
const args=process.argv.slice(2),opt=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const root=resolve(opt('--source',resolve(__dirname,'..'))),out=resolve(opt('--out',resolve(root,'.artifacts/training-ux'))),port=Number(opt('--port',8920));
(async()=>{fs.mkdirSync(out,{recursive:true});const server=spawn('python3',['-m','http.server',String(port),'--directory',root],{stdio:'ignore'});let browser;const report={cases:[],errors:[],posts:[],skipped:[]};try{
 browser=await chromium.launch({executablePath:opt('--chromium','/usr/bin/chromium'),args:['--no-sandbox']});const base=`http://localhost:${port}/vercel-app/`;
 for(let i=0;;i++){try{if((await fetch(base)).ok)break}catch(e){if(i===50)throw e}await new Promise(r=>setTimeout(r,100))}
 for(const[width,height]of[[320,640],[360,640],[390,720],[430,780],[1440,900]])for(const scale of[1,2]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(r.method()==='POST')report.posts.push(r.url())});
  await context.addInitScript(scale=>{const apply=()=>{if(!document.documentElement)return false;document.documentElement.style.fontSize=scale*100+'%';return true};if(!apply()){const o=new MutationObserver(()=>{if(apply())o.disconnect()});o.observe(document,{childList:true,subtree:true})}},scale);
  const box=selector=>p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:r.height,width:r.width}});
  const clear=async(selector,initial=false)=>{if(!initial)await p.locator(selector).scrollIntoViewIfNeeded();const r=await box(selector),nav=await p.locator('.app-nav').count()?await box('.app-nav'):{top:height};assert(r.top>=-1&&r.bottom<=Math.min(nav.top,height)+1,selector+' is covered');assert(r.height>=44,selector+' touch target');return r};
  await p.goto(base);await p.locator('#welcomeSkip').click();await p.waitForFunction(()=>document.body.dataset.screen==='home');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);
  const homeCard=await clear('.home-shortcuts a[data-web-only]',scale===1);
  assert.match(await p.locator('.home-shortcuts a[href="#catalog"]').innerText(),/קטלוג לניתוח/);
  await p.locator('.home-shortcuts a[data-web-only]').tap();await p.locator('#start-workout').waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);if(scale===1)await p.evaluate(()=>scrollTo(0,0));
  const start=await clear('#start-workout',scale===1);
  await p.locator('.training-shortcuts a[href="#progress-title"]').tap();await p.locator('#progress-title').waitFor();assert.match(await p.locator('#progress-title').innerText(),/האימונים ששמרת/);
  await p.locator('#nav-library').tap();assert.match(await p.locator('#library-title').innerText(),/לאימון/);
  await p.locator('#library-search').fill('פלאנק');await p.locator('.library-detail-button').first().click();await p.keyboard.press('Escape');
  await p.locator('#start-workout').click();await p.locator('#begin').click();await p.locator('#set-list input').first().check();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).exercises[0].completed[0]);
  await p.locator('#start-rest').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).restEndsAt!==null);
  const operations=await box('.workout-operations');if(scale===1)assert(operations.height<=height-24,'Operational group exceeds viewport');
  const saved=await p.evaluate(()=>localStorage.getItem('handstand-lab-active-workout-v1'));await p.reload();assert.equal(await p.evaluate(()=>localStorage.getItem('handstand-lab-active-workout-v1')),saved);assert(await p.locator('#set-list input').first().isChecked());
  await p.locator('.workout-switcher summary').click();await p.locator('#exercise-tabs button').nth(1).press('Enter');await p.waitForFunction(()=>document.querySelector('#exercise-tabs').children[1].getAttribute('aria-pressed')==='true',null,{timeout:3000});assert.equal(await p.locator('#exercise-tabs button').nth(1).getAttribute('aria-pressed'),'true');
  await p.locator('#previous').click();await p.locator('#skip-rest').click();await p.locator('#finish').click();await p.locator('#confirm-finish').click();await p.locator('#summary').waitFor();
  await p.locator('#back-to-training').click();await p.waitForFunction(()=>!!document.querySelector('#history .history-item'));assert((await p.locator('#history .history-item').count())>=1);
  await p.locator('.app-nav a[href="./#history"]').click();await p.waitForFunction(()=>document.body.dataset.screen==='history');await clear('.history-destinations a[data-web-only]');await p.locator('.history-destinations a[data-web-only]').click();assert.match(p.url(),/training.html#progress-title/);
  let review=null;
  if(opt('--video')){
   await p.goto(base+'#analyze');await p.locator('#file').setInputFiles(resolve(opt('--video')));await p.waitForFunction(()=>!document.querySelector('#startReviewedAnalysis').disabled);await p.waitForTimeout(100);
   review=await clear('#startReviewedAnalysis',scale===1);assert.equal(await p.locator('#handstandCaptureAngle').inputValue(),'unsure');assert.match(await p.locator('#startReviewedAnalysis').innerText(),/זמן בלבד/);
   await p.locator('#handstandCaptureAngle').selectOption('yes');await p.locator('#handstandCaptureFraming').selectOption('yes');await p.locator('#handstandCaptureSupport').selectOption('no');assert.match(await p.locator('#startReviewedAnalysis').innerText(),/מדד טכניקה/);
   await p.locator('.upload-preview summary').click();assert(await p.locator('#uploadPreview').isVisible());await p.locator('#discardUpload').click();assert(!(await p.locator('#uploadReview').isVisible()));
  }else if(!report.skipped.length)report.skipped.push('Video review: supply --video');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  report.cases.push({width,height,scale,homeCard,start,operations,review});console.log('checked',width,scale);
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.posts,[]);console.log('PASS',report.cases.length,'UX flows');
 }finally{fs.writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
