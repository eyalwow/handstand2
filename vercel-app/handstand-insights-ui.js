const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (cls) node.className = cls;
  return node;
};
const stamp = (t) => (Number.isFinite(t) ? t.toFixed(1) + " שנ׳" : null);
let latest = null;
export function resetHandstandInsights() {
  latest = null;
  for (const id of ["resultInsights", "playerInsights"]) {
    const host = $(id);
    host.replaceChildren();
    host.hidden = true;
  }
}
export function renderHandstandInsights(timeline, plan) {
  latest = { timeline, plan };
  for (const id of ["resultInsights", "playerInsights"]) {
    const host = $(id);
    host.hidden = false;
    host.replaceChildren();
    host.append(el("h3", "הניסיון שלך, מעבר לציון"));
    const grid = el("div", null, "temporal-grid");
    for (const [label, value] of [
      [
        "עלייה",
        timeline.ascent
          ? "נצפתה · " + Math.round(timeline.ascent.score) + "/100"
          : "לא נצפתה בביטחון",
      ],
      ["הגעה לאנך", timeline.reach ? "נצפתה" : "לא נצפתה בביטחון"],
      [
        "החזקה נצפית",
        timeline.hold
          ? (timeline.hold.censored ? "מקטע של כ־" : "כ־") +
            timeline.hold.seconds.toFixed(1) +
            " שנ׳"
          : "לא נמדדה בביטחון",
      ],
      [
        "שליטה",
        timeline.control
          ? timeline.control.status === "variable"
            ? "תנועה משמעותית"
            : "תנועה מצומצמת במקטע"
          : "אין רצף מספיק",
      ],
    ]) {
      const card = el("article");
      card.append(el("small", label), el("strong", value));
      grid.append(card);
    }
    host.append(grid);
    host.append(el("p", plan.ending, "ending-evidence"));
    if (timeline.hold?.censored)
      host.append(
        el(
          "p",
          "לא נצפו שני גבולות ההחזקה. הזמן מתייחס למקטע שנראה, ולא בהכרח להחזקה המלאה.",
          "note",
        ),
      );
    host.append(
      el(
        "p",
        "הציון נשאר לפי המנוע הקיים; זמן ושליטה מוצגים בנפרד. תמיכה בקיר אינה מזוהה.",
        "note",
      ),
    );
  }
  $("resultQuality").textContent = plan.headline;
  $("holdDuration").hidden = true; // The legacy inverted-window duration is not the new observed interval.
  $("coachBadge").textContent = "ניתוח מקומי לאורך זמן";
  $("coachStrength").textContent = "מה עבד טוב: " + plan.strength;
  $("coachSummary").textContent = "העדיפות לשיפור: " + plan.priority;
  const observations = $("coachObservations");
  observations.replaceChildren();
  const evidence = el("article", null, "coach-observation");
  evidence.append(el("h3", "הראיות בסרטון", "coach-observation-title"));
  for (const item of plan.evidence)
    evidence.append(
      el(
        "p",
        (stamp(item.start)
          ? stamp(item.start) + "–" + stamp(item.end) + ": "
          : "") + item.text,
        "coach-observation-finding",
      ),
    );
  observations.append(evidence);
  const cause = el("article", null, "coach-observation");
  cause.append(
    el("h3", "הסבר אפשרי, עם גבולות ברורים", "coach-observation-title"),
    el("p", plan.explanation, "coach-observation-finding"),
  );
  observations.append(cause);
  const target = el("article", null, "coach-observation");
  target.append(
    el("h3", "לאימון הבא", "coach-observation-title"),
    el(
      "p",
      plan.target?.text ||
        "צלמו ניסיון מלא מהצד, כולל עלייה ויציאה, כשהגוף כולו בפריים. אין בסיס מספיק ליעד זמן אישי.",
      "coach-observation-cue",
    ),
  );
  observations.append(target);
  const drills = $("coachDrills");
  drills.replaceChildren();
  for (const [i, d] of plan.drills.entries()) {
    const card = el("article", null, "coach-drill");
    card.append(
      el("h3", i + 1 + ". " + d.name, "coach-drill-name"),
      el("p", d.instruction, "coach-drill-focus"),
    );
    drills.append(card);
  }
  const disclosure = drills.closest("details");
  if (disclosure) disclosure.open = true;
  $("coachQuality").textContent = plan.limitations;
  $("coachPanel").hidden = false;
}
$("revokeCloudConsent")?.addEventListener("click", () =>
  queueMicrotask(() => {
    if (latest) renderHandstandInsights(latest.timeline, latest.plan);
  }),
);
