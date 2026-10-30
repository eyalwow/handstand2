import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {readAnalysisHistory} from '../vercel-app/analysis-history.js';
const code=readFileSync(new URL('../vercel-app/home-ui.js',import.meta.url),'utf8').replace('import {readAnalysisHistory} from "./analysis-history.js";','');
function openHistory(raw){
 const nodes={};class Element{constructor(){this.children=[];this.textContent=''}replaceChildren(){this.children=[];this.textContent=''}append(...items){this.children.push(...items)}setAttribute(){}}
 const text=node=>node.textContent+node.children.map(text).join(' ');
 let writes=0;const storage={getItem:()=>raw,setItem(){writes++},removeItem(){writes++}};
 runInNewContext(code,{readAnalysisHistory,document:{getElementById:id=>nodes[id]??=(new Element()),createElement:()=>new Element()},localStorage:storage,window:{addEventListener(){}},Intl,Date});
 return {recent:text(nodes['home-analysis-history']),history:text(nodes['history-list']),writes};
}
test('fresh and corrupt analysis history never seeds or overwrites user storage',()=>{
 for(const raw of [null,'broken','{}']){const result=openHistory(raw);assert.equal(result.writes,0);assert.doesNotMatch(result.history,/100/);}
});
test('analysis history excludes invalid scores and compares only compatible saved measurements',()=>{
 const entries=[{date:'2026-10-01',score:71,model:'v2-hold'},{date:'2026-10-02',score:76,model:'v2-hold'},{date:'2026-10-03',score:999,model:'v2-hold'}];
 const result=openHistory(JSON.stringify(entries));assert.match(result.recent,/76 \/ 100/);assert.match(result.recent,/\+5/);assert.doesNotMatch(result.history,/999/);assert.equal(result.writes,0);
 entries[1].model='v2-entry-hold';assert.doesNotMatch(openHistory(JSON.stringify(entries)).recent,/\+5/);
 entries[1].model='v3-fixed-hold';assert.match(openHistory(JSON.stringify(entries)).recent,/76 \/ 100/);assert.doesNotMatch(openHistory(JSON.stringify(entries)).recent,/\+5/);
 entries[0].model='v3-fixed-hold';assert.match(openHistory(JSON.stringify(entries)).recent,/\+5/);
});
