import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { GOALS, LEVELS, LIBRARY, generatePlan } from "../vercel-app/training-core.js";
import * as core from "../vercel-app/workout-core.js";
import { CATEGORIES, FILTER_LEVELS, searchExercises } from "../vercel-app/exercise-library.js";
import { WORKOUT_MEDIA, createSchematic, renderWorkoutMedia } from "../vercel-app/workout-media.js";

const now = Date.parse("2026-10-27T08:00:00Z");
class Storage {
  values = new Map();
  failKey = null;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key,value) {
    if (key === this.failKey) throw new Error("quota exceeded");
    this.values.set(key,String(value));
  }
}
const fresh = (selection={}) => core.createWorkout(selection,now,"test-session");
const marked = workout => core.changeWorkout(workout,{type:"set",index:0,done:true},now);
const finish = workout => core.changeWorkout(workout,{type:"finish"},now+91000);

test("all 27 plan choices have resumable prescriptions and an exact asset or schematic for every exercise", () => {
  for (const goal of GOALS) for (const level of LEVELS) for (const day of ["A","B","C"]) {
    const workout = fresh({goal:goal.id,level:level.id,day});
    assert.ok(core.validateWorkout(workout));
    assert.deepEqual(workout.exercises.map(ex=>ex.id),generatePlan(goal.id,level.id).find(ex=>ex.id===day).list.map(ex=>ex.id));
    for (const ex of workout.exercises) {
      assert.ok(ex.completed.every(done=>done===false));
      const media = WORKOUT_MEDIA[ex.id];
      assert.ok(media,ex.id);
      if (media.slug) assert.ok(existsSync(new URL("../vercel-app/assets/exercises/"+media.slug+"/frame-1.svg",import.meta.url)));
      else assert.equal(media.pose,ex.id);
    }
  }
  assert.equal(fresh({goal:"unknown",level:"unknown",day:"unknown"}).day,"A");
});

test("set completion is reversible, preserves the original, and navigation never marks skipped work", () => {
  const original = fresh();
  let workout = marked(original);
  assert.equal(original.exercises[0].completed[0],false);
  assert.equal(core.workoutSummary(workout).completedSets,1);
  workout = core.changeWorkout(workout,{type:"exercise",index:4},now);
  assert.equal(core.workoutSummary(workout).completedSets,1);
  assert.equal(core.workoutSummary(workout).completedExercises,0);
  workout = core.changeWorkout(workout,{type:"exercise",index:0},now);
  workout = core.changeWorkout(workout,{type:"set",index:0,done:false},now);
  assert.equal(core.workoutSummary(workout).completedSets,0);
  assert.throws(()=>core.changeWorkout(workout,{type:"exercise",index:5}));
  assert.throws(()=>core.changeWorkout(workout,{type:"set",index:99,done:true}));
  assert.throws(()=>finish(workout));
});

test("refresh restores sets, exercise position, and an absolute rest deadline including background time", () => {
  const storage = new Storage();
  let workout = marked(fresh());
  workout = core.changeWorkout(workout,{type:"exercise",index:1},now);
  workout = core.changeWorkout(workout,{type:"rest"},now);
  core.saveWorkout(storage,workout);
  const restored = core.readWorkout(storage);
  assert.deepEqual(restored,workout);
  assert.equal(core.remainingRest(restored,now+21000),54);
  assert.equal(core.remainingRest(restored,now+75001),0);
  assert.equal(core.remainingRest(core.changeWorkout(restored,{type:"skip-rest"},now),now),0);
  assert.equal(core.remainingRest(core.changeWorkout(restored,{type:"rest"},now+90000),now+90000),75);
});

