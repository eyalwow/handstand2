import test from 'node:test';
import assert from 'node:assert/strict';
import {ANALYSIS_CATALOG,exerciseById,trainingCatalogId} from '../vercel-app/analysis-catalog.js';
import {EXERCISES} from '../vercel-app/exercise-library.js';
import {analysisFor} from '../vercel-app/analysis-registry.js';
import {variationsFor} from '../vercel-app/analysis-library-ui.js';
import {ANALYSIS_MEDIA,approvedMedia} from '../vercel-app/analysis-media.js';
import {readLibrarySelection,saveLibrarySelection,LIBRARY_SELECTION_KEY} from '../vercel-app/library-state.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const memory=(raw)=>{const values=new Map(raw?[[LIBRARY_SELECTION_KEY,raw]]:[]);return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),values};};
test('every legacy analysis ID and training name remains available without changing original objects',()=>{
 const old=['handstand','planche','front-lever','back-lever','muscle-up','pull-up','chin-up','dip','push-up','l-sit','v-sit','human-flag','dragon-flag','pistol-squat','hollow-body','arch-hold','scapular-pull-up','handstand-push-up','toes-to-bar','ring-support',
 ...['tuck','advanced-tuck','one-leg','straddle','full'].map(x=>'front-lever-'+x),...['tuck','advanced-tuck','straddle','full'].map(x=>'planche-'+x),...['tuck','one-leg','full'].map(x=>'l-sit-'+x)];
 for(const id of old)assert.equal(exerciseById(id).historyId,id);
 for(const item of EXERCISES){const entry=exerciseById(trainingCatalogId(item.name));assert.equal(entry.legacyName,item.name);assert.equal(entry.definition,item.tip);assert.equal(entry.engineId,null);assert.equal(item.id,undefined);}
 assert.equal(new Set(ANALYSIS_CATALOG.map(x=>x.id)).size,ANALYSIS_CATALOG.length);
});
test('Planche and Front Lever define six progressions with assistance inside each family; L-sit defines three',()=>{
 for(const family of ['planche','front-lever']){
  const variants=variationsFor(family);assert.equal(variants.length,family==='planche'?13:12);
  for(const base of ['tuck','advanced-tuck','super-advanced-tuck','one-leg','straddle','full']){
   const plain=exerciseById(`${family}-${base}`),band=exerciseById(`${family}-${base}-band`);
   assert.equal(band.familyId,family);assert.equal(band.assistance,'band');assert.equal(plain.baseVariation,band.baseVariation);
   assert.notEqual(plain.historyId,band.historyId);assert.ok(plain.definition&&band.criteria.length&&band.filming.includes('עיגון'));
   assert.equal(analysisFor(band.id,{allowExperimental:true}),null);
  }
 }
 assert.equal(variationsFor('l-sit').length,3);assert.equal(variationsFor('handstand').length,0);assert.equal(variationsFor('pull-up').length,0);
});
test('new variants cannot silently dispatch to Handstand or unverified Front Lever',()=>{
 const runnable=ANALYSIS_CATALOG.filter(x=>analysisFor(x.id,{allowExperimental:true}));
 assert.deepEqual(runnable.map(x=>x.id).sort(),['handstand',...['tuck','advanced-tuck','one-leg','straddle','full'].map(x=>'front-lever-'+x)].sort());
 assert.equal(analysisFor('front-lever-super-advanced-tuck',{allowExperimental:true}),null);
});
test('selection restores supported and future choices without touching histories; corrupt and future data remain intact',()=>{
 const storage=memory();storage.setItem('handstand-lab-analyses-v1','legacy');storage.setItem('movalyt-variation-observations-v1','observations');
 assert.equal(readLibrarySelection(storage).exerciseId,'handstand');
 for(const id of ['front-lever-full','planche-full-band',trainingCatalogId(EXERCISES[0].name)]){saveLibrarySelection(storage,id);assert.equal(readLibrarySelection(storage).exerciseId,id);}
 assert.equal(storage.getItem('handstand-lab-analyses-v1'),'legacy');assert.equal(storage.getItem('movalyt-variation-observations-v1'),'observations');
 for(const raw of ['broken','{}','{"version":2,"exerciseId":"handstand"}','{"version":1,"exerciseId":"deleted"}']){
  const bad=memory(raw);assert.throws(()=>saveLibrarySelection(bad,'handstand'));assert.equal(bad.getItem(LIBRARY_SELECTION_KEY),raw);
 }
 assert.throws(()=>saveLibrarySelection(storage,'__proto__'));assert.throws(()=>saveLibrarySelection({getItem:()=>null,setItem:()=>{throw Error('quota');}},'handstand'));
});
test('approved illustrations ship only for the intended catalog exercises',()=>{
 const illustrated = Object.values(ANALYSIS_MEDIA).filter(approvedMedia);
 assert.equal(illustrated.length, 24);
 for(const asset of illustrated){
  const bytes = readFileSync(new URL('../vercel-app/'+asset.image, import.meta.url));
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', asset.id);
  assert.ok(bytes.length < 32_000, asset.id);
 }
 for(const id of ['front-lever-advanced-tuck','front-lever-straddle','l-sit']){
  assert.equal(approvedMedia(ANALYSIS_MEDIA[id]), null, id);
 }
 assert.equal(ANALYSIS_MEDIA['front-lever-full-band'].image, './assets/anatomy/banded-full-front-lever.webp');
 assert.equal(ANALYSIS_MEDIA['planche-full-band'].image, './assets/anatomy/banded-full-planche.webp');
 assert.equal(ANALYSIS_MEDIA['l-sit-full'].image, './assets/anatomy/l-sit.webp');
});
test('media approval requires anatomy, identity, support, camera, grayscale, rights and a local still before motion',()=>{
 assert.equal(Object.keys(ANALYSIS_MEDIA).length,ANALYSIS_CATALOG.length);
 const approvals=Object.fromEntries(['same-athlete','anatomy','support','camera','grayscale','rights'].map(k=>[k,true]));
 const asset={status:'approved',image:'./assets/anatomy/planche/full.webp',alt:'Full Planche',approvals};
 assert.ok(approvedMedia(asset));assert.equal(approvedMedia({...asset,image:'https://example.com/full.webp'}),null);
 for(const k of Object.keys(approvals))assert.equal(approvedMedia({...asset,approvals:{...approvals,[k]:false}}),null);
 assert.equal(approvedMedia({...asset,review:[],approvals:{}}),null);
 for(const seconds of [1,5])assert.equal(approvedMedia({...asset,animation:{src:'./assets/anatomy/planche/full.mp4',approved:true,seconds}}).animation,null);
 assert.ok(approvedMedia({...asset,animation:{src:'./assets/anatomy/planche/full.mp4',approved:true,seconds:3}}).animation);
});
test('PR34 measurement, scoring, sampling, runtime and Coach source stay byte-identical',()=>{
 // SHA-256 snapshot of PR #34 a9023c1, usable in shallow CI checkouts.
 const baseline={
  "handstand-engine.js": "003a4b1e2946a4d6dc8a8f01aa0c11368ed9ec3e9ce2af3aaa0814f9db850d52",
  "handstand-measurement.js": "b67a92d5c4cd031cfbd6caffb995cbf5ee45ae2d4fe94fa8a932870f2f547fae",
  "handstand-temporal.js": "1e58667adc5a011326805d602a570356f4def503eb399ce8bef64a0f5cf41706",
  "handstand-score-policy.js": "14fffc29cd6207ce9146f4b309e72ad948d78fb7c905806b6339742988c7e499",
  "handstand-sampling.js": "cfc5f3884e55d8ac24fbb4ad53647c432768dc7ec3c641f6eec9dafd2845cf66",
  "video-sampling.js": "273fec540b48c8f1307f41882fdf5c018c17605b9e2f9ee2e440882a15d36ab9",
  "pose-runtime.js": "ee3ad8be5cf922a82c5ad12b312fb08ff108c7e3b600b1787f41ff04b12dea9c",
  "pose-main.js": "5a2316bc9f7a6dd9a680c768f58d8833dc440ed594b01c3f8a692ec8be340593",
  "pose-worker.js": "b611373de35f1bab566ecca24284e48d913da34056cf13f6f1001ea931c83d5c",
  "handstand-coaching.js": "89c9e077b01203171ae93e8eb947e9a54b63b721d958c20c6ead9ca09194695f",
  "server-gemini.js": "e0640dcebb26d5e7b248f925eb94643368629ae7380d84a9f6c76c440ee269bd",
  "ai-feedback.js": "27a3ea356a42635ad37cd7a7931c8c11e6e6290ed5952d5e5cb3a1c19b28cca3"
};
 for(const [file,hash] of Object.entries(baseline)){
  assert.equal(createHash('sha256').update(readFileSync(new URL('../vercel-app/'+file,import.meta.url))).digest('hex'),hash,file);
 }
});

