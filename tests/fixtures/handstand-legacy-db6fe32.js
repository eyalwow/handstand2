// Frozen PR #33 scorer for before/after regression comparisons only.
const K={L:{ear:7,shoulder:11,elbow:13,wrist:15,hip:23,ankle:27},R:{ear:8,shoulder:12,elbow:14,wrist:16,hip:24,ankle:28}};
const TH={banana:[.03,.12],lean:[3,15],shoulder:[8,35],elbow:[8,30],sway:[.01,.05]};
const WT={banana:.3,lean:.2,shoulder:.2,elbow:.15,sway:.15};
const NAME={banana:"קו הגוף",lean:"איזון",shoulder:"כתפיים",elbow:"ידיים",sway:"יציבות"};
const TIP={
 arch:"האגן בורח קדימה מעבר לקו (גב מקושת). כווץ ישבן, הכנס צלעות פנימה והחזר את האגן מעל הכתפיים.",
 back:"האגן נשאר מאחורי הקו. הבא את האגן קדימה מעל הכתפיים וכווץ ישבן.",
 lean:"הגוף נוטה מהאנך. תאזן עם לחץ באצבעות: נופל קדימה = לחץ בקצות האצבעות, נופל אחורה = לחץ בכף היד.",
 shoulder:"הכתפיים לא פתוחות עד הסוף. דחוף גבוה דרך הכתפיים, אוזניים בין הידיים.",
 elbow:"המרפקים מתכופפים. נעל את הידיים והמשך לדחוף את הרצפה.",
 sway:"הרבה התנדנדות. תתרגל החזקות קצרות עם לחץ יציב באצבעות, או החזקות על קיר.",
 short:"ההחזקה קצרה (פחות מ-5 שניות), אז הציון פחות מדויק. נסה להחזיק 5 שניות ומעלה כדי לקבל תמונה מלאה."};
const SCALE=1.5;let LAST=null;
const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const std=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
const ang=(a,b,c)=>{const u=[a[0]-b[0],a[1]-b[1]],w=[c[0]-b[0],c[1]-b[1]];
 const cs=(u[0]*w[0]+u[1]*w[1])/(Math.hypot(...u)*Math.hypot(...w)+1e-9);return Math.acos(Math.max(-1,Math.min(1,cs)))*180/Math.PI};
const band=(v,[g,b])=>v<=g?100:v>=b?0:100*(b-v)/(b-g);
function longestRun(mask,gapMax){let best=null,s=null,last=null,gap=0;
 mask.forEach((m,i)=>{if(m){if(s===null)s=i;last=i;gap=0}else if(s!==null){gap++;if(gap>gapMax){if(!best||last-s>best[1]-best[0])best=[s,last];s=null}}});
 if(s!==null&&(!best||last-s>best[1]-best[0]))best=[s,last];return best}
function analyze(fr,fps){
 const vis={L:0,R:0};
 fr.forEach(f=>{if(f)for(const s of["L","R"])for(const i of Object.values(K[s]))vis[s]+=f[i].v});
 const side=vis.L>=vis.R?"L":"R",k=K[side];
 const P=f=>Object.fromEntries(Object.entries(k).map(([n,i])=>[n,[f[i].x,f[i].y]]));
 const inv=f=>{if(!f||!["shoulder","elbow","wrist","hip","ankle"].every(n=>f[k[n]].v>=.5))return false;
  const p=P(f);return p.ankle[1]<p.hip[1]&&p.hip[1]<p.shoulder[1]&&p.shoulder[1]<p.wrist[1]&&Math.abs(p.ankle[0]-p.wrist[0])<Math.abs(p.ankle[1]-p.wrist[1])};
 const gap=Math.max(1,Math.round(.3*fps));
 let mask=fr.map(inv),run=longestRun(mask,gap),relaxed=false;
 if(!run||run[1]-run[0]+1<3){
  const loose=f=>{if(!f||!["shoulder","elbow","wrist","hip","ankle"].every(n=>f[k[n]].v>=.3))return false;const p=P(f);return p.ankle[1]<p.hip[1]&&p.hip[1]<p.shoulder[1]};
  mask=fr.map(loose);run=longestRun(mask,gap);relaxed=true}
 if(!run||run[1]-run[0]+1<3)return null;
 const idx=[];for(let i=run[0];i<=run[1];i++)if(mask[i])idx.push(i);
 const facing=med(idx.map(i=>fr[i][0].x-fr[i][k.ear].x))>=0?1:-1;
 const metr=f=>{const p=P(f),{shoulder:s,hip:h,ankle:a,wrist:w,elbow:e}=p;
  const body=Math.hypot(a[0]-s[0],a[1]-s[1])+1e-9,t=(h[1]-s[1])/(a[1]-s[1]),lx=s[0]+t*(a[0]-s[0]);
  return{banana:facing*(h[0]-lx)/body,lean:Math.atan2(Math.abs(a[0]-w[0]),Math.abs(a[1]-w[1])+1e-9)*180/Math.PI,
   shoulder:180-ang(h,s,e),elbow:180-ang(s,e,w),hipx:(h[0]-w[0])/body}};
 const ms=idx.map(i=>metr(fr[i]));
 const m=n=>med(ms.map(x=>x[n]));
 const val={banana:m("banana"),lean:m("lean"),shoulder:Math.max(0,m("shoulder")),elbow:Math.max(0,m("elbow")),sway:std(ms.map(x=>x.hipx))};
 const swayOk=idx.length>=5;
 // Preserve raw sway diagnostics, but prevent isolated detector jumps dominating the score.
 const rawSway=val.sway;val.sway=1.4826*med(ms.map(x=>Math.abs(x.hipx-med(ms.map(y=>y.hipx)))));
 const sc={};let total=0;
 for(const n in TH){sc[n]=band(n==="banana"?Math.abs(val[n]):val[n],TH[n].map(x=>x*SCALE));if(n!=="sway"||swayOk)total+=sc[n]*WT[n]}
 if(!swayOk)total/=1-WT.sway;
 const sf=m=>{const q=(n,v)=>band(v,TH[n].map(x=>x*SCALE))*WT[n];return(q("banana",Math.abs(m.banana))+q("lean",m.lean)+q("shoulder",Math.max(0,m.shoulder))+q("elbow",Math.max(0,m.elbow)))/.85};
 const series=fr.map((f,i)=>mask[i]?sf(metr(f)):null);
 const thirds=[0,1,2].map(j=>{
  const a=Math.floor(j*ms.length/3),b=Math.floor((j+1)*ms.length/3),subset=ms.slice(a,b);
  const metric=k=>{const scale=k==="banana"?1000:10;return subset.length?Math.round(med(subset.map(x=>x[k]))*scale)/scale:null};
  return{phase:["start","middle","end"][j],pelvisOffsetPercent:subset.length?Math.round(metric("banana")*1000)/10:null,leanDegrees:metric("lean"),shoulderDeficitDegrees:metric("shoulder"),elbowDeficitDegrees:metric("elbow")};
 });
 const visibilityPercent=Math.round(100*med(idx.map(i=>Math.min(...["shoulder","elbow","wrist","hip","ankle"].map(n=>fr[i][k[n]].v)))));
 // A single ankle cannot describe the body's central line when the legs are apart.
 const legGaps=idx.map(i=>{
  const f=fr[i],left=f[K.L.ankle],right=f[K.R.ankle],shoulder=f[k.shoulder];
  if(left.v<.5||right.v<.5)return null;
  const body=Math.hypot(f[k.ankle].x-shoulder.x,f[k.ankle].y-shoulder.y);
  return body>0?Math.hypot(left.x-right.x,left.y-right.y)/body:null;
 }).filter(x=>x!==null);
 const legsApart=legGaps.length>=Math.max(5,idx.length*.4)&&med(legGaps)>.35;
 return{val,sc,total,swayOk,k,series,fps,hold:(run[1]-run[0]+1)/fps,mid:idx[idx.length>>1],
  diagnostics:{startFrame:run[0],endFrame:run[1],validFrames:idx.length,visibilityPercent,thirds,relaxed,legsApart,rawSway}}}