test("partial finish records only completed sets and preserves all legacy histories and unrelated data", () => {
  const storage = new Storage();
  const legacy = {date:"2026-10-26T08:00:00Z",name:"legacy",exercises:["push"]};
  storage.setItem(core.TRAINING_KEY,JSON.stringify({goal:"general",level:"advanced",day:"C",sessions:[legacy],futureField:{keep:true}}));
  storage.setItem("handstand-lab-workouts-v1","older history");
  storage.setItem("handstand-lab-analyses-v1","analysis");
  const workout = finish(marked(fresh()));
  core.saveWorkout(storage,workout);
  core.saveFinishedWorkout(storage,workout);
  core.saveFinishedWorkout(storage,core.readWorkout(storage));
  const data = core.readTraining(storage);
  assert.equal(data.sessions.length,2);
  assert.deepEqual(data.sessions[0],legacy);
  assert.deepEqual(data.futureField,{keep:true});
  assert.equal(data.goal,"general");
  const record = data.sessions[1];
  assert.deepEqual(record.exercises,["wrist"]);
  assert.equal(record.setResults[0].completedSets,1);
  assert.equal(record.setResults[1].completedSets,0);
  assert.equal(record.minutes,2);
  assert.equal(core.workoutSummary(workout).seconds,91);
  assert.equal(core.workoutSummary(workout).completedExercises,0);
  assert.equal(storage.getItem("handstand-lab-workouts-v1"),"older history");
  assert.equal(storage.getItem("handstand-lab-analyses-v1"),"analysis");
  assert.equal(core.changeWorkout(workout,{type:"set",index:0,done:false}),workout);
});

test("history quota failures retain the finished session and retry saves it exactly once", () => {
  const storage = new Storage();
  const workout = finish(marked(fresh()));
  core.saveWorkout(storage,workout);
  storage.failKey = core.TRAINING_KEY;
  assert.throws(()=>core.saveFinishedWorkout(storage,workout));
  assert.deepEqual(core.readWorkout(storage),workout);
  assert.equal(storage.getItem(core.TRAINING_KEY),null);
  storage.failKey = null;
  core.saveFinishedWorkout(storage,core.readWorkout(storage));
  core.saveFinishedWorkout(storage,core.readWorkout(storage));
  assert.equal(core.readTraining(storage).sessions.length,1);
});

test("invalid saved data and failed active writes never replace a previously saved session", () => {
  const storage = new Storage();
  const workout = fresh();
  core.saveWorkout(storage,workout);
  const original = storage.getItem(core.ACTIVE_KEY);
  storage.failKey = core.ACTIVE_KEY;
  assert.throws(()=>core.saveWorkout(storage,marked(workout)));
  assert.equal(storage.getItem(core.ACTIVE_KEY),original);
  storage.failKey = null;
  for (const mutation of [
    w=>{w.currentExercise=-1;},w=>{w.exercises[0].completed=["yes"];},
    w=>{w.exercises[0].id="constructor";},w=>{w.restEndsAt="tomorrow";},
    w=>{w.startedAt="invalid";},w=>{w.exercises=[];},w=>{w.version=2;}
  ]) {
    const invalid = structuredClone(workout);
    mutation(invalid);
    storage.setItem(core.ACTIVE_KEY,JSON.stringify(invalid));
    const raw = storage.getItem(core.ACTIVE_KEY);
    assert.throws(()=>core.readWorkout(storage));
    assert.equal(storage.getItem(core.ACTIVE_KEY),raw);
  }
  storage.setItem(core.TRAINING_KEY,"not JSON");
  assert.throws(()=>core.saveFinishedWorkout(storage,finish(marked(workout))));
  assert.equal(storage.getItem(core.TRAINING_KEY),"not JSON");
});

