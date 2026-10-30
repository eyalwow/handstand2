// Stage A design review only. No application engine, API, video or storage writes.
const screens = ["welcome", "home", "upload", "player"];
const byId = (id) => document.getElementById(id);
if (new URLSearchParams(location.search).get("capture") === "1")
  document.body.classList.add("capture");
function showScreen() {
  const selected = screens.includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "welcome";
  document.querySelectorAll("[data-screen]").forEach((screen) => {
    screen.hidden = screen.dataset.screen !== selected;
  });
  document.querySelectorAll(".review-tools nav a").forEach((link) => {
    if (link.hash === "#" + selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document
    .querySelector('[data-screen="' + selected + '"] h1')
    .focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", showScreen);
showScreen();
const info = byId("reviewInfo");
document
  .querySelectorAll("[data-info]")
  .forEach((button) =>
    button.addEventListener("click", () => info.showModal()),
  );
byId("closeInfo").addEventListener("click", () => info.close());
byId("skeletonToggle").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const visible = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(visible));
  byId("poseOverlay").toggleAttribute("hidden", !visible);
});
for (const id of ["metricsTab", "anglesTab"])
  byId(id).addEventListener("click", () => {
    const angles = id === "anglesTab";
    byId("sampleMetrics").hidden = angles;
    byId("sampleAngles").hidden = !angles;
    byId("metricsTab").setAttribute("aria-pressed", String(!angles));
    byId("anglesTab").setAttribute("aria-pressed", String(angles));
    byId("metricHeading").textContent = angles
      ? "זוויות בתמונת ההדגמה"
      : "הנקודות שעושות את ההבדל";
    byId("metricHeading").nextElementSibling.textContent = angles
      ? "מדידה על תמונת AI"
      : "נתוני דוגמה";
  });
async function renderMeasuredDemoPose() {
  const response = await fetch("assets/handstand-pose.json");
  if (!response.ok) throw new Error("Demo pose asset unavailable");
  const data = await response.json();
  const points = data.landmarks;
  const svg = byId("poseOverlay");
  const ns = "http://www.w3.org/2000/svg";
  const point = (index) =>
    points[index] && points[index].visibility >= 0.5 ? points[index] : null;
  const line = (a, b) => {
    const x = point(a),
      y = point(b);
    if (!x || !y) return;
    const node = document.createElementNS(ns, "line");
    for (const [key, value] of Object.entries({
      x1: x.x * 1024,
      y1: x.y * 1536,
      x2: y.x * 1024,
      y2: y.y * 1536,
      stroke: "#c4ff64",
      "stroke-width": 7,
      "stroke-linecap": "round",
    }))
      node.setAttribute(key, value);
    svg.append(node);
  };
  for (const connection of [
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
  ])
    line(...connection);
  for (const index of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = point(index);
    if (!p) continue;
    const circle = document.createElementNS(ns, "circle");
    for (const [key, value] of Object.entries({
      cx: p.x * 1024,
      cy: p.y * 1536,
      r: 10,
      fill: "#c4ff64",
      stroke: "#223512",
      "stroke-width": 3,
    }))
      circle.setAttribute(key, value);
    svg.append(circle);
  }
  for (const [label, indexes] of [
    ["מרפק ימין", [12, 14, 16]],
    ["מרפק שמאל", [11, 13, 15]],
    ["כתף ימין", [14, 12, 24]],
    ["כתף שמאל", [13, 11, 23]],
  ]) {
    const [a, b, c] = indexes.map(point);
    if (!a || !b || !c) continue;
    const ax = (a.x - b.x) * 1024,
      ay = (a.y - b.y) * 1536,
      bx = (c.x - b.x) * 1024,
      by = (c.y - b.y) * 1536;
    const length = Math.hypot(ax, ay) * Math.hypot(bx, by);
    if (!length) continue;
    const value = Math.round(
      (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / length))) *
        180) /
        Math.PI,
    );
    const card = document.createElement("article"),
      title = document.createElement("span"),
      number = document.createElement("strong");
    title.textContent = label;
    number.textContent = value + "°";
    card.append(title, number);
    byId("sampleAngles").append(card);
  }
  document.documentElement.dataset.poseReady = "true";
}
renderMeasuredDemoPose().catch(() => {
  byId("poseOverlay").setAttribute("hidden", "");
  byId("skeletonToggle").disabled = true;
  byId("skeletonToggle").setAttribute("aria-pressed", "false");
  byId("sampleAngles").textContent = "נתוני תמונת ההדגמה אינם זמינים.";
  document.documentElement.dataset.poseReady = "unavailable";
});
