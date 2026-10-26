import { GOALS, LEVELS, LIBRARY, generatePlan } from "./training-core.js";

const KEY = "handstand-lab-training-ui-v1";
const SCORE_KEY = "handstand-lab-analyses-v1";
const byId = id => document.getElementById(id);
const dateFormatter = new Intl.DateTimeFormat("he-IL", {day:"numeric", month:"long", year:"numeric"});
let data = {goal:"handstand", level:"beginner", day:"A", sessions:[]};
let storageWritable = true;
const selected = new Set();
const selectedKey = id => [data.goal, data.level, data.day, id].join(":");
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || !Array.isArray(saved.sessions)) throw new Error("invalid training data");
    data.sessions = saved.sessions;
    if (GOALS.some(item => item.id === saved.goal)) data.goal = saved.goal;
    if (LEVELS.some(item => item.id === saved.level)) data.level = saved.level;
    if (["A","B","C"].includes(saved.day)) data.day = saved.day;
  }
} catch {
  storageWritable = false;
  byId("save-status").textContent = "לא ניתן לקרוא או לשמור את המידע בדפדפן. בדקו את הגדרות האחסון.";
}
function persist() {
  if (!storageWritable) return false;
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
  catch { byId("save-status").textContent = "לא הצלחנו לשמור בדפדפן. בדקו שיש מקום ואחסון זמין."; return false; }
}
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function fillSelect(id, options, value) {
  const select = byId(id);
  for (const item of options) {
    const option = element("option", item.label);
    option.value = item.id;
    select.append(option);
  }
  select.value = value;
}
fillSelect("goal", GOALS, data.goal);
fillSelect("level", LEVELS, data.level);
for (const id of ["goal", "level"]) byId(id).addEventListener("change", event => {
  data[id] = event.target.value;
  persist();
  renderPlan();
});
function renderPlan() {
  const plan = generatePlan(data.goal, data.level);
  const day = plan.find(item => item.id === data.day) || plan[0];
  const tabs = byId("day-tabs");
  tabs.replaceChildren();
  for (const item of plan) {
    const button = element("button", "אימון " + item.id);
    button.type = "button";
    button.setAttribute("aria-pressed", String(item.id === day.id));
    button.addEventListener("click", () => {
      data.day = item.id;
      persist();
      renderPlan();
    });
    tabs.append(button);
  }
  byId("workout-title").textContent = day.name;
  byId("workout-focus").textContent = day.focus;
  const list = byId("exercises");
  list.replaceChildren();
  for (const [index, prescription] of day.list.entries()) {
    const exercise = LIBRARY[prescription.id];
    if (!exercise) continue;
    const row = element("div", undefined, "exercise");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = "exercise-" + index;
    input.value = prescription.id;
    const key = selectedKey(prescription.id);
    input.checked = selected.has(key);
    input.addEventListener("change", () => input.checked ? selected.add(key) : selected.delete(key));
    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.append(
      element("strong", exercise.name),
      element("span", prescription.sets + " סטים × " + prescription.target + " · מנוחה " + prescription.rest + " שניות · " + exercise.equipment, "prescription"),
      element("span", exercise.tip, "tip")
    );
    row.append(input, label);
    list.append(row);
  }
}
function validSessions() {
  return data.sessions.filter(item => item && typeof item === "object" && Number.isFinite(Date.parse(item.date)) && typeof item.name === "string" && Array.isArray(item.exercises) && item.exercises.every(id => typeof id === "string" && Object.hasOwn(LIBRARY,id)));
}
function renderProgress() {
  const sessions = validSessions().slice().sort((a,b) => Date.parse(b.date)-Date.parse(a.date));
  const since = Date.now()-7*24*60*60*1000;
  const metrics = [
    [sessions.length, "אימונים שנשמרו"],
    [sessions.filter(s => Date.parse(s.date)>=since && Date.parse(s.date)<=Date.now()).length, "בשבעת הימים האחרונים"],
    [sessions.reduce((sum,s) => sum + s.exercises.length, 0), "תרגילים שבוצעו"]
  ];
  const stats = byId("stats");
  stats.replaceChildren();
  for (const [number, label] of metrics) {
    const card = element("div", undefined, "stat");
    card.append(element("strong", String(number)), element("span", label));
    stats.append(card);
  }
  const history = byId("history");
  history.replaceChildren();
  if (!sessions.length) history.append(element("p", "כשתשמרו אימון הוא יופיע כאן.", "empty"));
  for (const session of sessions.slice(0, 5)) {
    const item = element("article", undefined, "history-item");
    item.append(element("strong", session.name + " · " + dateFormatter.format(new Date(session.date))));
    item.append(element("p", session.exercises.map(id => LIBRARY[id].name).join(" · ")));
    history.append(item);
  }
  renderAnalysisProgress();
}
function renderAnalysisProgress() {
  const area = byId("analysis-progress");
  area.replaceChildren(element("strong", "עמידת הידיים שלי"));
  let entries = [];
  try {
    const raw = JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
    if (Array.isArray(raw)) entries = raw.filter(x => x && typeof x.model === "string" && Number.isFinite(x.score) && x.score >= 0 && x.score <= 100 && Number.isFinite(Date.parse(x.date))).sort((a,b) => Date.parse(a.date)-Date.parse(b.date));
  } catch { /* The rest of the page remains available. */ }
  if (!entries.length) {
    area.append(element("span", "ניתוחים מתאימים יישמרו כאן כשתבדקו עמידת ידיים."));
    return;
  }
  const latest = entries[entries.length-1];
  const comparable = entries.filter(x => x.model === latest.model);
  if (comparable.length < 2) {
    area.append(element("span", "נשמר ניתוח אחד. אחרי ניתוח נוסף אפשר יהיה לראות שינוי."));
    return;
  }
  const previous = comparable[comparable.length-2];
  const change = Math.round(latest.score)-Math.round(previous.score);
  const message = change > 0 ? "עלייה של " + change + " נקודות" : change < 0 ? "ירידה של " + Math.abs(change) + " נקודות" : "ללא שינוי בציון";
  area.append(element("span", message + " לעומת הניתוח הקודם. נסו לצלם באותה זווית ובתנאים דומים; זו הערכה בלבד."));
}
byId("save").addEventListener("click", () => {
  const checked = [...byId("exercises").querySelectorAll("input:checked")].map(input => input.value);
  if (!checked.length) { byId("save-status").textContent = "סמנו לפחות תרגיל אחד שביצעתם."; return; }
  const day = generatePlan(data.goal,data.level).find(item => item.id === data.day);
  const record = {date:new Date().toISOString(), name:day.name, goal:data.goal, level:data.level, exercises:checked};
  data.sessions.push(record);
  if (!persist()) { data.sessions.pop(); return; }
  byId("save-status").textContent = "האימון נשמר. כל הכבוד על ההתמדה!";
  byId("exercises").querySelectorAll("input:checked").forEach(input => { selected.delete(selectedKey(input.value)); input.checked=false; });
  renderProgress();
});
renderPlan();
renderProgress();