// Small DOM/event harness runs the actual screen controller, with real workout/storage logic.
class Element {
  children=[]; listeners={}; attributes={}; dataset={}; hidden=false; disabled=false;
  textContent=""; value=""; checked=false; open=false;
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children=[...children]; }
  setAttribute(key,value) { this.attributes[key]=String(value); }
  toggleAttribute(key,force) { if (force) this.attributes[key]=""; else delete this.attributes[key]; }
  querySelectorAll() { const inputs=[]; const visit=el=>{ if (el.type==="checkbox" && el.checked) inputs.push(el); for (const child of el.children) visit(child); }; visit(this); return inputs; }
  addEventListener(event,fn) { (this.listeners[event]??=[]).push(fn); }
  focus() { this.focused=true; }
  showModal() { this.open=true; }
  close() { this.open=false; }
  async fire(type) {
    if (this.disabled) return;
    for (const fn of this.listeners[type]??[]) await fn({target:this});
    await Promise.resolve(); await Promise.resolve();
  }
}
function screen(storage,search="") {
  const html = readFileSync(new URL("../vercel-app/workout.html",import.meta.url),"utf8");
  const elements = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,new Element()]));
  const docEvents = {}, winEvents = {};
  const document = {
    hidden:false,
    getElementById:id=>elements[id],
    createElement:()=>new Element(),
    addEventListener:(type,fn)=>{docEvents[type]=fn;}
  };
  const location = {search,pathname:"/workout.html"};
  const window = {localStorage:storage,addEventListener:(type,fn)=>{winEvents[type]=fn;}};
  let interval;
  const context = {
    ...core,LIBRARY,document,window,location,navigator:{locks:{request:(_key,fn)=>Promise.resolve().then(fn)}},
    history:{replaceState:(_a,_b,url)=>{location.search=url.slice(url.indexOf("?"));}},
    URLSearchParams,Date,console,
    renderWorkoutMedia:()=>{},
    setInterval:fn=>{interval=fn;}
  };
  const source = readFileSync(new URL("../vercel-app/workout-ui.js",import.meta.url),"utf8").replace(/^import .*;\r?\n/gm,"");
  vm.runInNewContext(source,context,{filename:"workout-ui.js"});
  return {
    elements,location,window,
    pageShow:()=>winEvents.pageshow(),
    visible:()=>docEvents.visibilitychange(),
    tick:()=>interval(),
    storageEvent:key=>winEvents.storage({key}),
    click:id=>elements[id].fire("click"),
    async set(index,done) { const input=elements["set-list"].children[index].children[0]; input.checked=done; await input.fire("change"); }
  };
}

test("screen starts, completes and undoes sets, navigates, reloads, leaves and resumes, then saves a partial summary once", async () => {
  const storage = new Storage();
  let ui=screen(storage,"?start=1&goal=handstand&level=beginner&day=B");
  ui.pageShow();
  assert.equal(ui.elements.ready.hidden,false);
  await ui.click("begin");
  assert.equal(ui.elements["active-workout"].hidden,false);
  assert.equal(core.readWorkout(storage).day,"B");
  await ui.set(0,true);
  await ui.set(0,false);
  assert.equal(core.workoutSummary(core.readWorkout(storage)).completedSets,0);
  await ui.set(0,true);
  await ui.click("start-rest");
  await ui.click("next");
  assert.equal(core.readWorkout(storage).currentExercise,1);
  ui=screen(storage);
  assert.equal(ui.elements["set-list"].children[0].children[0].checked,false);
  assert.equal(core.readWorkout(storage).exercises[0].completed[0],true);
  assert.ok(core.remainingRest(core.readWorkout(storage))>0);
  await ui.click("previous");
  assert.equal(ui.elements["set-list"].children[0].children[0].checked,true);
  assert.match(ui.elements["exercise-details"].href,/exercise=shoulder/);
  ui=screen(storage);
  await ui.click("finish");
  assert.equal(ui.elements["finish-dialog"].open,true);
  await ui.click("continue-workout");
  assert.equal(ui.elements["finish-dialog"].open,false);
  assert.equal(core.readWorkout(storage).finishedAt,null);
  await ui.click("finish");
  await ui.click("confirm-finish");
  assert.equal(ui.elements.summary.hidden,false);
  assert.equal(core.readTraining(storage).sessions.length,1);
  assert.match(ui.elements["history-status"].textContent,/נשמר/);
  ui=screen(storage);
  ui.pageShow();
  assert.equal(ui.elements.summary.hidden,false);
  assert.equal(core.readTraining(storage).sessions.length,1);
  ui=screen(storage,"?start=1&goal=general&level=beginner&day=C");
  ui.pageShow();
  assert.equal(ui.elements.ready.hidden,false);
  await ui.click("begin");
  assert.equal(core.readWorkout(storage).goal,"general");
  assert.equal(core.readWorkout(storage).day,"C");
  assert.equal(core.readTraining(storage).sessions.length,1);
});

