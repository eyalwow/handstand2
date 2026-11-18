/* Per-entry history regression: actual same-document, cross-document and reload
 * navigation. No engine calls, user-data migrations or private media. */
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const {resolve}=require('node:path');
const fs=require('node:fs'),assert=require('node:assert/strict');
const args=process.argv.slice(2),option=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
const root=resolve(option('--source',resolve(__dirname,'..'))),out=resolve(option('--out',resolve(root,'.artifacts/navigation-history'))),port=Number(option('--port','8915'));
(async()=>{
 fs.mkdirSync(out,{recursive:true});const server=spawn('python3',['-m','http.server',String(port),'--directory',root],{stdio:'ignore'});
 const report={cases:[],errors:[],posts:[],persistedReturns:0};let browser;
 try{
  const base=`http://localhost:${port}/vercel-app/`;
  for(let i=0;;i++){try{if((await fetch(base)).ok)break}catch(e){if(i===50)throw e}await new Promise(r=>setTimeout(r,100))}
  for(const bfcache of[false,true]){
   browser=await chromium.launch({executablePath:option('--chromium','/usr/bin/chromium'),args:['--no-sandbox'],...(bfcache?{ignoreDefaultArgs:['--disable-back-forward-cache']}:{})});
   for(const[width,height]of[[320,640],[360,640],[390,720],[430,780],[1440,900]])for(const scale of[1,2]){
    const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await c.newPage();
    p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(r.method()==='POST')report.posts.push(r.url())});
    await c.addInitScript(scale=>{
     window.navigationQA=[];addEventListener('pageshow',e=>navigationQA.push({persisted:e.persisted}));
     const apply=()=>{if(!document.documentElement)return false;document.documentElement.style.fontSize=scale*100+'%';return true};
     if(!apply()){const o=new MutationObserver(()=>{if(apply())o.disconnect()});o.observe(document,{childList:true,subtree:true})}
    },scale);
    const wait=async screen=>{await p.waitForFunction(s=>s==='training'?location.pathname.endsWith('training.html'):document.body.dataset.screen===s,screen);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150)};
    const move=async(direction,screen)=>{await p.evaluate(d=>history[d](),direction);await wait(screen)};
    const snap=()=>p.evaluate(()=>({y:scrollY,doc:performance.timeOrigin,query:document.querySelector('#librarySearch')?.value,filter:document.querySelector('#libraryFilter')?.value,sort:document.querySelector('#librarySort')?.value,open:document.querySelector('#catalogOptions')?.open,id:history.state?.movalytScrollEntry,persisted:window.navigationQA?.some(e=>e.persisted)}));
    const same=(before,after,label)=>{assert(Math.abs(before.y-after.y)<=1,label+' scroll');for(const k of['query','filter','sort','open','id'])assert.equal(after[k],before[k],label+' '+k)};
    const record=(kind,before,after)=>{report.cases.push({bfcache,width,height,scale,kind,before,after});if(after.persisted)report.persistedReturns++};
    await p.goto(base);await p.locator('#welcomeSkip').click();await wait('home');await p.locator('#navAnalyze').click();await wait('catalog');
    // Both entry types, repeated Back/Forward. Saved UI must precede scroll restore.
    for(const dest of['history','training'])for(let repeat=0;repeat<3;repeat++){
     await p.evaluate(y=>scrollTo(0,y),350+repeat*80);await p.waitForTimeout(80);const before=await snap();
     await p.locator(dest==='history'?'#navHistory':'#navTraining').click();await wait(dest);
     if(dest==='training'){await p.evaluate(()=>scrollTo(0,240));await p.waitForTimeout(80)}const away=await snap();
     await move('back','catalog');const after=await snap();same(before,after,dest);if(!bfcache&&dest==='training')assert.notEqual(after.doc,before.doc);record(dest,before,after);
     await move('forward',dest);const forward=await snap();assert(Math.abs(away.y-forward.y)<=1,'Forward position');
     await p.locator('.app-nav a[href$="#catalog"]').click();await wait('catalog');assert.equal(await p.evaluate(()=>scrollY),0,'New entry must start at top');
    }
    // Two independent visits to the same URL, with distinct searches and positions.
    const setView=async(query,sort,y)=>{await p.locator('#catalogOptions summary').click();await p.locator('#libraryFilter').selectOption('all');await p.locator('#librarySort').selectOption(sort);await p.locator('#librarySearch').fill(query);await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(100);return snap()};
    const a=await setView('a','name',350);await p.locator('#navHistory').click();await wait('history');await p.locator('#navAnalyze').click();await wait('catalog');
    const b=await setView('p','available',520);assert.notEqual(a.id,b.id);await p.reload();await wait('catalog');same(b,await snap(),'Reload');record('reload-with-search',b,await snap());
    await p.locator('#navTraining').click();await wait('training');await p.reload();await wait('training');await move('back','catalog');same(b,await snap(),'Catalog B');record('search-B',b,await snap());
    await move('back','history');await move('back','catalog');same(a,await snap(),'Older Catalog A');record('older-search-A',a,await snap());
    await move('forward','history');await move('forward','catalog');same(b,await snap(),'Forward Catalog B');record('forward-search-B',b,await snap());
    if(width===390&&scale===1)await p.screenshot({path:resolve(out,`catalog-${bfcache?'bfcache':'cold'}.png`)});
    // Refresh once more after returning to an existing entry; no document Map survives.
    const before=await snap();await p.reload();await wait('catalog');same(before,await snap(),'Second reload');record('second-reload',before,await snap());
    await c.close();
   }
   await browser.close();browser=null;
  }
  assert(report.persistedReturns>0,'BFCache-enabled run never restored a persisted document');assert.deepEqual(report.errors,[]);assert.deepEqual(report.posts,[]);
  console.log('PASS',JSON.stringify({cases:report.cases.length,persistedReturns:report.persistedReturns}));
 }finally{fs.writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
