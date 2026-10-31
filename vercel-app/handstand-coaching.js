import { bestMeasuredStrength } from "./handstand-summary.js";
const time = (x) => Number(x).toFixed(1);
const DRILLS = {
  balance: [
    {
      name: "תיקוני איזון קטנים ליד קיר",
      instruction:
        "בתמיכה נוחה ליד קיר, נתקו רגליים לרגע והחזירו בשליטה. התחילו בטווח קטן ובמרחב פנוי.",
    },
    {
      name: "החזקות קצרות חוזרות",
      instruction:
        "בצעו מספר ניסיונות קצרים עם מנוחה מלאה; עצרו כשהשליטה או הטכניקה יורדות. רשמו את הזמן של כל ניסיון.",
    },
  ],
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
      "לא נמדד רצף החזקה אמין. נדרש צילום מלא וברור לפני המלצה על משך או יציבות.";
    headline = "נמדד חלק מהתרגיל; ההחזקה אינה ברורה.";
    key = knownEntry ? "entry" : "balance";
  } else if (variable) {
    priority =
      "השליטה בשיווי המשקל היא העדיפות: נמדדה תנועה משמעותית של האגן ביחס לידיים.";
    headline = h.censored
      ? "נצפה מקטע עם תנועות גדולות; משך ההחזקה המלא אינו ידוע."
      : short
        ? "החזקה קצרה עם תנועות גדולות."
        : "קו הגוף לבדו לא מתאר את היציבות.";
  } else if (line) {
    priority =
      "כדאי לדייק את קו הגוף לפני הארכת ההחזקה; נמדדה סטייה של האגן מקו הכתפיים והרגליים.";
    headline = short
      ? "יש בסיס לתרגול; נדרשים קו ושליטה עקביים יותר."
      : "קו הגוף הוא מוקד העבודה הבא.";
    key = "line";
  } else if (elbow) {
    priority = "כדאי לייצב את יישור המרפקים בתמיכה נוחה לפני הארכת ההחזקה.";
    headline = "יישור הזרועות הוא מוקד התרגול הבא.";
    key = "arms";
  } else if (short) {
    priority = h.censored
      ? "נצפה מקטע קצר בלבד; אי אפשר לקבוע שזו כל ההחזקה. כדאי לצלם גם את הכניסה והיציאה."
      : "ההחזקה קצרה, גם כשהמנח נראה טוב. התמקדו בשליטה ובצבירת החזקות עקביות לפני ניסיון ממושך.";
    headline = h.censored
      ? "המקטע קצר; משך ההחזקה המלא אינו ידוע."
      : "המנח הוא בסיס טוב; ההחזקה עדיין קצרה.";
  } else if (shoulder) {
    priority = "כדאי לשפר את פתיחת הכתפיים תוך שמירה על קו הגוף.";
    headline = "נמדדה החזקה ממושכת יותר; נשאר דיוק בכתפיים.";
    key = "shoulder";
  } else {
    priority =
      "המשיכו לבנות עקביות בין ניסיונות, תוך שמירה על אותו מנח ויציאה נשלטת.";
    headline = "נמדדה החזקה ממושכת יותר במנח עקבי.";
  }
  const evidence = [];
  if (timeline?.ascent)
    evidence.push({
      start: timeline.ascent.start,
      end: timeline.ascent.end,
      text: "נצפה רצף הכנה, עלייה והגעה לאנך.",
    });
  else
    evidence.push({ text: "העלייה אינה נצפית ברצף אמין; אין הערכה מלאה שלה." });
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
      text: `טווח תנועת האגן ביחס לכפות הידיים: ${time(c.pelvisRangePercent)}% מאורך הגוף; טווח נטייה: ${time(c.tiltRangeDegrees)}° (אחוזונים 10–90).`,
    });
  if (e?.metrics)
    evidence.push({
      start: e.windowStart,
      end: e.at,
      text: `לפני הסיום: שינוי אגן ${time(e.metrics.pelvisDriftPercent)}% מאורך הגוף, במהירות ממוצעת ${time(e.metrics.pelvisSpeedPercentPerSecond)}% לשנייה; שינוי נטייה ${time(e.metrics.tiltChangeDegrees)}°.`,
    });
  if (e?.metrics) {
    const m = e.metrics,
      details = [];
    if (Math.abs(m.shoulderChangeDegrees) > 5)
      details.push("שינוי בזווית הכתף " + time(m.shoulderChangeDegrees) + "°");
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
      details.push("טווח תנועת האגן גדל לקראת הסיום");
    if (details.length)
      evidence.push({
        start: e.windowStart,
        end: e.at,
        text: details.join("; ") + ". אלה סימני תנועה, לא הוכחה לסיבת היציאה.",
      });
  }
  const explanation =
    e?.possibleExplanation ||
    "לא ניתן לקבוע מהצילום את הסיבה. מיקום דו־ממדי אינו מודד לחץ אצבעות, תמיכה, כוח או עייפות.";
  let target = null;
  if (h && !h.censored && h.seconds >= 1.5) {
    const seconds =
      variable || line || shoulder || elbow
        ? Math.min(5, Math.floor(h.seconds))
        : short
          ? Math.min(5, Math.floor(h.seconds) + 1)
          : Math.floor(h.seconds);
    const improving = variable || line || shoulder || elbow;
    const focus = variable
      ? "תיקוני איזון קטנים יותר"
      : line
        ? "קו גוף אחיד יותר"
        : elbow
          ? "זרועות ישרות בתמיכה נוחה"
          : "פתיחת כתפיים ללא קשת נוספת";
    target = {
      seconds,
      attempts: 3,
      text: improving
        ? `יעד תרגול מוצע: 3 ניסיונות של עד ${seconds} שניות עם ${focus}, בתמיכה זמינה ועם מנוחה. אין צורך להאריך כרגע.`
        : short
          ? `יעד תרגול מוצע: 3 ניסיונות של כ־${seconds} שניות בשליטה, עם תמיכה זמינה ומנוחה. איכות ויציאה נשלטת קודמות לזמן.`
          : `יעד תרגול מוצע: לשחזר 3 ניסיונות של כ־${seconds} שניות באותה איכות, עם מנוחה ויציאה נשלטת. אין צורך להאריך כרגע.`,
    };
  }
  return {
    version: "coaching-v1",
    headline,
    strength,
    priority,
    evidence,
    explanation,
    drills: DRILLS[key],
    target,
    ending: e?.reason || "סיום התנועה אינו ברור.",
    limitations:
      "הערכה מקומית במישור צילום אחד. תמיכת קיר, כוונה ולחץ כפות הידיים אינם נמדדים. אין כאן אבחנה של סיבת נפילה.",
  };
}