test('family availability and supported filter resolve only actually registered analysis options',async()=>{
 const {analysisAvailability,analysisAvailabilityLabel}=await import('../vercel-app/analysis-registry.js');
 assert.deepEqual(analysisAvailability('handstand'),{status:'active',count:1,hasVariations:false});
 assert.deepEqual(analysisAvailability('front-lever'),{status:'experimental',count:5,hasVariations:true});
 assert.match(analysisAvailabilityLabel('front-lever'),/ניסיוני.*5 וריאציות.*ללא ציון/);
 assert.equal(analysisFor('front-lever',{allowExperimental:true}),null);
 for(const x of ANALYSIS_CATALOG){
  const options=[x,...variationsFor(x.id)].filter(v=>analysisFor(v.id,{allowExperimental:true}));
  const availability=analysisAvailability(x.id);
  assert.equal(availability.status!=='unavailable',options.length>0,x.id);
  assert.equal(availability.count,options.length,x.id);
 }
 assert.deepEqual(analysisAvailability('unknown'),{status:'unavailable',count:0,hasVariations:false});
 for(const id of ['planche','front-lever-full-band','front-lever-super-advanced-tuck'])assert.equal(analysisAvailability(id).status,'unavailable');
});
test('Hebrew exercise terminology stays consistent while every original exercise/history identity is preserved',()=>{
 const names={'front-lever':'פרונט לבר','back-lever':'בק לבר',planche:'פלאנץ׳'};
 for(const [id,label] of Object.entries(names))assert.equal(exerciseById(id).name,label);
 for(const family of ['front-lever','planche']){
  for(const [id,label] of Object.entries({tuck:'טאק','advanced-tuck':'אדוונס טאק','super-advanced-tuck':'סופר אדוונס טאק',straddle:'סטראדל',full:'מלא'})){
   assert.equal(exerciseById(family+'-'+id).variationLabel,label);
   assert.equal(exerciseById(family+'-'+id+'-band').variationLabel,label+' עם גומיית עזר');
  }
 }
 assert.ok(ANALYSIS_CATALOG.every(x=>!x.name.includes('מנוף קדמי')));
 // Snapshot of all 158 (id, historyId, legacy training name) tuples before QA.
 const identities=ANALYSIS_CATALOG.filter(x=>x.id!=='planche-lean').map(x=>[x.id,x.historyId,x.legacyName??null]);
 assert.equal(createHash('sha256').update(JSON.stringify(identities)).digest('hex'),'c12fd7f7476111b95aa78c13f3b7dfdf4329d054bc5daeafee16f3eadad695a3');
});
test('Hebrew singular catalog count is grammatical',async()=>{
 const {catalogCountLabel}=await import('../vercel-app/analysis-library-ui.js');
 assert.equal(catalogCountLabel(1),'תרגיל אחד');
 assert.equal(catalogCountLabel(0),'0 תרגילים ומשפחות');
 assert.equal(catalogCountLabel(20),'20 תרגילים ומשפחות');
});

