// Pure training engine. No accounts, external calls, or access to video footage.
export const STORAGE_KEY="handstand-lab-workouts-v1";
export const GOALS=[
 {id:"handstand",label:"עמידת ידיים",subtitle:"איזון, כתפיים וקו הגוף"},
 {id:"strength",label:"כוח קליסטניקס",subtitle:"מתח, דחיפות וכוח בסיסי"},
 {id:"general",label:"כושר כללי",subtitle:"גוף מלא, שליטה וכושר"}
];
export const LEVELS=[
 {id:"beginner",label:"מתחיל"},
 {id:"intermediate",label:"בינוני"},
 {id:"advanced",label:"מתקדם"}
];
export const LIBRARY={
 wrist:{name:"חימום כפות ידיים",focus:"mobility",equipment:"רצפה",tip:"תנועות קטנות ללא כאב; להעמיס בהדרגה.",unit:"sec"},
 wall:{name:"עמידת ידיים עם הפנים לקיר",focus:"skill",equipment:"קיר",tip:"השאר מקום לירידה בטוחה; דחוף גבוה ושמור צלעות פנימה.",unit:"sec"},
 wallKick:{name:"עליות נשלטות ליד קיר",focus:"skill",equipment:"קיר",tip:"בעט בעדינות עם רגל מובילה; לא להיכנס לעמידה כשאין דרך לרדת.",unit:"reps"},
 toePull:{name:"ניתוק עקבים מהקיר",focus:"skill",equipment:"קיר",tip:"נתק בעדינות לשנייה, החזר את העקבים בלי נפילה.",unit:"reps"},
 hollow:{name:"החזקת הולו",focus:"core",equipment:"רצפה",tip:"כווץ בטן וישבן, גב תחתון נשאר קרוב לרצפה.",unit:"sec"},
 plank:{name:"פלאנק",focus:"core",equipment:"רצפה",tip:"צלעות פנימה, שים לב לא לשקוע בגב.",unit:"sec"},
 inclinePush:{name:"שכיבות סמיכה בשיפוע",focus:"push",equipment:"משטח יציב",tip:"ידיים על משטח יציב, גוף בקו אחד.",unit:"reps"},
 push:{name:"שכיבות סמיכה",focus:"push",equipment:"רצפה",tip:"מרפקים נעים בצורה נשלטת, גוף בקו אחד.",unit:"reps"},
 diamond:{name:"שכיבות סמיכה צרות",focus:"push",equipment:"רצפה",tip:"רק בטווח נטול כאב בידיים ובשורש כף היד.",unit:"reps"},
 pike:{name:"שכיבות סמיכה פייק",focus:"push",equipment:"רצפה",tip:"הורד את הראש בעדינות בין הידיים, בלי כאב בכתף.",unit:"reps"},
 pullAssisted:{name:"מתח בעזרת גומייה / רגליים",focus:"pull",equipment:"מתקן מתח",tip:"היעזר בתמיכה כדי לשמור על טווח נקי; אל תנדנד את הגוף.",unit:"reps"},
 negativePull:{name:"ירידות איטיות ממתח",focus:"pull",equipment:"מתקן מתח",tip:"רד בשליטה; השתמש במדרגה בטוחה כדי להגיע למעלה.",unit:"reps"},
 pull:{name:"מתח",focus:"pull",equipment:"מתקן מתח",tip:"עלייה נשלטת וסנטר מעל המוט בלי תנופה.",unit:"reps"},
 row:{name:"חתירה בטבעות / מוט נמוך",focus:"pull",equipment:"טבעות או מוט נמוך",tip:"משוך שכמות לאחור ותן לגוף להישאר ישר.",unit:"reps"},
 dipAssisted:{name:"דיפס עם תמיכת רגליים",focus:"push",equipment:"מקבילים",tip:"אל תרד עמוק יותר מטווח הכתפיים הנוח.",unit:"reps"},
 dip:{name:"דיפס",focus:"push",equipment:"מקבילים",tip:"כתפיים בשליטה, בלי עומס כאב או עומק מוגזם.",unit:"reps"},
 squat:{name:"סקוואט משקל גוף",focus:"legs",equipment:"רצפה",tip:"ברכיים נעות בכיוון אצבעות הרגליים; שלוט בירידה.",unit:"reps"},
 lunge:{name:"מכרע לאחור",focus:"legs",equipment:"רצפה",tip:"שמור יציבות וצלול לטווח שנוח לברכיים.",unit:"reps"},
 split:{name:"סקוואט מפוצל",focus:"legs",equipment:"רצפה",tip:"עקוב אחר יישור הברך ובצע לאט.",unit:"reps"},
 calf:{name:"עליות תאומים",focus:"legs",equipment:"מדרגה בטוחה / רצפה",tip:"עלה ורד בקצב מבוקר; אפשר להיתמך.",unit:"reps"},
 bridge:{name:"גשר ישבן",focus:"legs",equipment:"רצפה",tip:"כווץ ישבן בלי להקשת את הגב התחתון.",unit:"reps"},
 superman:{name:"הרמות גב עדינות",focus:"core",equipment:"רצפה",tip:"טווח קצר ונוח, בלי מתח בצוואר.",unit:"reps"},
 hangingKnee:{name:"הרמות ברכיים בתלייה",focus:"core",equipment:"מתקן מתח",tip:"בלי תנופה, עם הורדה איטית.",unit:"reps"},
 shoulder:{name:"תנועתיות כתפיים לקיר",focus:"mobility",equipment:"קיר",tip:"תנועה איטית ללא כאב; אל תכפה טווח.",unit:"sec"},
 sidePlank:{name:"פלאנק צד",focus:"core",equipment:"רצפה",tip:"אגן בגובה אחיד, נשימה רגילה.",unit:"sec"}
};
const ex=(id,sets,reps,rest=75)=>({id,sets,target:reps,rest});
const W={
 beginner:[
  {id:"A",name:"יסודות: דחיפה וקו גוף",focus:"עמידת ידיים וטכניקה",list:[ex("wrist",2,"25 שניות",30),ex("wall",3,"10–20 שניות",75),ex("inclinePush",3,"6–10"),ex("squat",3,"10–15"),ex("hollow",3,"15–25 שניות")]},
  {id:"B",name:"משיכה ויציבות",focus:"גב, רגליים וליבה",list:[ex("shoulder",2,"30 שניות",30),ex("pullAssisted",3,"3–6",90),ex("row",3,"6–10",90),ex("lunge",3,"8 לכל רגל"),ex("plank",3,"20–35 שניות")]},
  {id:"C",name:"טכניקה וחזרה",focus:"תרגול איכותי בשליטה",list:[ex("wrist",2,"25 שניות",30),ex("wallKick",4,"3–5",60),ex("inclinePush",3,"6–10"),ex("bridge",3,"12–15"),ex("sidePlank",2,"20 שניות לצד")]}
 ],
 intermediate:[
  {id:"A",name:"עמידה וכוח דחיפה",focus:"כתפיים ודיוק",list:[ex("wrist",2,"30 שניות",30),ex("wall",4,"20–35 שניות",90),ex("pike",3,"5–8",90),ex("push",3,"8–14"),ex("hollow",3,"25–40 שניות")]},
  {id:"B",name:"משיכה ורגליים",focus:"מתח ושליטה",list:[ex("pull",4,"4–8",120),ex("row",3,"8–12",90),ex("split",3,"8 לכל רגל"),ex("hangingKnee",3,"8–12"),ex("shoulder",2,"30 שניות")]},
  {id:"C",name:"איזון ועומס מתון",focus:"איכות לפני מהירות",list:[ex("toePull",4,"3–5",90),ex("dipAssisted",3,"6–10"),ex("push",3,"10–15"),ex("squat",3,"15–20"),ex("plank",3,"35–50 שניות")]}
 ],
 advanced:[
  {id:"A",name:"עמידה מתקדמת ודחיפות",focus:"נפח בשליטה",list:[ex("wrist",2,"35 שניות",30),ex("wall",4,"30–50 שניות",90),ex("toePull",4,"4–6",90),ex("pike",4,"8–12",120),ex("hollow",3,"40–50 שניות")]},
  {id:"B",name:"כוח משיכה ורגליים",focus:"סטים איכותיים",list:[ex("pull",5,"5–10",150),ex("row",4,"10–15",90),ex("split",4,"10 לכל רגל"),ex("hangingKnee",4,"10–15"),ex("calf",3,"15–20")]},
  {id:"C",name:"חזרות וטכניקה",focus:"פיתוח יציבות",list:[ex("wallKick",4,"4–6",90),ex("dip",4,"6–12",120),ex("push",4,"12–20"),ex("lunge",3,"10 לכל רגל"),ex("sidePlank",3,"35 שניות לצד")]}
 ]
};
export function generatePlan(goal="handstand",level="beginner"){
 if(!GOALS.some(g=>g.id===goal))goal="handstand";
 if(!LEVELS.some(l=>l.id===level))level="beginner";
 return W[level].map((day,index)=>{
  let list=day.list.map(x=>({...x}));
  if(goal==="strength"){
   list=list.filter(x=>x.id!=="wallKick"&&x.id!=="toePull");
   if(index===0){
    const main=level==="beginner"?"inclinePush":"push";
    const warm=list.filter(x=>LIBRARY[x.id].focus==="mobility");
    list=[...warm,ex(main,level==="beginner"?2:3,level==="beginner"?"6–10":"8–12"),...list.filter(x=>x.id!=="wall"&&x.id!==main&&LIBRARY[x.id].focus!=="mobility")];
   }
   if(index===2){
    const main=level==="beginner"?"negativePull":"pull";
    const warm=list.filter(x=>LIBRARY[x.id].focus==="mobility");
    list=[...warm,ex(main,level==="beginner"?2:3,level==="beginner"?"3–5":"5–8",120),...list.filter(x=>x.id!=="wall"&&x.id!==main&&LIBRARY[x.id].focus!=="mobility")];
   }
  }
  if(goal==="general"){
   list=list.filter(x=>!["wallKick","toePull","wall"].includes(x.id));
   if(index===0)list.unshift(ex("bridge",3,"12–15"));
   if(index===2)list.unshift(ex("calf",3,"15–20"));
  }
  return{...day,name:goal==="handstand"?day.name:goal==="strength"?["דחיפה וכוח","משיכה ורגליים","כוח וטכניקה"][index]:["אימון גוף מלא A","אימון גוף מלא B","אימון גוף מלא C"][index],
   focus:goal==="handstand"?day.focus:goal==="strength"?["דחיפה ורגליים","משיכה ויציבות","כוח בשליטה"][index]:["דחיפה ורגליים","משיכה וליבה","רגליים ויציבות"][index],
   list};
 });
}
export function freshState(){return{version:1,goal:"handstand",level:"beginner",sessions:[],activeDay:"A"}}
export function sanitizeState(data){
 const s=freshState();if(!data||typeof data!=="object")return s;
 if(GOALS.some(g=>g.id===data.goal))s.goal=data.goal;
 if(LEVELS.some(g=>g.id===data.level))s.level=data.level;
 if(["A","B","C"].includes(data.activeDay))s.activeDay=data.activeDay;
 if(Array.isArray(data.sessions))s.sessions=data.sessions.filter(x=>
  x&&typeof x==="object"&&typeof x.id==="string"&&x.id.length<80&&
  typeof x.date==="string"&&Number.isFinite(Date.parse(x.date))&&
  ["A","B","C"].includes(x.day)&&Number.isFinite(x.minutes)&&x.minutes>=0&&x.minutes<=600&&
  Array.isArray(x.exercises)&&x.exercises.length<=18
 ).slice(-250).map(x=>({
   id:x.id,date:x.date,day:x.day,minutes:x.minutes,
   exercises:x.exercises.filter(e=>e&&LIBRARY[e.id]&&Array.isArray(e.sets)&&e.sets.length<=12)
    .map(e=>({id:e.id,sets:e.sets.filter(v=>Number.isFinite(v)&&v>=0&&v<=3600)}))
 }));
 return s;
}
export function getStats(s,today=new Date()){
 const sessions=s.sessions.filter(x=>Number.isFinite(Date.parse(x.date))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 const unique=[...new Set(sessions.map(x=>x.date.slice(0,10)))];
 const thisWeekStart=new Date(today);thisWeekStart.setHours(0,0,0,0);thisWeekStart.setDate(thisWeekStart.getDate()-6);
 const count7=sessions.filter(x=>new Date(x.date)>=thisWeekStart).length;
 const totalMinutes=sessions.reduce((n,x)=>n+x.minutes,0);
 const totalSets=sessions.reduce((n,x)=>n+x.exercises.reduce((sum,e)=>sum+e.sets.length,0),0);
 let streak=0,day=new Date(today);day.setHours(0,0,0,0);
 for(let skip=0;skip<30;skip++){
  const k=[day.getFullYear(),String(day.getMonth()+1).padStart(2,"0"),String(day.getDate()).padStart(2,"0")].join("-");
  if(unique.includes(k))streak++;
  else if(skip===0){}else break;
  day.setDate(day.getDate()-1);
 }
 const past7=Array.from({length:7},(_,i)=>{
  const d=new Date(today);d.setHours(0,0,0,0);d.setDate(d.getDate()-6+i);
  const iso=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  return {date:iso,day:new Intl.DateTimeFormat("he-IL",{weekday:"short"}).format(d),minutes:sessions.filter(x=>x.date.startsWith(iso)).reduce((t,x)=>t+x.minutes,0)};
 });
 return{count7,total:sessions.length,totalMinutes,totalSets,streak,past7};
}
export function describePrescription(exercise){
 const d=LIBRARY[exercise.id];
 return d?{...d,...exercise}:null;
}
