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
  document.body.dataset.screen = screen;
  for (const [id, key] of [
    ["homeView", "home"],
    ["historyView", "history"],
    ["catalogView", "catalog"],
    ["onboardingView", "onboarding"],
  ])
    $(id).hidden = screen !== key;
  $("analyzerView").hidden = [
    "home",
    "history",
    "catalog",
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
      : "#analyze";
  const analyzerBack = document.querySelector(".analyzer-heading .back");
  analyzerBack.href = screen === "analyze" ? "#home" : "#analyze";
  analyzerBack.setAttribute(
    "aria-label",
    screen === "analyze"
      ? "חזרה לבית"
      : screen === "processing"
        ? "ביטול וחזרה לבחירת סרטון"
        : "חזרה לבחירת סרטון",
  );
  $("reportLink").hidden = !scored;
  activate(screen);
  $("analyzer-title").textContent =
    screen === "results"
      ? "תוצאות הניתוח"
      : screen === "processing"
        ? "מנתחים את התנועה"
        : "ניתוח עמידת ידיים";
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
for (const exercise of ANALYSIS_CATALOG) {
  const config = analysisFor(exercise.id),
    card = document.createElement(config ? "a" : "article");
  card.className = "exercise-card";
  card.dataset.exercise = exercise.id;
  card.dataset.status = exercise.status;
  if (config) {
    card.href = "#analyze";
    card.setAttribute("aria-label", exercise.name + " — ניתוח זמין");
  }
  card.append(
    exerciseArtwork(exercise),
    statusBadge(exercise),
    exerciseCaption(exercise),
  );
  $("catalogGrid").append(card);
}
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
function playState() {
  const playing = !$("v").paused;
  $("play").dataset.playing = String(playing);
  $("play").setAttribute("aria-label", playing ? "עצור" : "נגן");
}
$("v").addEventListener("play", playState);
$("v").addEventListener("pause", playState);
playState();
function setExpanded(expanded) {
  document.body.dataset.expanded = String(expanded);
  $("expandPlayer").setAttribute("aria-expanded", String(expanded));
  $("expandPlayer").setAttribute(
    "aria-label",
    expanded ? "סגירת התצוגה המוגדלת" : "הגדלת הסרטון",
  );
}
$("expandPlayer").onclick = () =>
  setExpanded(document.body.dataset.expanded !== "true");
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setExpanded(false);
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
    } catch {}
  },
  frame(source, landmarks, width, height, timestamp) {
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
    busy = false;
    available = ["scored", "unreliable"].includes(outcome);
    scored = outcome === "scored";
    $("analysisStage").hidden = true;
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
    return;
  }
  if (!entries.length) {
    host.textContent =
      "ההתקדמות שלך מתחילה בניסיון הראשון. נתח סרטון כדי להתחיל לבנות את הגרף שלך.";
    return;
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
