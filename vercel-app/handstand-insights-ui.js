const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const evidenceText = (item) =>
  (Number.isFinite(item.start)
    ? `${item.start.toFixed(1)}–${item.end.toFixed(1)} שנ׳: `
    : "") + item.text;
let latest = null;
export function resetHandstandInsights() {
  latest = null;
  $("advancedReport").open = false;
  $("advancedOverlay").checked = false;
  document.querySelector(".overlay-options").open = false;
  for (const id of [
    "resultInsights",
    "playerInsights",
    "advancedEvidence",
    "coachObservations",
    "coachDrills",
  ])
    $(id).replaceChildren();
  $("resultInsights").hidden = true;
  $("playerInsights").hidden = true;
  $("reportTarget").hidden = true;
}
export function renderHandstandInsights(timeline, plan) {
  latest = { timeline, plan };
  $("resultQuality").hidden = true;
  const h = timeline.hold;
  $("holdDuration").hidden = false;
  $("holdDuration").textContent = h
    ? "מקטע החזקה שנמדד: כ־" +
      h.seconds.toFixed(1) +
      " שניות" +
      (h.censored ? " · ההחזקה המלאה אינה ידועה" : "")
    : "משך ההחזקה לא נמדד בביטחון";
  $("coachBadge").textContent = "ניתוח מקומי";
  $("coachStrength").textContent = plan.strength;
  $("coachSummary").textContent = plan.priority;
  const observations = $("coachObservations");
  observations.replaceChildren();
  const facts = plan.evidence.filter(
    (item) => !item.text.startsWith("נצפו כ־"),
  );
  for (const item of facts.slice(0, 2))
    observations.append(
      el("p", evidenceText(item), "coach-observation-finding"),
    );
  observations.append(el("p", plan.ending, "ending-evidence"));
  if (timeline.ending?.possibleExplanation)
    observations.append(el("p", plan.explanation, "coach-observation-cue"));
  const drills = $("coachDrills");
  drills.replaceChildren();
  for (const [i, d] of plan.drills.entries()) {
    const card = el("article", null, "coach-drill");
    card.append(
      el("h4", `${i + 1}. ${d.name}`, "coach-drill-name"),
      el("p", d.instruction, "coach-drill-focus"),
    );
    drills.append(card);
  }
  $("reportTarget").hidden = !plan.target;
  $("reportTargetText").textContent = plan.target?.text || "";
  const details = $("advancedEvidence");
  details.replaceChildren();
  for (const item of facts.slice(2))
    details.append(el("p", evidenceText(item), "note"));
  const scope = $("resultInsights");
  scope.replaceChildren();
  scope.hidden = false;
  scope.append(
    el(
      "p",
      timeline.ascent
        ? Number.isFinite(timeline.ascent.score)
          ? "עלייה נצפתה. מדד הטכניקה של העלייה: " +
            Math.round(timeline.ascent.score) +
            "/100."
          : "עלייה נצפתה. לא חושב לה ציון טכניקה נפרד; הציון הכללי מבוסס על מדדי ההחזקה."
        : "לא נצפה מעבר מלא מהכנה לעמידה בביטחון.",
      "note",
    ),
  );
  scope.append(
    el(
      "p",
      "הציון מתייחס לטכניקה לפי המנוע הקיים. משך החזקה ותמיכת קיר אינם כלולים בו כמדדי סיבולת או עצמאות.",
      "note",
    ),
  );
  $("coachQuality").textContent = plan.limitations;
  $("coachPanel").hidden = false;
  $("playerInsights").hidden = true;
  $("playerInsights").replaceChildren();
}
$("revokeCloudConsent")?.addEventListener("click", () =>
  queueMicrotask(() => {
    if (latest) renderHandstandInsights(latest.timeline, latest.plan);
  }),
);