test("screen restores the visible set after failed writes and retries history saving after quota recovery", async () => {
  const storage = new Storage();
  const ui=screen(storage);
  await ui.click("begin");
  storage.failKey=core.ACTIVE_KEY;
  await ui.set(0,true);
  assert.equal(ui.elements["set-list"].children[0].children[0].checked,false);
  assert.equal(core.workoutSummary(core.readWorkout(storage)).completedSets,0);
  assert.match(ui.elements["storage-status"].textContent,/לא נשמר/);
  storage.failKey=null;
  await ui.set(0,true);
  storage.failKey=core.TRAINING_KEY;
  await ui.click("finish"); await ui.click("confirm-finish");
  assert.equal(ui.elements.summary.hidden,false);
  assert.equal(ui.elements["retry-save"].hidden,false);
  assert.ok(core.readWorkout(storage).finishedAt);
  storage.failKey=null;
  await ui.click("retry-save");
  assert.equal(ui.elements["retry-save"].hidden,true);
  assert.equal(core.readTraining(storage).sessions.length,1);
});

test("an existing active session wins over another requested plan and stale tabs cannot overwrite newer progress", async () => {
  const storage=new Storage();
  const first=screen(storage,"?goal=handstand&level=advanced&day=C");
  await first.click("begin");
  const second=screen(storage,"?start=1&goal=general&day=A");
  assert.equal(second.elements["active-workout"].hidden,false);
  await first.set(0,true);
  await second.click("next"); // stale snapshot: reload instead of overwriting.
  assert.equal(core.readWorkout(storage).currentExercise,0);
  assert.equal(core.workoutSummary(core.readWorkout(storage)).completedSets,1);
  await second.click("next");
  assert.equal(core.readWorkout(storage).currentExercise,1);
  first.storageEvent(core.ACTIVE_KEY);
  assert.equal(first.elements["exercise-name"].textContent,LIBRARY.dip.name);
});

test("expired rest restores as finished and corrupt storage presents an error without replacing it", async () => {
  const storage=new Storage();
  let workout=core.changeWorkout(fresh(),{type:"rest"},Date.now()-100000);
  core.saveWorkout(storage,workout);
  const ui=screen(storage);
  assert.equal(ui.elements["rest-time"].textContent,"00:00");
  assert.match(ui.elements["rest-announcement"].textContent,/הסתיימה/);
  storage.setItem(core.ACTIVE_KEY,"broken JSON");
  const broken=screen(storage);
  assert.equal(broken.elements.ready.hidden,true);
  assert.match(broken.elements["storage-status"].textContent,/לא ניתן לקרוא/);
  assert.equal(storage.getItem(core.ACTIVE_KEY),"broken JSON");
});

test("a full workout completes every set and finish freezes the saved duration and totals", () => {
  let workout=fresh({goal:"strength",level:"advanced",day:"B"});
  for (let index=0;index<workout.exercises.length;index++) {
    workout=core.changeWorkout(workout,{type:"exercise",index},now);
    for (let set=0;set<workout.exercises[index].sets;set++) workout=core.changeWorkout(workout,{type:"set",index:set,done:true},now);
  }
  workout=finish(workout);
  const summary=core.workoutSummary(workout,now+1000000);
  assert.equal(summary.completedSets,summary.totalSets);
  assert.equal(summary.completedExercises,summary.totalExercises);
  assert.equal(summary.seconds,91);
});

test("workout and training pages reference existing local resources and real fragment targets", () => {
  const root=new URL("../vercel-app/",import.meta.url);
  for (const file of ["index.html","training.html","workout.html"]) {
    const source=readFileSync(new URL(file,root),"utf8");
    for (const [,attr] of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|data:)/.test(attr)) continue;
      const url=new URL(attr,new URL(file,root));
      if (url.pathname.endsWith("/")) url.pathname+="index.html";
      assert.ok(existsSync(url),file+" → "+attr);
      if (url.hash && url.pathname.endsWith(".html")) {
        const target=readFileSync(url,"utf8");
        const route = ["#home","#analyze"].includes(url.hash) && target.includes('id="homeView"') && target.includes('id="analyzerView"') && target.includes('"hashchange"');
        assert.ok(route || target.includes('id="'+url.hash.slice(1)+'"'),file+" fragment "+attr);
      }
    }
  }
});

