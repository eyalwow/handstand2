import test from "node:test";
import assert from "node:assert/strict";
import {resetCoachFeedback,setupCoach,showCoachFeedback} from "../vercel-app/ai-feedback.js";

test("a user's pose measurements reach the server only after consent, and revocation restores local feedback",async()=>{
 const nodes=new Map();
 function element(id=""){
  return {id,disabled:false,hidden:false,checked:false,textContent:"",children:[],listeners:{},
   addEventListener(type,fn){this.listeners[type]=fn},
   replaceChildren(){this.children=[]},appendChild(el){this.children.push(el)}};
 }
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement(){return element()}};
 const data=new Map();
 globalThis.localStorage={getItem(k){return data.get(k)||null},setItem(k,v){data.set(k,v)},removeItem(k){data.delete(k)}};
 let posts=0,holdNext=false,release;
 globalThis.fetch=async(url,options={})=>{
  if(options.method!=="POST")return{ok:true,json:async()=>({enabled:true})};
  posts++;
  if(holdNext)return new Promise(resolve=>{release=resolve});
  return{ok:true,json:async()=>({summary:"ok",observations:[],drills:[{id:"wallLine",reason:"קו"}]})};
 };
 setupCoach();
 await new Promise(r=>setTimeout(r,0));
 const res={val:{banana:0,lean:0,shoulder:0,elbow:0,sway:0},sc:{banana:100,lean:100,shoulder:100,elbow:100,sway:100},total:100,hold:3,swayOk:true};
 showCoachFeedback(res,null);
 await new Promise(r=>setTimeout(r,0));
 assert.equal(posts,0);
 const checkbox=document.getElementById("aiConsent");
 checkbox.checked=true;checkbox.listeners.change();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(posts,1);
 assert.equal(localStorage.getItem("movalyt-ai-measurements-consent-v2"),"yes");
 checkbox.checked=false;checkbox.listeners.change();
 assert.equal(localStorage.getItem("movalyt-ai-measurements-consent-v2"),null);
 showCoachFeedback(res,null);
 await new Promise(r=>setTimeout(r,0));
 assert.equal(posts,1);
 assert.equal(document.getElementById("coachBadge").textContent,"משוב מדידות");

 holdNext=true;
 checkbox.checked=true;checkbox.listeners.change();
 await new Promise(r=>setTimeout(r,0));
 assert.equal(posts,2);
 checkbox.checked=false;checkbox.listeners.change();
 release({ok:true,json:async()=>({summary:"הביצוע מושלם",observations:[],drills:[{id:"wallLine",reason:"קו"}]})});
 await new Promise(r=>setTimeout(r,0));
 assert.equal(document.getElementById("coachBadge").textContent,"משוב מדידות");
 assert.notEqual(document.getElementById("coachSummary").textContent,"הביצוע מושלם");

 resetCoachFeedback();
 assert.equal(document.getElementById("coachPanel").hidden,true);
});
