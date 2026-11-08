import { bestMeasuredStrength } from "./handstand-summary.js";
const time = (x) => Number(x).toFixed(1);
const DRILLS = {
  line: [
    {
      name: "הולו בודי",
      instruction:
        "תרגלו בטן אסופה וצלעות פנימה בשכיבה, ללא כאב או קשת מוגזמת.",
    },
    {
      name: "קו גוף בתמיכת קיר",
      instruction:
        "בתמיכה נוחה, כוונו כתפיים, אגן ורגליים לקו אחיד. איכות המנח קודמת להארכת הזמן.",
    },
  ],
  arms: [
    {
      name: "פלאנק בזרועות ישרות",
      instruction: "תרגלו תמיכה נוחה עם מרפקים ישרים ודחיפה מהרצפה, ללא כאב.",
    },
    {
      name: "פייק נתמך בשליטה",
      instruction:
        "בתמיכה נוחה ויציבה, שמרו על זרועות ישרות. הקטינו עומס אם אינכם שומרים על המנח.",
    },
  ],
  shoulder: [
    {
      name: "פתיחת כתפיים ליד קיר",
      instruction:
        "פתחו בהדרגה את הכתפיים בלי להגדיל את הקשת בגב; עבדו בטווח נוח וללא כאב.",
    },
    {
      name: "דחיפה דרך הכתפיים בתמיכה",
      instruction:
        "בפייק או בתמיכת קיר נוחה, שמרו זרועות ישרות ודחפו את הרצפה, ללא עומס שאינו נשלט.",
    },
  ],
  entry: [
    {
      name: "עלייה הדרגתית ליד קיר",
      instruction:
        "תרגלו עלייה מתונה עם תמיכה זמינה, בלי לזרוק את הרגליים מעבר לאנך.",
    },
    {
      name: "עמידת פייק נתמכת",
      instruction: "תרגלו הובלת האגן מעל הכתפיים בעומס נוח ובמרחב פנוי.",
    },
  ],
};
function endingObservation(ending) {
  if (ending?.supportLowering)
    return "בצד שנמדד נצפו הנמכה של הכתף וכפיפה במרפק ביחס לפרק כף היד. שלב זה מחוץ למקטע ההחזקה.";
  if (Number.isFinite(ending?.timeToDepartureSeconds))
    return "נצפתה יציאה מהאנך בתמונה. הסיבה ליציאה אינה ידועה.";
  if (ending?.kind === "tracking-lost" || ending?.kind === "video-ended")
    return "המקטע הנמדד הסתיים בלי שנקבע סוף ההחזקה בביטחון.";
  return "סוף ההחזקה לא נקבע בביטחון.";
}