function trainingScreen(storage,search="") {
  const html=readFileSync(new URL("../vercel-app/training.html",import.meta.url),"utf8");
  const elements=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,new Element()]));
  const winEvents={};
  const document={
    readyState:"complete",
    getElementById:id=>elements[id],
    createElement:()=>new Element()
  };
  const source=readFileSync(new URL("../vercel-app/training-ui.js",import.meta.url),"utf8").replace(/^import .*;\r?\n/gm,"");
  const context={
    ...core,GOALS,LEVELS,LIBRARY,generatePlan,CATEGORIES,FILTER_LEVELS,searchExercises,
    illustrationSlugs:{},document,localStorage:storage,location:{search,hash:""},
    navigator:{locks:{request:(_key,fn)=>Promise.resolve().then(fn)}},
    window:{addEventListener:(type,fn)=>{winEvents[type]=fn;}},
    Intl,URLSearchParams,crypto:globalThis.crypto
  };
  vm.runInNewContext(source,context,{filename:"training-ui.js"});
  return {elements,refresh:()=>winEvents.pageshow()};
}

test("training screen resumes active work, displays completed history, and preserves it when changing plans or logging legacy work", async () => {
  const storage=new Storage();
  const ui=trainingScreen(storage);
  const workout=marked(fresh());
  core.saveWorkout(storage,workout);
  ui.refresh();
  assert.equal(ui.elements["start-workout"].href,"./workout.html");
  assert.match(ui.elements["start-workout"].textContent,/המשך/);
  const finished=finish(workout);
  core.saveWorkout(storage,finished);
  core.saveFinishedWorkout(storage,finished);
  ui.refresh();
  assert.match(ui.elements["start-workout"].href,/start=1/);
  assert.equal(ui.elements.history.children.length,1);
  assert.match(ui.elements.history.children[0].children[2].textContent,/1 סטים/);
  ui.elements.goal.value="general";
  await ui.elements.goal.fire("change");
  assert.equal(core.readTraining(storage).sessions.length,1);
  assert.equal(core.readTraining(storage).goal,"general");
  const checkbox=ui.elements.exercises.children[0].children[0];
  checkbox.checked=true;
  await ui.elements.save.fire("click");
  assert.equal(core.readTraining(storage).sessions.length,2);
  assert.equal(core.readTraining(storage).sessions[0].id,finished.id);
});

test("exercise details open from an active workout and provide a return to the saved workout", () => {
  const ui=trainingScreen(new Storage(),"?exercise=wall");
  assert.equal(ui.elements["exercise-dialog"].open,true);
  assert.equal(ui.elements["exercise-detail-title"].textContent,LIBRARY.wall.name);
  assert.equal(ui.elements["detail-return-workout"].hidden,false);
});

test("every schematic renders accessible SVG, and matched images retain attribution without reloading for each set", () => {
  const previous=globalThis.document;
  globalThis.document={createElement:()=>new Element(),createElementNS:()=>new Element()};
  try {
    for (const [id,media] of Object.entries(WORKOUT_MEDIA)) {
      if (!media.pose) continue;
      const svg=createSchematic(id);
      assert.equal(svg.attributes.role,"img");
      assert.ok(svg.attributes["aria-label"].includes(LIBRARY[id].name));
      assert.ok(svg.children.length>=3);
    }
    const holder=new Element();
    renderWorkoutMedia(holder,"push");
    const figure=holder.children[0];
    assert.match(figure.children[0].src,/push-up\/frame-1.svg$/);
    assert.match(figure.children[1].children[0].href,/ATTRIBUTION.md$/);
    renderWorkoutMedia(holder,"push");
    assert.equal(holder.children[0],figure);
    renderWorkoutMedia(holder,"wall");
    assert.equal(holder.children[0].children[0].attributes.role,"img");
  } finally { globalThis.document=previous; }
});
