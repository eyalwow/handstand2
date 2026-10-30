const $ = (id) => document.getElementById(id);
let busy = false,
  available = false,
  scored = false;
const stages = ["decode", "model", "scan", "scoring", "render"];
function route() {
  let screen = location.hash.slice(1) || "home";
  if (
    !["home", "analyze", "processing", "results", "replay", "history"].includes(
      screen,
    )
  )
    screen = "home";
  if (busy && ["analyze", "results", "replay"].includes(screen))
    screen = "processing";
  if (screen === "processing" && !busy)
    screen = available ? (scored ? "results" : "replay") : "analyze";
  if (["results", "replay"].includes(screen) && !available) screen = "analyze";
  document.body.dataset.screen = screen;
  $("analyzer-title").textContent =
    screen === "results" ? "תוצאה" : "ניתוח עמידת ידיים";
  $("homeView").hidden = screen !== "home";
  $("historyView").hidden = screen !== "history";
  $("analyzerView").hidden = ["home", "history"].includes(screen);
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
  if (screen !== "replay") $("v").pause();
  window.scrollTo({ top: 0, behavior: "instant" });
  const heading =
    screen === "home"
      ? $("home-title")
      : screen === "history"
        ? $("history-title")
        : screen === "replay"
          ? $("playerTitle")
          : screen === "processing"
            ? $("analysisStage").querySelector("h2")
            : $("analyzer-title");
  heading.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
$("openCamera").onclick = () => $("cameraFile").click();
$("openGallery").onclick = () => $("file").click();
export function drawPose(ctx, landmarks, width, height) {
  if (!landmarks) return;
  const point = (i) => (landmarks[i]?.v >= 0.5 ? landmarks[i] : null);
  ctx.save();
  ctx.strokeStyle = "#C4FF64";
  ctx.fillStyle = "#C4FF64";
  ctx.lineWidth = Math.max(1.5, width / 340);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#C4FF6440";
  ctx.shadowBlur = 2;
  for (const [a, b] of [
    [11, 13],
    [13, 15],
    [11, 23],
    [23, 25],
    [25, 27],
    [12, 14],
    [14, 16],
    [12, 24],
    [24, 26],
    [26, 28],
    [11, 12],
    [23, 24],
  ]) {
    const u = point(a),
      v = point(b);
    if (!u || !v) continue;
    ctx.beginPath();
    ctx.moveTo(u.x, u.y);
    ctx.lineTo(v.x, v.y);
    ctx.stroke();
  }
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = point(i);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(3, width / 190), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
export const analysisUI = {
  joints(first, second, amount) {
    const host = $("jointMetrics");
    host.hidden = !$("showAngles").checked;
    host.replaceChildren();
    if (host.hidden) return;
    const a = first || second,
      b = second || first;
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
    available = false;
    scored = false;
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
  frame(source, landmarks, width, height) {
    const canvas = $("analysisCanvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0);
    ctx.save();
    ctx.scale(source.width / width, source.height / height);
    drawPose(ctx, landmarks, width, height);
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
      for (const [key, label] of [
        ["banana", "יישור גוף"],
        ["shoulder", "כתפיים"],
        ["elbow", "ידיים"],
        ["lean", "איזון"],
      ]) {
        if (!Number.isFinite(res.sc[key])) continue;
        const card = document.createElement("article");
        const title = document.createElement("span");
        title.textContent = label;
        const value = document.createElement("strong");
        value.textContent = Math.round(res.sc[key]);
        card.append(title, value);
        target.append(card);
      }
  },
  finish(outcome) {
    const highlights = $("resultHighlights");
    highlights.replaceChildren();
    if (outcome === "scored") {
      const strength = $("coachStrength").textContent;
      if (strength) {
        const p = document.createElement("p");
        p.className = "strength";
        p.textContent = "✓ " + strength;
        highlights.append(p);
      }
      for (const finding of document.querySelectorAll(
        "#coachObservations .coach-observation-finding",
      )) {
        const p = document.createElement("p");
        p.className = "improvement";
        p.textContent = finding.textContent;
        highlights.append(p);
      }
      $("playerMetrics").replaceChildren(
        ...Array.from($("resultMetrics").children, (c) => c.cloneNode(true)),
      );
    }
    busy = false;
    available = ["scored", "unreliable"].includes(outcome);
    scored = outcome === "scored";
    $("analysisStage").hidden = true;
    location.hash = available ? (scored ? "results" : "replay") : "analyze";
    route();
  },
};
route();
function historyChart() {
  const host = $("historyChart");
  host.replaceChildren();
  let entries;
  try {
    const raw = JSON.parse(
      localStorage.getItem("handstand-lab-analyses-v1") || "[]",
    );
    if (!Array.isArray(raw)) throw Error();
    entries = raw
      .filter(
        (x) =>
          x &&
          /^(v2-|v3-fixed-)/.test(x.model) &&
          Number.isFinite(x.score) &&
          x.score >= 0 &&
          x.score <= 100 &&
          Number.isFinite(Date.parse(x.date)),
      )
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
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
      { x: 5, y: y + 4, fill: "#a9b5aa", "font-size": 10 },
      String(score),
    );
  }
  const points = entries.map((e, i) => [
    entries.length === 1 ? 280 : 45 + (i * 480) / (entries.length - 1),
    200 - e.score * 1.7,
  ]);
  if (points.length > 1)
    make("polyline", {
      points: points.map((p) => p.join(",")).join(" "),
      fill: "none",
      stroke: "#c4ff64",
      "stroke-width": 2.5,
    });
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
          "font-size": 10,
          "text-anchor": "middle",
        },
        date,
      );
    const title = document.createElementNS(ns, "title");
    title.textContent = date + ": " + Math.round(entries[i].score);
    svg.lastChild.append(title);
  });
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
