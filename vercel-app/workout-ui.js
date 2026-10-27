import { LIBRARY } from "./training-core.js";
import { ACTIVE_KEY, TRAINING_KEY, createWorkout, changeWorkout, readWorkout, saveWorkout, saveFinishedWorkout, workoutSummary, remainingRest } from "./workout-core.js";

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const requested = {goal:params.get("goal") || undefined,level:params.get("level") || undefined,day:params.get("day") || undefined};
let workout = null;
let savedSnapshot = null;
let storage = null;
let historySaved = false;
let announcedEnd = null;
const formatTime = seconds => Math.floor(seconds/60).toString().padStart(2,"0") + ":" + (seconds%60).toString().padStart(2,"0");
const node = (tag,text,className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
};
function status(message, retry=false) {
  $("storage-status").textContent = message;
  $("retry-save").hidden = !retry;
}
function syncHistory() {
  try {
    saveFinishedWorkout(storage,workout);
    historySaved = true;
    status("");
  } catch {
    historySaved = false;
    status("האימון נשמר במכשיר, אבל לא הצלחנו להוסיף אותו להיסטוריה. נסו שוב לפני תחילת אימון חדש.",true);
  }
}
function withLock(fn) {
  return navigator.locks ? navigator.locks.request("handstand-lab-training-storage",fn) : Promise.resolve().then(fn);
}
async function act(action) {
  await withLock(() => {
    try {
      if (storage.getItem(ACTIVE_KEY) !== savedSnapshot) {
        load();
        status("האימון עודכן בחלון אחר. נטענה ההתקדמות האחרונה.");
        return;
      }
      const next = changeWorkout(workout,action);
      saveWorkout(storage,next);
      workout = next;
      savedSnapshot = JSON.stringify(next);
      status("");
      if (workout.finishedAt) syncHistory();
    } catch {
      status("השינוי לא נשמר. בדקו שהאחסון בדפדפן זמין ונסו שוב. ההתקדמות השמורה נשארה ללא שינוי.");
    }
    render();
    if (action.type === "set") $("set-list").children[action.index].children[0].focus();
    if (action.type === "exercise") $("exercise-name").focus();
    if (action.type === "finish" && workout.finishedAt) $("summary-title").focus();
  });
}
function load() {
  try {
    storage = window.localStorage;
    workout = readWorkout(storage);
    savedSnapshot = storage.getItem(ACTIVE_KEY);
    historySaved = false;
    if (workout?.finishedAt) syncHistory();
    if (params.get("start") === "1" && workout?.finishedAt && historySaved) workout = null;
    render();
  } catch {
    $("ready").hidden = true;
    $("active-workout").hidden = true;
    $("summary").hidden = true;
    status("לא ניתן לקרוא את האימון השמור. לא שינינו את המידע. בדקו את הגדרות האחסון ונסו לטעון מחדש.");
  }
}
function render() {
  $("ready").hidden = Boolean(workout);
  $("active-workout").hidden = !workout || Boolean(workout.finishedAt);
  $("summary").hidden = !workout?.finishedAt;
  if (!workout) {
    const preview = createWorkout(requested);
    $("ready-title").textContent = preview.name;
    $("ready-description").textContent = preview.exercises.length + " תרגילים · מסמנים כל סט אחרי הביצוע, בקצב שלכם.";
    return;
  }
  if (workout.finishedAt) { renderSummary(); return; }
  const summary = workoutSummary(workout);
  const exercise = workout.exercises[workout.currentExercise];
  const info = LIBRARY[exercise.id];
  $("session-name").textContent = workout.name;
  $("progress-label").textContent = summary.completedSets + " מתוך " + summary.totalSets + " סטים הושלמו";
  $("workout-progress").max = summary.totalSets;
  $("workout-progress").value = summary.completedSets;
  const tabs = $("exercise-tabs");
  tabs.replaceChildren();
  workout.exercises.forEach((ex,index) => {
    const done = ex.completed.every(Boolean);
    const button = node("button",String(index+1) + (done ? " ✓" : ""));
    button.type = "button";
    button.setAttribute("aria-label",LIBRARY[ex.id].name + (done ? " — הושלם" : ""));
    button.setAttribute("aria-pressed",String(index === workout.currentExercise));
    button.addEventListener("click",() => act({type:"exercise",index}));
    tabs.append(button);
  });
  $("exercise-position").textContent = "תרגיל " + (workout.currentExercise+1) + " מתוך " + workout.exercises.length;
  $("exercise-name").textContent = info.name;
  $("prescription").textContent = exercise.sets + " סטים × " + exercise.target + " · " + info.equipment;
  $("exercise-tip").textContent = info.tip;
  $("exercise-details").href = "./training.html?" + new URLSearchParams({exercise:exercise.id});
  const sets = $("set-list");
  sets.replaceChildren();
  exercise.completed.forEach((done,index) => {
    const label = node("label",undefined,"set-choice");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = done;
    input.addEventListener("change",() => act({type:"set",index,done:input.checked}));
    label.append(input,node("span","סט " + (index+1)));
    sets.append(label);
  });
  $("rest-note").textContent = "המנוחה המוצעת: " + exercise.rest + " שניות. אפשר לסיים מוקדם או להפעיל מחדש.";
  $("previous").disabled = workout.currentExercise === 0;
  $("next").textContent = workout.currentExercise === workout.exercises.length-1 ? "לסיכום האימון" : "התרגיל הבא";
  $("finish").disabled = !summary.completedSets;
  tick();
}
function tick() {
  if (!workout || workout.finishedAt) return;
  $("elapsed").textContent = formatTime(workoutSummary(workout).seconds);
  const remaining = remainingRest(workout);
  $("rest-time").textContent = formatTime(remaining);
  $("start-rest").textContent = remaining ? "הפעלת מנוחה מחדש" : "הפעלת מנוחה";
  $("skip-rest").hidden = !remaining;
  if (workout.restEndsAt !== null && !remaining) {
    if (announcedEnd !== workout.restEndsAt) {
      $("rest-announcement").textContent = "המנוחה הסתיימה. אפשר להמשיך כשמוכנים.";
      announcedEnd = workout.restEndsAt;
    }
  } else {
    $("rest-announcement").textContent = "";
  }
}
function renderSummary() {
  const summary = workoutSummary(workout);
  $("summary-name").textContent = workout.name;
  const stats = $("summary-stats");
  stats.replaceChildren();
  for (const [value,label] of [[summary.completedSets + "/" + summary.totalSets,"סטים שהושלמו"],[summary.completedExercises + "/" + summary.totalExercises,"תרגילים שהושלמו"],[Math.floor(summary.seconds/60),"דקות מאז ההתחלה"]]) {
    const card = node("div",undefined,"stat");
    card.append(node("strong",String(value)),node("span",label));
    stats.append(card);
  }
  $("summary-duration").textContent = "זמן כולל: " + formatTime(summary.seconds) + " · כולל זמן מחוץ למסך האימון.";
  const list = $("summary-exercises");
  list.replaceChildren();
  for (const ex of summary.setResults) {
    const item = node("article");
    item.append(node("strong",LIBRARY[ex.id].name),node("p",ex.completedSets + " מתוך " + ex.plannedSets + " סטים הושלמו · יעד: " + ex.target));
    list.append(item);
  }
  $("history-status").textContent = historySaved ? "האימון נשמר בהיסטוריה." : "ההוספה להיסטוריה ממתינה לשמירה.";
}
function confirmFinish() {
  const summary = workoutSummary(workout);
  if (!summary.completedSets) {
    status("סמנו לפחות סט אחד שבוצע כדי לשמור סיכום.");
    return;
  }
  $("finish-description").textContent = summary.completedSets === summary.totalSets ?
    "כל הסטים הושלמו. לשמור את האימון בהיסטוריה?" :
    "הושלמו " + summary.completedSets + " מתוך " + summary.totalSets + " סטים. רק הסטים שסומנו יישמרו כסטים שבוצעו.";
  $("finish-dialog").showModal();
}
$("begin").addEventListener("click",() => withLock(() => {
  try {
    const existing = readWorkout(storage);
    if (existing && !existing.finishedAt) { load(); return; }
    if (existing?.finishedAt) saveFinishedWorkout(storage,existing);
    const next = createWorkout(requested);
    saveWorkout(storage,next);
    workout = next;
    params.delete("start");
    history.replaceState(null,"",location.pathname + "?" + params.toString());
    savedSnapshot = JSON.stringify(next);
    status("");
    render();
    $("exercise-name").focus();
  } catch { status("לא הצלחנו להתחיל ולשמור את האימון. בדקו שהאחסון בדפדפן זמין ונסו שוב."); }
}));
$("start-rest").addEventListener("click",() => act({type:"rest"}));
$("skip-rest").addEventListener("click",() => act({type:"skip-rest"}));
$("previous").addEventListener("click",() => act({type:"exercise",index:workout.currentExercise-1}));
$("next").addEventListener("click",() => workout.currentExercise === workout.exercises.length-1 ? confirmFinish() : act({type:"exercise",index:workout.currentExercise+1}));
$("finish").addEventListener("click",confirmFinish);
$("continue-workout").addEventListener("click",() => $("finish-dialog").close());
$("confirm-finish").addEventListener("click",() => {
  $("finish-dialog").close();
  act({type:"finish"});
});
$("retry-save").addEventListener("click",() => withLock(() => { syncHistory(); render(); }));
window.addEventListener("storage",event => {
  if ([ACTIVE_KEY,TRAINING_KEY,null].includes(event.key)) load();
});
window.addEventListener("pageshow",load);
document.addEventListener("visibilitychange",() => { if (!document.hidden) load(); });
load();
setInterval(tick,250);
