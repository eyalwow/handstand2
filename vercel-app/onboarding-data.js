import { exerciseById } from "./analysis-catalog.js";
export const PREFERENCES_KEY = "movalyt-preferences-v1";
export const GOALS = Object.freeze([
  {
    id: "technique",
    title: "שיפור טכניקה",
    description: "לזהות את הפרטים שעושים את ההבדל.",
    icon: "target",
  },
  {
    id: "skills",
    title: "לימוד תרגילים חדשים",
    description: "לבנות כיוון לתרגול הבא שלי.",
    icon: "pose",
  },
  {
    id: "progress",
    title: "מעקב אחר התקדמות",
    description: "לראות שינוי, ניסיון אחרי ניסיון.",
    icon: "chart",
  },
]);
function clean(profile) {
  if (
    !profile ||
    profile.version !== 1 ||
    typeof profile.completed !== "boolean"
  )
    throw Error("Invalid preferences");
  return {
    version: 1,
    completed: profile.completed,
    skipped: profile.skipped === true,
    goal: GOALS.some((goal) => goal.id === profile.goal) ? profile.goal : null,
    interests: [
      ...new Set(
        Array.isArray(profile.interests)
          ? profile.interests.filter((id) => exerciseById(id))
          : [],
      ),
    ],
    updatedAt: typeof profile.updatedAt === "string" ? profile.updatedAt : null,
  };
}
export function readPreferences(storage) {
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    return { profile: raw ? clean(JSON.parse(raw)) : null, error: null };
  } catch {
    return {
      profile: null,
      error: "לא ניתן לקרוא את ההעדפות במכשיר הזה. הנתונים לא שונו.",
    };
  }
}
export function savePreferences(
  storage,
  draft,
  { skipped = false, now = new Date() } = {},
) {
  try {
    if (readPreferences(storage).error)
      throw Error("Unreadable preferences preserved");
    const profile = clean({
      ...draft,
      version: 1,
      completed: true,
      skipped,
      updatedAt: now.toISOString(),
    });
    storage.setItem(PREFERENCES_KEY, JSON.stringify(profile));
    return { profile, error: null };
  } catch {
    return {
      profile: null,
      error: "לא ניתן לשמור את ההעדפות במכשיר הזה. אפשר להמשיך בלי שמירה.",
    };
  }
}
export const browserPreferencesStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
};
