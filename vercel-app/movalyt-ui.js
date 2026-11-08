import {finishUploadReview} from './upload-review.js';
import './history-report.js';
import {createAnalysisLibrary} from "./analysis-library-ui.js";
import { drawPoseOverlay, smoothLivePose } from "./pose-overlay.js";
import { resetHandstandInsights } from "./handstand-insights-ui.js";
let lastLivePose = null,
  lastLiveTime = null;
import { readAnalysisHistory } from "./analysis-history.js";
import {
  ANALYSIS_CATALOG,
  HANDSTAND_METRICS,
  exerciseById,
} from "./analysis-catalog.js";
import { analysisFor } from "./analysis-registry.js";
import {selectedExerciseId,selectExercise} from './analysis-selection.js';
import {presentationArtwork} from './presentation-artwork.js';
import { GOALS } from "./onboarding-data.js";
import { createOnboarding, renderOnboardingPose } from "./onboarding-ui.js";
import {
  exerciseArtwork,
  exerciseCaption,
  statusBadge,
} from "./ui-elements.js";
const $ = (id) => document.getElementById(id);
let busy = false,
  available = false,
  scored = false,
  pendingRoute = null;
let library = null;
const stages = ["decode", "model", "scan", "scoring", "render"];
const onboarding = createOnboarding({
  onShow() {
    if ($("aboutDialog").open) $("aboutDialog").close();
    route();
  },
  onComplete({ error }) {
    if (error) {
      $("storageNotice").textContent = error;
      $("storageNotice").hidden = false;
    }
    location.hash = "home";
    route();
    renderPreferences();
  },
});
function activate(screen) {
  const changed=document.body.dataset.screen!==screen;
  document.body.dataset.screen = screen;
  for (const [id, key] of [
    ["homeView", "home"],
    ["historyView", "history"],
    ["catalogView", "catalog"],
    ["variationsView", "variations"],
    ["guideView", "guide"],
    ["onboardingView", "onboarding"],
  ])
    $(id).hidden = screen !== key;
  $("analyzerView").hidden = [
    "home",
    "history",
    "catalog",
    "variations",
    "guide",
    "onboarding",
  ].includes(screen);
  $("holdSec").hidden = screen !== "results";
  const active =
    screen === "home"
      ? "navHome"
      : screen === "history"
        ? "navHistory"
        : "navAnalyze";
  for (const id of ["navHome", "navHistory", "navAnalyze"]) {
    if (id === active) $(id).setAttribute("aria-current", "page");
    else $(id).removeAttribute("aria-current");
  }
  if(changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const view=document.querySelector('main > section:not([hidden])');
    view?.animate([{opacity:.85},{opacity:1}],{duration:140,easing:'ease-out'});
  }
}
function route() {
  if (onboarding.isOpen) {
    activate("onboarding");
    return;
  }
  if (onboarding.needsIntroduction) {
    onboarding.start();
    return;
  }
  let screen = location.hash.slice(1) || "home";
  if (
    ![
      "home",
      "analyze",
      "processing",
      "results",
      "replay",
      "history",
      "catalog",
      "variations",
      "guide",
    ].includes(screen)
  )
    screen = "home";
  if (busy && screen !== "processing") {
    pendingRoute = screen;
    $("cancelAnalysis").click();
    screen = "processing";
  }
  if (screen === "processing" && !busy)
    screen = available ? (scored ? "results" : "replay") : "analyze";
  if (["results", "replay"].includes(screen) && !available) {
    screen = "analyze";
    $("sessionNotice").hidden = false;
  }
  if (screen === "results" && available && !scored) screen = "replay";
  const replayBack = $("replaySec").querySelector(".back");
  replayBack.href = scored ? "#results" : "#analyze";
  replayBack.setAttribute(
    "aria-label",
    scored ? "חזרה לתוצאות" : "חזרה להעלאה",
  );
  $("navAnalyze").href = busy
    ? "#processing"
    : available
      ? scored
        ? "#results"
        : "#replay"
      : "#catalog";
  const analyzerBack = document.querySelector(".analyzer-heading .back");
  analyzerBack.href = screen === "analyze" ? "#guide" : "#analyze";
  analyzerBack.setAttribute(
    "aria-label",
    screen === "analyze"
      ? "חזרה להנחיות צילום"
      : screen === "processing"
        ? "ביטול וחזרה לבחירת סרטון"
        : "חזרה לבחירת סרטון",
  );
  $("reportLink").hidden = !scored;
  activate(screen);
  // Keep reliability warnings visible even when an ungraded result hides coaching.
  if(screen==='results')document.querySelector('.report-focus').after($('measurementNotice'));
  else $('out').insertBefore($('measurementNotice'),$('coachPanel'));
  library?.render(screen);
  $("analyzer-title").textContent =
    screen === "results"
      ? "תוצאות הניתוח"
      : screen === "processing"
        ? "מנתחים את התנועה"
        : "העלאת סרטון";
  if (screen !== "replay") {
    $("v").pause();
    setExpanded(false);
  }
  if ($("aboutDialog").open) $("aboutDialog").close();
  window.scrollTo({ top: 0, behavior: "instant" });
  const heading =
    screen === "home"
      ? $("home-title")
      : screen === "history"
        ? $("history-title")
        : screen === "catalog"
          ? $("catalog-title")
          : screen === "variations" ? $("variations-title")
          : screen === "guide" ? $("guide-title")
          : screen === "replay"
            ? $("playerTitle")
            : $("analyzer-title");
  heading.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
$("watchSkeleton").addEventListener("click", () => {
  $("showSkeleton").checked = true;
  $("showSkeleton").dispatchEvent(new Event("change"));
});
$("openCamera").onclick = () => $("cameraFile").click();
const about = $("aboutDialog");
$("aboutButton").onclick = () => {
  renderPreferences();
  about.showModal();
};
$("closeAbout").onclick = () => about.close();
$("aboutAnalyze").addEventListener("click", () => about.close());
$("settingsCatalog").addEventListener("click", () => about.close());
$("restartOnboarding").onclick = () => {
  about.close();
  onboarding.start();
};
about.addEventListener("click", (event) => {
  if (event.target !== about) return;
  const box = about.getBoundingClientRect();
  if (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
    about.close();
});
function renderPreferences() {
  const host = $("savedPreferences");
  host.replaceChildren();
  const preferences = onboarding.preferences;
  const goal = document.createElement("p");
  goal.textContent = preferences?.goal
    ? "המטרה שלך: " + GOALS.find((item) => item.id === preferences.goal)?.title
    : "אפשר לבחור מטרה ותחומי עניין בתהליך ההיכרות.";
  host.append(goal);
  if (preferences?.interests.length) {
    const list = document.createElement("p");
    list.textContent =
      "תחומי העניין: " +
      preferences.interests.map((id) => exerciseById(id).name).join(" · ");
    host.append(list);
  }
  $("preferencesError").textContent = onboarding.storageError || "";
}
$("catalogCount").textContent =
  ANALYSIS_CATALOG.length + " תרגילים. כיוון אחד: להתקדם.";
const exerciseSelect=$('exerciseSelect');
for(const exercise of ANALYSIS_CATALOG.filter(x=>analysisFor(x.id,{allowExperimental:true}))){
  const option=document.createElement('option');option.value=exercise.id;
  option.textContent=exercise.name;exerciseSelect.append(option);
}
function updateSelection(id){
  if(busy||!selectExercise(id))return;
  exerciseSelect.value=id;library?.sync(id);available=false;scored=false;
  $('out').style.display='none';$('frontLeverReport').hidden=true;$('frontLeverReport').replaceChildren();
  resetHandstandInsights();
  const exercise=exerciseById(id),experimental=!!exercise.experimental;
  $('exerciseFilming').textContent='צלם מהצד, עם מצלמה קבועה בגובה הגוף וכל הגוף בפריים.';
  $('uploadArtwork').replaceChildren(presentationArtwork(id));
  $('processingIllustration').replaceChildren(presentationArtwork(id));
  $('processingExercise').textContent=exercise.name;
  $('resultExercise').textContent=exercise.name;
  $('frontLeverConsent').hidden=!experimental;$('frontLeverSideView').checked=false;
  document.body.dataset.exerciseFamily=exercise.familyId;
  document.querySelector('.upload-intro .eyebrow').textContent=exercise.name+' · '+(experimental?'בדיקה ניסיונית ללא ציון':'ניתוח במכשיר');
  $('status').textContent='';route();
}
exerciseSelect.addEventListener('change',()=>updateSelection(exerciseSelect.value));
updateSelection(selectedExerciseId());
library = createAnalysisLibrary({onAnalyze:updateSelection,isBusy:()=>busy});
for (const [id, showGraph] of [
  ["historyGraphTab", true],
  ["historyListTab", false],
])
  $(id).onclick = () => {
    $("historyChart").hidden = !showGraph;
    $("historyGraphTab").setAttribute("aria-pressed", String(showGraph));
    $("historyListTab").setAttribute("aria-pressed", String(!showGraph));
  };
function viewportChanged() {
  const height = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--visual-height", height + "px");
  const editing = document.activeElement?.matches(
    'input:not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,[contenteditable="true"]',
  );
  document.body.dataset.keyboard =
    editing && window.innerHeight - height > 150 ? "open" : "closed";
}
window.visualViewport?.addEventListener("resize", viewportChanged);
window.addEventListener("resize", viewportChanged);
document.addEventListener("focusin", viewportChanged);
document.addEventListener("focusout", viewportChanged);
viewportChanged();
// Reserve the navigation's actual height, including larger text and safe areas.
// ResizeObserver runs only when the bar changes size, never on document scroll.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{
  const box=entries[0].borderBoxSize;
  const height=box?.[0]?.blockSize||entries[0].target.getBoundingClientRect().height;
  if(height>0)document.documentElement.style.setProperty('--nav',`${height}px`);
}).observe(document.querySelector('.app-nav'));
function playState() {
  const playing = !$("v").paused;
  $("play").dataset.playing = String(playing);
  $("play").setAttribute("aria-label", playing ? "עצור" : "נגן");
}
$("v").addEventListener("play", playState);
$("v").addEventListener("pause", playState);
playState();
let playerScroll=0;
function setExpanded(expanded) {
  const wasExpanded=document.body.dataset.expanded==='true';
  if(wasExpanded===expanded)return;
  if(expanded)playerScroll=window.scrollY;
  document.body.dataset.expanded = String(expanded);
  $("expandPlayer").setAttribute("aria-expanded", String(expanded));
  $("expandPlayer").setAttribute(
    "aria-label",
    expanded ? "סגירת התצוגה המוגדלת" : "הגדלת הסרטון",
  );
  // Keep the background and the media canvas in place; never move/recreate video.
  for(const child of document.querySelectorAll('#out > :not(#replaySec)'))child.inert=expanded;
  $('replaySec').setAttribute('aria-label',expanded?'נגן מוגדל':'נגן וידאו');
  if(!expanded){window.scrollTo({top:playerScroll,behavior:'instant'});$('expandPlayer').focus({preventScroll:true});}
}
$("expandPlayer").onclick = () =>
  setExpanded(document.body.dataset.expanded !== "true");
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setExpanded(false);
  if(event.key==='Tab'&&document.body.dataset.expanded==='true'){
    const controls=[...$('replaySec').querySelectorAll('a[href],button,input,summary')].filter(n=>n.getClientRects().length&&!n.disabled);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
renderOnboardingPose();
export function drawPose(ctx, landmarks, width, height) {
  drawPoseOverlay(ctx, landmarks, { width, height });
}
export const analysisUI = {
  playback(current, duration) {
    const format = (seconds) => {
      const value = Math.max(0, Math.floor(seconds || 0));
      return Math.floor(value / 60) + ":" + String(value % 60).padStart(2, "0");
    };
    $("playerTime").textContent = format(current) + " / " + format(duration);
    const scrub = $("scrub"),
      range = Number(scrub.max) - Number(scrub.min);
    scrub.style.setProperty(
      "--seek-percent",
      (range > 0
        ? Math.max(
            0,
            Math.min(
              100,
              ((Number(scrub.value) - Number(scrub.min)) / range) * 100,
            ),
          )
        : 0) + "%",
    );
  },
  joints(first, second, amount) {
    const host = $("jointMetrics");
    host.hidden = !$("showAngles").checked;
    host.replaceChildren();
    if (host.hidden) return;
    const a = first,
      b = second;
    const point = (i) =>
      a?.[i]?.v >= 0.5 && b?.[i]?.v >= 0.5
        ? {
            x: a[i].x + (b[i].x - a[i].x) * amount,
            y: a[i].y + (b[i].y - a[i].y) * amount,
          }
        : null;
    for (const [label, ids] of [
      ["מרפק ימין", [12, 14, 16]],
      ["מרפק שמאל", [11, 13, 15]],
      ["כתף ימין", [14, 12, 24]],
      ["כתף שמאל", [13, 11, 23]],
    ]) {
      const [u, v, w] = ids.map(point);
      if (!u || !v || !w) continue;
      const ax = u.x - v.x,
        ay = u.y - v.y,
        bx = w.x - v.x,
        by = w.y - v.y,
        length = Math.hypot(ax, ay) * Math.hypot(bx, by);
      if (!length) continue;
      const card = document.createElement("p");
      card.textContent =
        label +
        " · " +
        Math.round(
          (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / length))) *
            180) /
            Math.PI,
        ) +
        "°";
      host.append(card);
    }
    if (!host.children.length)
      host.textContent = "אין נקודות מפרקים מזוהות בביטחון בפריים הזה.";
  },
  start() {
    busy = true;
    resetHandstandInsights();
    lastLivePose = null;
    lastLiveTime = null;
    pendingRoute = null;
    for (const id of [
      "resultMetrics",
      "playerMetrics",
      "resultHighlights",
      "jointMetrics",
    ])
      $(id).replaceChildren();
    $("score").textContent = "";
    $("ringScore").textContent = "";
    $("resultQuality").textContent = "";
    $("scoreArc").style.strokeDashoffset = 100;

    available = false;
    scored = false;
    $("sessionNotice").hidden = true;
    $("analysisStage").hidden = false;
    $("analysisStage").dataset.frame = 'pending';
    $("trackingStatus").textContent = 'ממתינים לפריים מהסרטון שלך.';
    this.progress(0);
    this.stage("decode");
    location.hash = "processing";
    route();
  },
  stage(stage) {
    const current = stages.indexOf(stage);
    for (const li of document.querySelectorAll("[data-stage]")) {
      const i = stages.indexOf(li.dataset.stage);
      li.dataset.state =
        i < current ? "done" : i === current ? "active" : "pending";
      if (i === current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    }
  },
  progress(value) {
    $("analysisPercent").textContent = Math.round(value * 100) + "%";
  },
  preview(video, width, height) {
    const canvas = $("analysisCanvas");
    canvas.width = (480 * width) / Math.max(width, height);
    canvas.height = (480 * height) / Math.max(width, height);
    try {
      canvas
        .getContext("2d")
        .drawImage(video, 0, 0, canvas.width, canvas.height);
      $("analysisStage").dataset.frame = 'actual';
      $("trackingStatus").textContent = 'הפריים נטען. מחפשים נקודות גוף אמינות…';
    } catch {}
  },
  frame(source, landmarks, width, height, timestamp) {
    $("analysisStage").dataset.frame = 'actual';
    $("trackingStatus").textContent = landmarks?.some(point => point?.v >= .5)
      ? 'מעקב גוף פעיל בפריים הנוכחי. אמינות המדידה תיבדק בסיום.'
      : 'מחפשים נקודות גוף אמינות בפריים הנוכחי…';
    const canvas = $("analysisCanvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0);
    ctx.save();
    ctx.scale(source.width / width, source.height / height);
    const displayed = smoothLivePose(
      lastLivePose,
      landmarks,
      timestamp - lastLiveTime,
    );
    drawPose(ctx, displayed, width, height);
    lastLivePose = landmarks;
    lastLiveTime = timestamp;
    ctx.restore();
  },
  result(score, res) {
    $("ringScore").textContent = score;
    $("scoreArc").style.strokeDashoffset = 100 - score;
    $("scoreArc").style.setProperty("--score-offset", 100 - score);
    document
      .querySelector(".score-ring")
      ?.setAttribute("aria-label", `ציון טכניקה ${score} מתוך 100`);
    $("resultQuality").textContent =
      score >= 85
        ? "עבודה מעולה!"
        : score >= 65
          ? "יש בסיס טוב להתקדם."
          : "כל ניסיון הוא צעד קדימה.";
    const target = $("resultMetrics");
    target.replaceChildren();
    if (res)
      for (const { key, label } of HANDSTAND_METRICS.filter(
        (metric) => metric.key !== "sway",
      )) {
        if (!Number.isFinite(res.sc[key])) continue;
        const card = document.createElement("article");
        const title = document.createElement("span");
        title.textContent = label;
        const value = document.createElement("strong");
        value.textContent = Math.round(res.sc[key]);
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", "0 0 32 32");
        svg.setAttribute("aria-hidden", "true");
        svg.classList.add("metric-icon");
        const circle = document.createElementNS(svg.namespaceURI, "circle");
        for (const [name, value] of Object.entries({
          cx: 16,
          cy: 16,
          r: 13,
          fill: "none",
          stroke: "currentColor",
          "stroke-width": 1.4,
        }))
          circle.setAttribute(name, value);
        const path = document.createElementNS(svg.namespaceURI, "path");
        path.setAttribute(
          "d",
          {
            banana: "M16 7v18m-6-13 6 4 6-4m-11 8 5-4 5 4",
            shoulder: "M8 23v-8l5-5h6l5 5v8M12 7v11h8V7",
            elbow: "m9 23 3-9 5 2 5-9M9 23h13",
            lean: "M7 23h18M16 7v16M10 12l6-5 6 5",
          }[key],
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.8");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        svg.append(circle, path);
        card.append(svg, title, value);
        target.append(card);
      }
  },
  finish(outcome) {
    document.body.dataset.analysisOutcome = outcome;
    if(exerciseById(selectedExerciseId()).experimental)
      $('replayTrimNotice').textContent='הסרטון המלא · פרונט לבר ניסיוני, ללא אימות הווריאציה וללא ציון.';
    busy = false;
    available = ["scored", "unreliable"].includes(outcome);
    scored = outcome === "scored";
    $("analysisStage").hidden = true;
    finishUploadReview(outcome);
    location.hash =
      pendingRoute || (available ? (scored ? "results" : "replay") : "analyze");
    pendingRoute = null;
    route();
  },
};
route();
function historyChart() {
  const host = $("historyChart");
  host.replaceChildren();
  let entries;
  try {
    entries = readAnalysisHistory(localStorage).slice().reverse();
  } catch {
    host.textContent = "הגרף אינו זמין. הנתונים השמורים לא שונו.";
    delete document.body.dataset.historyCount;
    return;
  }
  document.body.dataset.historyCount=String(entries.length);
  if (!entries.length) {
    const icon=document.createElement('span');
    icon.className='icon history-empty-icon';icon.setAttribute('aria-hidden','true');
    const title=document.createElement('h2');title.textContent='הניסיון הראשון מתחיל כאן';
    const hint=document.createElement('p');hint.textContent='נתח סרטון כדי להתחיל לבנות את ההיסטוריה שלך.';
    host.append(icon,title,hint);
    return;
  }
  if(entries.length===1){
    const title=document.createElement('h2');title.textContent='המדידה הראשונה שלך';
    const hint=document.createElement('p');hint.textContent='אחרי ניסיון נוסף מאותו סוג ניתוח אפשר יהיה לראות את השינוי לאורך זמן.';
    host.append(title,hint);return;
  }
  // Never connect incompatible scoring models into one trend.
  const latest = entries.at(-1).model;
  entries = entries.filter((x) => x.model === latest).slice(-12);
  const ns = "http://www.w3.org/2000/svg",
    svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 560 240");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "התקדמות מדידות באותו סוג ניתוח: " +
      entries.map((e) => Math.round(e.score)).join(", "),
  );
  const make = (tag, attrs, text) => {
    const el = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text) el.textContent = text;
    svg.append(el);
    return el;
  };
  for (const score of [0, 25, 50, 75, 100]) {
    const y = 200 - score * 1.7;
    make("line", {
      x1: 35,
      x2: 540,
      y1: y,
      y2: y,
      stroke: "#2c3a31",
      "stroke-dasharray": "2 5",
    });
    make(
      "text",
      { x: 5, y: y + 4, fill: "#a9b5aa", "font-size": 14 },
      String(score),
    );
  }
  const points = entries.map((e, i) => [
    entries.length === 1 ? 280 : 45 + (i * 480) / (entries.length - 1),
    200 - e.score * 1.7,
  ]);
  if (points.length > 1) {
    const defs = document.createElementNS(ns, "defs"),
      gradient = document.createElementNS(ns, "linearGradient");
    gradient.id = "historyFill";
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y2", "1");
    for (const [offset, opacity] of [
      ["0%", ".22"],
      ["100%", "0"],
    ]) {
      const stop = document.createElementNS(ns, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", "#c4ff64");
      stop.setAttribute("stop-opacity", opacity);
      gradient.append(stop);
    }
    defs.append(gradient);
    svg.prepend(defs);
    make("polygon", {
      points: [[points[0][0], 200], ...points, [points.at(-1)[0], 200]]
        .map((p) => p.join(","))
        .join(" "),
      fill: "url(#historyFill)",
    });
    make("polyline", {
      points: points.map((p) => p.join(",")).join(" "),
      fill: "none",
      stroke: "#c4ff64",
      "stroke-width": 2.5,
    });
  }
  points.forEach(([x, y], i) => {
    make("circle", { cx: x, cy: y, r: 4, fill: "#c4ff64" });
    const date = new Intl.DateTimeFormat("he-IL", {
      day: "2-digit",
      month: "2-digit",
    }).format(new Date(entries[i].date));
    if (entries.length <= 6 || i % 2 === 0)
      make(
        "text",
        {
          x,
          y: 225,
          fill: "#a9b5aa",
          "font-size": 14,
          "text-anchor": "middle",
        },
        date,
      );
    const title = document.createElementNS(ns, "title");
    title.textContent = date + ": " + Math.round(entries[i].score);
    svg.lastChild.append(title);
  });
  const [lastX, lastY] = points.at(-1),
    badgeX = Math.min(lastX + 6, 510),
    badgeY = Math.max(4, lastY - 26);
  make("rect", {
    x: badgeX,
    y: badgeY,
    width: 36,
    height: 25,
    rx: 6,
    fill: "#c4ff64",
  });
  make(
    "text",
    {
      x: badgeX + 18,
      y: badgeY + 18,
      fill: "#101713",
      "text-anchor": "middle",
      "font-size": 16,
      "font-weight": 800,
    },
    String(Math.round(entries.at(-1).score)),
  );
  host.append(svg);
  const note = document.createElement("p");
  note.className = "note";
  note.textContent =
    "מדידות מקומיות מאותו סוג ניתוח. תנאי צילום עשויים להשפיע על ההשוואה.";
  host.append(note);
}
historyChart();
for (const event of ["storage", "hashchange", "pageshow", "analysis-saved"])
  window.addEventListener(event, historyChart);