function reliableResult(res,fps){
 return !!(res&&!res.diagnostics.relaxed&&!res.diagnostics.legsApart&&res.hold>=1.5&&res.diagnostics.validFrames>=10&&
  res.diagnostics.visibilityPercent>=65&&res.diagnostics.validFrames/(res.hold*fps)>=.7);
}
const sideOf=fr=>{const v={L:0,R:0};fr.forEach(f=>{if(f)for(const sd of["L","R"])for(const i of Object.values(K[sd]))v[sd]+=f[i].v});return v.L>=v.R?"L":"R"};
function analyzeEntry(fr,fps){
 const k=K[sideOf(fr)],P=f=>Object.fromEntries(Object.entries(k).map(([n,i])=>[n,[f[i].x,f[i].y]]));
 const up=f=>{if(!f||!["shoulder","elbow","wrist","hip","ankle"].every(n=>f[k[n]].v>=.5))return false;const p=P(f);return p.hip[1]<p.shoulder[1]&&p.wrist[1]>p.shoulder[1]};
 const mask=fr.map(up),run=longestRun(mask,Math.max(1,Math.round(.3*fps)));
 if(!run||run[1]-run[0]+1<3)return null;
 const idx=[];for(let i=run[0];i<=run[1];i++)if(mask[i])idx.push(i);
 const facing=med(idx.map(i=>fr[i][0].x-fr[i][k.ear].x))>=0?1:-1;
 const ms=idx.map(i=>{const p=P(fr[i]),s=p.shoulder,h=p.hip,a=p.ankle,w=p.wrist,e=p.elbow,body=Math.hypot(a[0]-s[0],a[1]-s[1])+1e-9,t=(h[1]-s[1])/(a[1]-s[1]||1e-9),lx=s[0]+t*(a[0]-s[0]);
  return{up:a[1]<h[1],hi:a[1]<s[1],ay:a[1],a:Math.atan2(Math.abs(a[0]-w[0]),Math.abs(a[1]-w[1])+1e-9)*180/Math.PI,side:facing*(a[0]-w[0]),
   ban:facing*(h[0]-lx)/body,sh:Math.max(0,180-ang(h,s,e)),el:Math.max(0,180-ang(s,e,w))}});
 const ups=ms.filter(m=>m.up),best=(ups.length?ups:ms).reduce((x,y)=>y.ay<x.ay?y:x);
 const hiF=ms.filter(m=>m.hi&&m.a<12),arch=hiF.length>=2?med(hiF.map(m=>m.ban)):null;
 const sc={reach:ups.length?band(best.a,[8,40]):0,arch:arch==null?100:band(Math.max(0,arch),[.04,.15]),shoulder:band(med(ms.map(m=>m.sh)),[10,40]),elbow:band(med(ms.map(m=>m.el)),[10,35])};
 return{sc,total:sc.reach*.4+sc.arch*.25+sc.shoulder*.2+sc.elbow*.15,minAng:best.a,over:best.side<0,reached:ups.length>0&&best.a<=10,arch}}