test('family covers use approved full stills and banded full stays within each family',()=>{
 for(const family of ['planche','front-lever']){
  assert.equal(approvedMedia(ANALYSIS_MEDIA[family]).image,approvedMedia(ANALYSIS_MEDIA[family+'-full']).image);
  const band=exerciseById(family+'-full-band');
  assert.ok(band.variation);assert.equal(band.familyId,family);
  assert.equal(ANALYSIS_CATALOG.filter(x=>!x.variation&&x.id.includes('band')).length,0);
 }
});
test('Planche Lean is a unique unassisted Planche choice with grounded feet and the supplied illustration',()=>{
 const lean=exerciseById('planche-lean');
 assert.equal(variationsFor('planche').filter(x=>x.id===lean.id).length,1);
 assert.equal(lean.english,'Planche Lean');assert.equal(lean.assistance,'none');
 assert.ok(lean.criteria.some(x=>x.includes('הרגליים נשארות על הרצפה')));
 assert.equal(analysisFor(lean.id,{allowExperimental:true}),null);
 assert.equal(approvedMedia(ANALYSIS_MEDIA[lean.id]).image,'./assets/anatomy/planche-lean.webp');
 assert.equal(approvedMedia(ANALYSIS_MEDIA.handstand).image,'./assets/anatomy/handstand-corrected.webp');
 const storage=memory();saveLibrarySelection(storage,lean.id);
 assert.equal(readLibrarySelection(storage).exerciseId,lean.id);
});
