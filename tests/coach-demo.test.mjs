import test from 'node:test';import assert from 'node:assert/strict';import {athletes,programs,stats,visibleAnalysis} from '../coach-app/app.js';
test('synthetic assignments resolve and dashboard totals reflect fixtures',()=>{assert.equal(new Set(athletes.map(a=>a.id)).size,athletes.length);for(const a of athletes){assert.ok(a.id.startsWith('demo-'));assert.ok(programs.some(p=>p.id===a.plan));assert.ok(a.done<=a.total);}assert.deepEqual(stats(athletes),{count:4,done:10,total:14,attention:2});});
test('revoked consent hides analysis without deleting athlete history',()=>{const a={...athletes[0]};assert.ok(visibleAnalysis(a));a.shared=false;assert.equal(visibleAnalysis(a),false);assert.equal(a.done,3);assert.equal(visibleAnalysis(null),false);});
test('actual screen controller supports search, profile, revocation and escaped temporary notes',async()=>{
 let markup='';const els=new Map();const main={get innerHTML(){return markup},set innerHTML(v){markup=v;els.clear();},focus(){}};
 globalThis.location={hash:'#athletes'};let route;globalThis.window={addEventListener(n,fn){route=fn},scrollTo(){}};
 globalThis.document={querySelector(s){if(s==='#main')return main;if(s.startsWith('#')&&markup.includes('id="'+s.slice(1)+'"')){if(!els.has(s))els.set(s,{value:'',textContent:''});return els.get(s);}return null;},querySelectorAll(){return []}};
 try{
 await import('../coach-app/app.js?screen-test');
 const search=document.querySelector('#search');search.oninput({target:{value:'לא קיים'}});assert.match(document.querySelector('#roster').innerHTML,/לא נמצאו/);
 location.hash='#athlete/demo-noam';route();assert.match(markup,/איזון מעל הידיים/);
 document.querySelector('#sharing').onclick();assert.match(markup,/אין שיתוף פעיל/);
 location.hash='#analysis/demo-noam';route();assert.match(markup,/הניתוח אינו משותף/);assert.ok(!markup.includes('82'));
 location.hash='#athlete/demo-noam';route();document.querySelector('#sharing').onclick();location.hash='#analysis/demo-noam';route();
 document.querySelector('#note').value='<script>example</script>';document.querySelector('#note-form').onsubmit({preventDefault(){}});assert.match(document.querySelector('#note-status').textContent,/נשמרה/);route();assert.ok(markup.includes('&lt;script&gt;example&lt;/script&gt;'));assert.ok(!markup.includes('<script>example'));
 location.hash='#program/balance';route();assert.match(markup,/מבנה אימון לדוגמה/);
 }finally{delete globalThis.document;delete globalThis.window;delete globalThis.location;}
});
