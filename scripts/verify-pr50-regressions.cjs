/* Regression acceptance for the eight PR #50 QA findings.
 * Fresh browser profiles only. Optional real clips/runtime files stay outside Git.
 * --video portrait.mp4 --landscape-video landscape.mp4 --vision node_modules/@mediapipe/tasks-vision --model model.task
 */
const {chromium} = require('playwright');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const {resolve} = require('node:path');
const assert = require('node:assert/strict');
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = resolve(option('--source', resolve(__dirname, '..')));
const out = resolve(option('--out', resolve(root, '.artifacts/pr50-regressions')));
const port = Number(option('--port', '8804'));
const windows = [[320,640],[360,640],[390,720],[430,780],[1440,900],[780,390]];
const rect = element => { const r=element.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const server = spawn('python3', ['-m','http.server',String(port),'--directory',root], {stdio:'ignore'});
  let browser;
  const report = {filters:[],workouts:[],navigation:[],players:[],errors:[],posts:[],skipped:[]};
  try {
    browser = await chromium.launch({
      executablePath:option('--chromium','/usr/bin/chromium'),
      ignoreDefaultArgs:['--hide-scrollbars'],
      args:['--no-sandbox','--disable-features=OverlayScrollbar,OverlayScrollbars,FluentOverlayScrollbar'],
    });
    const base = `http://localhost:${port}/vercel-app/`;
    for (let i=0; ; i++) {
      try { if ((await fetch(base)).ok) break; } catch (e) { if(i>=50) throw e; }
      if(i>=50) throw Error('Local server unavailable');
      await new Promise(done=>setTimeout(done,100));
    }
    const fresh = async viewport => {
      const context = await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});
      const page = await context.newPage();
      page.on('pageerror',e=>report.errors.push(e.message));
      page.on('request',r=>{if(r.method()==='POST')report.posts.push(r.url())});
      await page.goto(base);
      await page.locator('#welcomeSkip').click();
      await page.waitForFunction(()=>document.body.dataset.screen==='home');
      return {page,context};
    };
    for (const [width,height] of windows) {
      const {page:p,context} = await fresh({width,height});
      await p.locator('#navAnalyze').click();
      await p.waitForFunction(()=>document.body.dataset.screen==='catalog');
      for (const scale of [1,2]) {
        await p.evaluate(s=>document.documentElement.style.fontSize=`${s*100}%`,scale);
        for (let repeat=0;repeat<2;repeat++) {
          if (await p.locator('#catalogOptions').getAttribute('open')!==null) await p.locator('#catalogOptions summary').click();
          await p.locator('#catalogOptions summary').click();
          await p.locator('#libraryFilter').selectOption('all');
          await p.locator('#librarySort').selectOption('available');
          const fields=await p.evaluate(() => {
            const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
            const panel=document.querySelector('.catalog-filter-fields');
            return {panel:r(panel),labels:[...panel.querySelectorAll('label')].map(r),selects:[...panel.querySelectorAll('select')].map(r),textFits:[...panel.querySelectorAll('select')].map(e=>{const style=getComputedStyle(e),context=document.createElement('canvas').getContext('2d');context.font=style.font;return [...e.options].every(o=>context.measureText(o.text).width<=e.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-22)}),documentWidth:document.documentElement.scrollWidth};
          });
          assert(fields.panel.width>200,'Collapsed filter panel');
          assert(fields.textFits.every(Boolean),'Filter value text does not fit');
          for (const field of [...fields.labels,...fields.selects]) {
            assert(field.width>150 && field.x>=fields.panel.x && field.right<=fields.panel.right+1,'Internal filter clipping');
          }
          const [a,b]=fields.labels;
          assert(a.right<=b.x+1 || b.right<=a.x+1 || a.bottom<=b.y+1 || b.bottom<=a.y+1,'Overlapping filter labels');
          assert(fields.documentWidth<=width,'Document overflow');
          report.filters.push({width,height,scale,repeat,...fields});
        }
        if(width===390)await p.screenshot({path:resolve(out,`filters-${scale}x.png`),fullPage:false});
      }
      await p.evaluate(()=>document.documentElement.style.fontSize='100%');
      await p.locator('#librarySearch').fill('zzzzzz');assert.equal(await p.locator('#catalogCount').innerText(),'0 התאמות');
      await p.locator('#librarySearch').fill('front lever');assert.equal(await p.locator('#catalogCount').innerText(),'התאמה אחת');
      await p.locator('#librarySearch').fill('');await p.locator('#libraryFilter').selectOption('supported');
      assert.equal(await p.locator('#catalogCount').innerText(),'2 התאמות');
      await p.locator('#libraryFilter').selectOption('skills');
      for (let repeat=0;repeat<2;repeat++) {
        await p.evaluate(()=>scrollTo(0,350));await p.waitForTimeout(80);
        const saved=await p.evaluate(()=>scrollY);
        await p.locator('#navHistory').click();await p.waitForFunction(()=>document.body.dataset.screen==='history');
        await p.goBack();await p.waitForFunction(()=>document.body.dataset.screen==='catalog');await p.waitForTimeout(80);
        const restored=await p.evaluate(()=>scrollY);assert(Math.abs(restored-saved)<=1,'Back lost scroll');
        await p.goForward();await p.waitForFunction(()=>document.body.dataset.screen==='history');
        await p.locator('#navAnalyze').click();await p.waitForFunction(()=>document.body.dataset.screen==='catalog');await p.waitForTimeout(80);
        assert.equal(await p.evaluate(()=>scrollY),0,'Fresh catalog visit restored another entry');
        report.navigation.push({width,saved,restored});
      }
      if(width===1440) {
        const positions=[];
        for(let i=0;i<20;i++) {
          await p.locator(i%2?'#navAnalyze':'#navHistory').click();await p.waitForTimeout(30);
          positions.push(await p.locator('.app-nav').evaluate(e=>e.getBoundingClientRect().left));
        }
        assert(Math.max(...positions)-Math.min(...positions)<=1,'Scrollbar moved navigation');
        report.navigation.push({classicScrollbar:true,positions});
      }
      await p.goto(base+'training.html');
      assert.equal(await p.locator('.app-nav a').nth(1).getAttribute('href'),'./#catalog');
      assert.equal(await p.locator('.app-nav a').last().getAttribute('href'),'./#history');
      await p.locator('.app-nav a').nth(1).click();await p.waitForFunction(()=>document.body.dataset.screen==='catalog');
      assert.equal(await p.locator('#navAnalyze').getAttribute('aria-current'),'page');
      await p.goto(base+'training.html');await p.locator('#start-workout').click();
      if(await p.locator('#begin').isVisible())await p.locator('#begin').click();
      await p.locator('#set-list input').first().check();
      await p.waitForFunction(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).exercises[0].completed[0]);
      await p.locator('#start-rest').click();
      await p.waitForFunction(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).restEndsAt!==null);
      const endsAt=await p.evaluate(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).restEndsAt);
      const operation=selector=>p.evaluate(sel=>({scroll:scrollY,button:document.querySelector(sel).getBoundingClientRect().y,rest:document.querySelector('#rest-time').getBoundingClientRect().y}),selector);
      for(let repeat=0;repeat<8;repeat++) {
        const selector=repeat%2?'#previous':'#next';
        await p.locator(selector).scrollIntoViewIfNeeded();await p.waitForTimeout(50);
        const before=await operation(selector);
        const method = repeat<2?'mouse':repeat<4?'touch':repeat<6?'keyboard':'no-native-focus';
        if(method==='keyboard')await p.locator(selector).press('Enter');
        else if(method==='touch')await p.locator(selector).tap();
        else {
          if(method==='no-native-focus')await p.evaluate(()=>{document.activeElement.blur();window.noNativeFocus=e=>e.preventDefault();document.addEventListener('mousedown',noNativeFocus,true)});
          await p.locator(selector).click();
          if(method==='no-native-focus')await p.evaluate(()=>document.removeEventListener('mousedown',noNativeFocus,true));
        }
        await p.waitForTimeout(70);const after=await operation(selector);
        assert(Math.abs(after.button-before.button)<=2,'Exercise switch moved operational controls');
        assert(Math.abs(after.rest-before.rest)<=2,'Exercise switch moved rest timer');
        if(before.rest>=0 && before.rest<height)assert(after.rest>=-1 && after.rest<height,'Visible rest timer left viewport');
        assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).restEndsAt),endsAt);
        report.workouts.push({width,height,method,before,after});
      }
      await p.reload();assert(await p.locator('#set-list input').first().isChecked());
      assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).restEndsAt),endsAt);
      await p.screenshot({path:resolve(out,`workout-${width}.png`)});
      await context.close();
    }
    if(!option('--video')) report.skipped.push('Real-video player checks: supply --video');
    else {
      for(const [label,file] of [['portrait',option('--video')],['landscape',option('--landscape-video')]]) {
        if(!file){report.skipped.push('Landscape clip not supplied');continue}
        for(const scored of [true,false]) {
          const {page:p,context}=await fresh({width:390,height:720});
          if(option('--vision')&&option('--model')) {
            await context.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**',r=>r.fulfill({path:resolve(option('--vision'),r.request().url().split('@0.10.14/')[1]),headers:{'Access-Control-Allow-Origin':'*'}}));
            await context.route('https://storage.googleapis.com/mediapipe-models/**',r=>r.fulfill({path:resolve(option('--model')),headers:{'Access-Control-Allow-Origin':'*'}}));
          }
          await p.evaluate(()=>addEventListener('movalyt:analysis-diagnostic',e=>window.qaDiagnostic=e.detail));
          await p.goto(base+'#analyze');await p.locator('#file').setInputFiles(resolve(file));
          if(scored)for(const[id,value]of[['handstandCaptureAngle','yes'],['handstandCaptureFraming','yes'],['handstandCaptureSupport','no']])await p.locator('#'+id).selectOption(value);
          await p.locator('#startReviewedAnalysis').click();
          await p.waitForFunction(()=>!!window.qaDiagnostic,null,{timeout:180000});
          await p.waitForFunction(()=>document.querySelector('#analyzerView').getAttribute('aria-busy')!=='true',null,{timeout:180000});
          const result=await p.evaluate(()=>({score:qaDiagnostic.score,hold:qaDiagnostic.holdTiming?.seconds}));
          if(scored)await p.locator('#watchSkeleton').click();
          await p.waitForFunction(()=>document.body.dataset.screen==='replay');
          await p.locator('#play').click();await p.waitForTimeout(100);await p.locator('#play').click();
          await p.locator('#scrub').press('End');await p.locator('#scrub').press('Home');await p.locator('#next').click();await p.locator('#spd').click();
          await p.locator('#scrub').evaluate(e=>{e.value='15.2';e.dispatchEvent(new Event('input',{bubbles:true}))});
          await p.waitForTimeout(200);await p.locator('#scrub').press('ArrowRight');await p.waitForFunction(()=>v.paused&&!v.seeking);await p.waitForTimeout(150);
          await p.evaluate(()=>{window.toggleEvents=[];for(const type of['pointerdown','pointerup','change'])document.addEventListener(type,e=>toggleEvents.push({type,id:e.target.id,scroll:scrollY}),true)});
          for(const method of ['label','label','checkbox','keyboard','touch','touch']) {
            await p.locator('.skeleton-control').scrollIntoViewIfNeeded();await p.waitForTimeout(70);
            const before=await p.evaluate(()=>({checked:showSkeleton.checked,paint:cv.toDataURL(),time:v.currentTime}));
            await p.evaluate(()=>toggleEvents=[]);
            if(method==='keyboard')await p.locator('#showSkeleton').press('Space');
            else if(method==='touch') {const box=await p.locator('.skeleton-control').boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2)}
            else await p.locator(method==='checkbox'?'#showSkeleton':'.skeleton-control').click();
            const after=await p.evaluate(()=>({checked:showSkeleton.checked,paint:cv.toDataURL(),time:v.currentTime,events:toggleEvents}));
            assert.notEqual(after.checked,before.checked,'First activation lost');
            assert.equal(after.events.filter(e=>e.type==='change'&&e.id==='showSkeleton').length,1,'Expected exactly one change');
            // Browser media clocks may settle by a millisecond after seeking. Keep
            // the tolerance below a frame in either real test clip (25/30fps).
            assert(Math.abs(after.time-before.time)<.01,'Overlay activation advanced media time');
            assert.notEqual(after.paint,before.paint,'Overlay did not repaint');
            const down=after.events.find(e=>e.type==='pointerdown'),up=after.events.find(e=>e.type==='pointerup');
            if(down&&up)assert(Math.abs(down.scroll-up.scroll)<=1,'Scrolled during pointer activation');
            report.players.push({label,scored,method,result,events:after.events});
          }
          for(const [width,height]of windows)for(const expanded of[false,true])for(const scale of[1,2]) {
            await p.setViewportSize({width,height});await p.evaluate(s=>document.documentElement.style.fontSize=`${s*100}%`,scale);
            if((await p.locator('#expandPlayer').getAttribute('aria-expanded'))!==String(expanded))await p.locator('#expandPlayer').click();
            await p.waitForTimeout(70);
            const geometry=await p.evaluate(()=>{const c=cv.getBoundingClientRect(),s=document.querySelector('.player-surface').getBoundingClientRect();return{canvas:{x:c.x,y:c.y,right:c.right,bottom:c.bottom,width:c.width,height:c.height},surface:{x:s.x,y:s.y,right:s.right,bottom:s.bottom},ratio:cv.width/cv.height}});
            const {canvas:c,surface:s}=geometry;
            assert(c.x>=s.x-1&&c.right<=s.right+1&&c.y>=s.y-1&&c.bottom<=s.bottom+1,'Clipped media corner');
            assert(Math.abs(c.width/c.height-geometry.ratio)<.002,'Rendered aspect ratio changed');
            report.players.push({label,scored,width,height,expanded,scale,geometry});
            if(width===390&&scale===1)await p.screenshot({path:resolve(out,`${label}-${scored?'scored':'timing'}-${expanded?'expanded':'normal'}.png`)});
          }
          await context.close();
        }
      }
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.posts,[]);
    console.log('PASS: PR50 regression acceptance',JSON.stringify({filters:report.filters.length,workouts:report.workouts.length,players:report.players.length,skipped:report.skipped}));
  } finally {
    fs.writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));
    await browser?.close();server.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
