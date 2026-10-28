import test from 'node:test';
import assert from 'node:assert/strict';
import {resetCoachFeedback,setupCoach,showCoachFeedback} from '../vercel-app/ai-feedback.js';
import {getSharedGemini,checkGeminiStatus,geminiReady} from '../vercel-app/server-gemini.js';

test('local analysis and explicit cloud availability action never contact a provider, even with old consent',async()=>{
 const nodes=new Map();
 function element(id=''){return{id,hidden:false,textContent:'',children:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn},replaceChildren(){this.children=[]},appendChild(el){this.children.push(el)}}}
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement(){return element()}};
 const key='movalyt-ai-measurements-consent-v2';const data=new Map([[key,'yes'],['handstand-lab-analyses-v1','[{"score":73}]']]);
 globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const originalFetch=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Unexpected network request')};
 try{
  setupCoach();assert.equal(document.getElementById('revokeCloudConsent').hidden,false);
  const res={val:{banana:0,lean:0,shoulder:0,elbow:0,sway:0},sc:{banana:100,lean:100,shoulder:100,elbow:100,sway:100},total:100,hold:3,swayOk:true};
  showCoachFeedback(res,null);await new Promise(r=>setTimeout(r,0));
  assert.equal(document.getElementById('coachBadge').textContent,'משוב מדידות');
  assert.equal(document.getElementById('coachPanel').hidden,false);
  document.getElementById('cloudRequest').listeners.click();
  assert.match(document.getElementById('cloudNotice').textContent,/אינו זמין/);
  assert.equal(await checkGeminiStatus(),false);assert.equal(geminiReady(),false);
  await assert.rejects(getSharedGemini({rawVideo:'never sent'}),/אינו זמין/);
  document.getElementById('revokeCloudConsent').listeners.click();
  assert.equal(data.has(key),false);assert.equal(document.getElementById('revokeCloudConsent').hidden,true);
  assert.equal(data.get('handstand-lab-analyses-v1'),'[{"score":73}]');
  showCoachFeedback(res,null);assert.equal(calls,0);
  resetCoachFeedback();assert.equal(document.getElementById('coachPanel').hidden,true);
 }finally{globalThis.fetch=originalFetch}
});