export function buildIntelligentCoaching(timeline, hold, entry) {
  const h = timeline?.hold,
    c = timeline?.control,
    e = timeline?.ending;
  const short = h && h.seconds < 5,
    variable = c?.status === "variable",
    line = hold && hold.sc.banana < 65,
    shoulder = hold && hold.sc.shoulder < 65,
    elbow = hold && hold.sc.elbow < 65;
  const knownEntry = timeline?.ascent ? entry : null;
  const strength =
    bestMeasuredStrength(
      hold ? { ...hold, swayOk: hold.swayOk && !short && !variable } : null,
      knownEntry,
    )?.text || "אין מדד חזק מספיק כדי לקבוע נקודת חוזק בביטחון.";
  let key = "balance",
    priority,
    headline;
  if (!h) {
    priority =
      "לא נמדד רצף החזקה אמין. נדרש צילום מלא וברור לפני המלצה על משך או שליטה.";
    headline = "נמדד חלק מהתרגיל; ההחזקה אינה ברורה.";
    key = knownEntry ? "entry" : "balance";
  } else if (variable) {
    priority =
      "במקטע שנמדד השתנתה תנוחת הגוף בתמונה. כדאי לעיין בקטע לפני שבוחרים תרגיל לתיקון.";
    headline = h.censored
      ? "נצפה מקטע עם תנועות גדולות; משך ההחזקה המלא אינו ידוע."
      : short
        ? "החזקה קצרה עם תנועות גדולות."
        : "נמדדה שונות בתנוחה בתמונה.";
  } else if (line) {
    priority =
      "בתמונה נמדדה סטייה של האגן מקו הכתף–קרסול. אם המטרה היא קו אחיד, אפשר לתרגל אותו בתמיכה נוחה.";
    headline = short
      ? "יש בסיס לתרגול; נדרשים קו ושליטה עקביים יותר."
      : "קו הגוף הוא מוקד העבודה הבא.";
    key = "line";
  } else if (elbow) {
    priority = "בצד שנמדד נראתה כפיפה במרפק. אם המטרה היא החזקה בזרוע ישרה, אפשר לתרגל יישור בתמיכה נוחה.";
    headline = "נמדדה כפיפה במרפק בצד אחד.";
    key = "arms";
  } else if (short) {
    priority = h.censored
      ? "נצפה מקטע קצר בלבד; אי אפשר לקבוע שזו כל ההחזקה. כדאי לצלם גם את הכניסה והיציאה."
      : "המקטע שנמדד קצר. אפשר להשוות אותו לניסיונות נוספים בצילום דומה.";
    headline = h.censored
      ? "המקטע קצר; משך ההחזקה המלא אינו ידוע."
      : "נמדד מקטע החזקה קצר.";
  } else if (shoulder) {
    priority = "בצד שנמדד זווית הכתף המוקרנת סטתה מקו ישר. אם המטרה היא קו אחיד, אפשר לתרגל בתמיכה נוחה.";
    headline = "נמדדה החזקה ממושכת יותר; נשאר דיוק בכתפיים.";
    key = "shoulder";
  } else {
    priority =
      "אפשר להשוות ניסיונות נוספים בצילום דומה. המדידה מתארת את המקטע הזה.";
    headline = "נמדדה החזקה ממושכת יותר במנח עקבי.";
  }
  const evidence = [];
  if (timeline?.ascent)
    evidence.push({
      start: timeline.ascent.start,
      end: timeline.ascent.end,
      text: Number.isFinite(timeline.ascent.score) ? "זהו חלון העלייה ששימש לחישוב הציון." : "זוהתה עלייה ששויכה לאותו ניסיון.",
    });
  else
    evidence.push({ text: "לא נמצאה עלייה שניתן לשייך בביטחון למקטע הזה." });
  if (h)
    evidence.push({
      start: h.start,
      end: h.end,
      text: `נצפו כ־${time(h.seconds)} שניות רצופות במנח הפוך קרוב לאנך${h.censored ? " — גבולות ההחזקה אינם מלאים; זהו מקטע נצפה בלבד" : ""}.`,
    });
  if (c)
    evidence.push({
      start: c.start,
      end: c.end,
      text: `טווח ההיסט האופקי של האגן ביחס לפרק כף היד בתמונה: ${time(c.pelvisRangePercent)}% מאורך הגוף; טווח נטייה: ${time(c.tiltRangeDegrees)}° (אחוזונים 10–90).`,
    });
  if (e?.metrics)
    evidence.push({
      start: e.windowStart,
      end: e.at,
      text: `ליד סוף המקטע הנמדד: שינוי אופקי של האגן בתמונה ${time(e.metrics.pelvisDriftPercent)}% מאורך הגוף, במהירות ממוצעת ${time(e.metrics.pelvisSpeedPercentPerSecond)}% לשנייה; שינוי נטייה ${time(e.metrics.tiltChangeDegrees)}°.`,
    });
  if (e?.metrics) {
    const m = e.metrics,
      details = [];
    if (Math.abs(m.shoulderChangeDegrees) > 5)
      details.push("שינוי בזווית הכתף המוקרנת בצד שנמדד " + time(m.shoulderChangeDegrees) + "°");
    if (Math.abs(m.bodyLineChangePercent) > 2)
      details.push(
        "שינוי בהיסט האגן מקו הגוף " + time(m.bodyLineChangePercent) + "%",
      );
    if (
      m.legSeparationChange !== null &&
      Math.abs(m.legSeparationChange) > 0.05
    )
      details.push(
        "שינוי במרחק בין הקרסוליים " +
          time(m.legSeparationChange * 100) +
          "% מאורך הגוף",
      );
    if (m.growingOscillation === true)
      details.push("טווח ההיסט האופקי של האגן גדל ליד סוף המקטע");
    if (details.length)
      evidence.push({
        start: e.windowStart,
        end: e.at,
        text: details.join("; ") + ". אלה סימני תנועה, לא הוכחה לסיבת היציאה.",
      });
  }
  const explanation =
    "לא ניתן לקבוע מהצילום את הסיבה. מיקום דו־ממדי אינו מודד לחץ אצבעות, תמיכה, כוח או עייפות.";
  let target = null;
  if (h && !h.censored && h.seconds >= 1.5 && key !== "balance") {
    const seconds = Math.min(5, Math.floor(h.seconds));
    const focus = key === "line" ? "קו גוף אחיד יותר"
      : key === "arms" ? "זרועות ישרות בתמיכה נוחה"
      : "פתיחת כתפיים ללא קשת נוספת";
    target = {
      seconds,
      attempts: 3,
      text: `יעד תרגול מוצע: 3 ניסיונות של עד ${seconds} שניות עם ${focus}, בתמיכה זמינה ועם מנוחה. אין צורך להאריך כרגע.`,
    };
  }
  return {
    version: "coaching-v1",
    headline,
    strength,
    priority,
    evidence,
    explanation,
    drills: key === "balance" ? [] : DRILLS[key],
    target,
    ending: endingObservation(e),
    limitations:
      "הערכה מקומית במישור צילום אחד. תמיכת קיר, כוונה ולחץ כפות הידיים אינם נמדדים. אין כאן אבחנה של סיבת נפילה.",
  };
}
