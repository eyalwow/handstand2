import { GOALS, LEVELS, LIBRARY, generatePlan } from "./training-core.js";
import { CATEGORIES, FILTER_LEVELS, searchExercises } from "./exercise-library.js";
import { illustrationSlugs } from "./exercise-media.js";

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
// Only exact, independently checked matches are illustrated; other exercises stay text-only.

function movementDetails(name) {
  const slug = illustrationSlugs[name];
  if (!slug) return null;
  const details = document.createElement("details");
  details.className = "movement-details";
  const staticHold = ["dead-hang","active-hang","side-plank"].includes(slug);
  const summaryText = staticHold ? "צפייה באיור התרגיל" : "צפייה בתנוחות לדוגמה";
  const summary = element("summary", summaryText);
  summary.setAttribute("aria-label", summaryText + ": " + name);
  details.append(summary);
  details.addEventListener("toggle", () => {
    if (!details.open || details.dataset.loaded) return;
    details.dataset.loaded = "true";
    details.append(element("p", "איורים להמחשה; חלקם מציגים גם אפשרויות נוספות לתרגיל.", "movement-note"));
    const gallery = element("div", undefined, "movement-frames");
    for (let index=1; index<=(staticHold ? 1 : 3); index++) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = "./assets/exercises/" + slug + "/frame-" + index + ".svg";
      image.alt = "איור " + index + " לתרגיל " + name;
      image.loading = "lazy";
      image.width = 220;
      image.height = 220;
      const caption = slug === "plank" && index === 3 ? "אפשרות בתמיכת ברכיים" :
        slug === "hollow-body-hold" && index > 1 ? "אפשרות עם ברכיים כפופות" : "איור " + index;
      figure.append(image, element("figcaption", caption));
      gallery.append(figure);
    }
    details.append(gallery);
  });
  return details;
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
  byId("start-workout").href = "./workout.html?" + new URLSearchParams({goal:data.goal,level:data.level,day:day.id}).toString();
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
    const body = element("div", undefined, "exercise-body");
    body.append(label);
    // Training IDs and catalogue names occasionally differ; the mapping is explicit.
    const planNames = {push:"שכיבות סמיכה",pull:"מתח באחיזה עילית",squat:"סקוואט משקל גוף",plank:"פלאנק על אמות"};
    const picture = movementDetails(planNames[prescription.id] || exercise.name);
    if (picture) body.append(picture);
    row.append(input, body);
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


// Exercise browsing is independent from workout history.
const catalogFilters = {
  query: byId("library-search"),
  category: byId("library-category"),
  level: byId("library-level")
};
for (const category of CATEGORIES) {
  const option = element("option", category);
  option.value = category;
  catalogFilters.category.append(option);
}
for (const level of FILTER_LEVELS) {
  const option = element("option", level);
  option.value = level;
  catalogFilters.level.append(option);
}
let catalogLimit = 12;
function renderCatalog() {
  const results = searchExercises({
    query: catalogFilters.query.value,
    category: catalogFilters.category.value,
    level: catalogFilters.level.value
  });
  byId("library-count").textContent = results.length ? results.length + " תרגילים מתאימים" : "לא נמצאו תרגילים. נסו חיפוש או סינון אחר.";
  const list = byId("library-list");
  list.replaceChildren();
  for (const exercise of results.slice(0,catalogLimit)) {
    const card = element("article", undefined, "library-card");
    card.append(
      element("h3", exercise.name),
      element("p", [exercise.category,exercise.level,exercise.equipment].join(" · "), "library-meta"),
      element("p", exercise.tip, "library-tip")
    );
    const detailButton = element("button", "פרטי התרגיל", "library-detail-button");
    detailButton.type = "button";
    detailButton.setAttribute("aria-label", "פרטי התרגיל: " + exercise.name);
    detailButton.addEventListener("click", () => showExerciseDetails(exercise));
    card.append(detailButton);
    list.append(card);
  }
  byId("library-more").hidden = results.length <= catalogLimit;
}
for (const input of Object.values(catalogFilters)) {
  input.addEventListener(input === catalogFilters.query ? "input" : "change", () => {
    catalogLimit = 12;
    renderCatalog();
  });
}
byId("library-more").addEventListener("click", () => {
  catalogLimit += 12;
  renderCatalog();
});
renderCatalog();

function syncNavigation() {
  const library = location.hash === "#library";
  byId("nav-library").toggleAttribute("aria-current",library);
  byId("nav-training").toggleAttribute("aria-current",!library);
  byId(library ? "nav-library" : "nav-training").setAttribute("aria-current","page");
}
window.addEventListener("hashchange",syncNavigation);
syncNavigation();
function landOnLibrary() {
  if (location.hash === "#library") requestAnimationFrame(() => byId("library").scrollIntoView({block:"start"}));
}
// Initial fragment navigation can happen before the dynamic plan has changed layout.
// Re-align after the page resources have finished loading as well.
if (document.readyState === "complete") landOnLibrary();
else window.addEventListener("load", landOnLibrary, {once:true});

const detailsDialog = byId("exercise-dialog");
function showExerciseDetails(exercise, fromWorkout=false) {
  byId("exercise-detail-title").textContent = exercise.name;
  const content = byId("exercise-detail-content");
  content.replaceChildren();
  const meta = element("div", undefined, "detail-meta");
  for (const text of [exercise.category,exercise.level,exercise.equipment].filter(Boolean)) meta.append(element("span",text));
  content.append(meta, element("h3","איך לבצע"), element("p",exercise.tip,"detail-explanation"));
  const pictures = movementDetails(exercise.name);
  if (pictures) content.append(pictures);
  content.append(element("p","פירוט שרירים, שלבי ביצוע, המלצות סטים ווריאציות טרם אומתו עבור תרגיל זה.","detail-unavailable"));
  byId("detail-return-workout").hidden = !fromWorkout;
  if (!detailsDialog.open) detailsDialog.showModal();
}
byId("exercise-detail-close").addEventListener("click", () => detailsDialog.close());
const exerciseFromWorkout = new URLSearchParams(location.search).get("exercise");
if (exerciseFromWorkout && Object.hasOwn(LIBRARY,exerciseFromWorkout)) {
  const source = LIBRARY[exerciseFromWorkout];
  const aliases = {
    wallKick:"עליות נשלטות לעמידת ידיים",
    dip:"דיפס במקבילים",
    calf:"עליות תאומים בעמידה",
    hangingKnee:"כפיפות ברכיים בתלייה"
  };
  const name = aliases[exerciseFromWorkout] || source.name;
  const catalogueMatch = searchExercises({query:name}).find(item => item.name === name);
  showExerciseDetails(catalogueMatch || {name:source.name,equipment:source.equipment,tip:source.tip},true);
}
