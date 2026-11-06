# MOVALYT — השוואה לסקיצות ודוח פערים

מימוש על בסיס Draft PR #41, commit `d621cac369870569dd335445c013e06d0f6fb4f2`. שתי הסקיצות המצורפות בבקשה הן מקור העיצוב. מסך הספרייה לא עוצב מחדש.

**תוצאה:** המסכים והמסלול הושלמו. ההבדלים המכוונים והמגבלות מפורטים כאן; אין טענה לזהות פיקסלית לסקיצות או לאימות במכשיר iPhone פיזי.

## Preview וצילומים אמיתיים

[Preview שנבדק — READY](https://handstand-lab-coach-i3koyj3v5-eyalwen-6443.vercel.app/vercel-app/) ב־commit האפליקציה `c8fa6d6be9e875477727a024b47bb6ab99f9b32b`. יש להשתמש בנתיב `/vercel-app/`; ייתכן שתידרש התחברות ל־Vercel. בכניסה ראשונה אפשר לדלג על מסך ההיכרות הקיים. זו סביבת Preview של אפליקציית HTML/CSS/ES modules הקיימת.

הצילומים הבאים צולמו בדפדפן, ללא הכנסת ציונים, תנוחות, משוב או היסטוריה מדומים. צילומי הטפסים מה־Preview הם WebKit; צילומי הניתוח הם Chromium עם קובץ בדיקה ציבורי אמיתי. רוחבי מובייל מציינים CSS pixels ב־DPR 2, ולא גודל פיזי של צילום המסך.

| מסך | 390px | 320px | 1440px | השוואה לסקיצה |
| --- | --- | --- | --- | --- |
| בית | [צילום](screenshots/complete-analysis/preview/home-390.png) | [צילום](screenshots/complete-analysis/preview/home-320.png) | [צילום](screenshots/complete-analysis/preview/home-1440.png) | לוגו והגדרות, מסר אחד, עמידת ידיים גדולה ללא כיתוב מוטמע, פעולה אחת, פרטיות, סטטוסים וניתוח אחרון/מצב ריק. |
| משפחה ווריאציות | [צילום](screenshots/complete-analysis/preview/front-lever-family-390.png) | [צילום](screenshots/complete-analysis/preview/front-lever-family-320.png) | [צילום](screenshots/complete-analysis/preview/front-lever-family-1440.png) | Hero גדול, בחירה בשורות, מצב נבחר ברור, גומיות באותה משפחה והמשך לצילום. |
| הנחיות צילום | [צילום](screenshots/complete-analysis/preview/front-lever-guide-390.png) | [צילום](screenshots/complete-analysis/preview/front-lever-guide-320.png) | [צילום](screenshots/complete-analysis/preview/front-lever-guide-1440.png) | בחירה נוכחית, איור נקי, ארבעה תנאים לסימון, הסבר מגבלות ופעולה להעלאה. מידע נוסף נשמר באזור נפתח. |
| בחירת סרטון | [צילום](screenshots/complete-analysis/preview/front-lever-upload-390.png) | [צילום](screenshots/complete-analysis/preview/front-lever-upload-320.png) | [צילום](screenshots/complete-analysis/preview/front-lever-upload-1440.png) | התרגיל הנכון, איורו, צילום מהצד, הסכמה ניסיונית, בחירת קובץ/מצלמה ופרטיות. |
| בדיקה לפני ניתוח | [צילום אמיתי](screenshots/complete-analysis/local/real-video-review-390.png) | — | — | לאחר הבחירה מוצג הסרטון עצמו; התחלה מפורשת וביטול. אין ניתוח לפני Start. |
| עיבוד | [צילום](screenshots/complete-analysis/local/real-processing-390.png) | [צילום](screenshots/complete-analysis/local/real-processing-320.png) | [צילום](screenshots/complete-analysis/local/real-processing-1440.png) | שלבים ואחוזים מהמנוע, פריים אמיתי, מצב מעקב וביטול; אין אחוז דוגמה קבוע. |
| תוצאות | [צילום](screenshots/complete-analysis/local/real-results-390.png) | [צילום](screenshots/complete-analysis/local/real-results-320.png) | [צילום](screenshots/complete-analysis/local/real-results-1440.png) | זמן ומדד נפרדים, מגבלות המדידה, שלושה אזורי משוב קיימים, פירוט מדדים ופעולה לניסיון נוסף. |
| נגן ושלד | [צילום](screenshots/complete-analysis/local/real-player-390.png) | [צילום](screenshots/complete-analysis/local/real-player-320.png) | [צילום](screenshots/complete-analysis/local/real-player-1440.png) | כותרת אחת, הסרטון עם נקודות MediaPipe אמיתיות, ציר זמן, מהירות, פריימים, שכבות תצוגה וקישור לתוצאות. |
| היסטוריה ריקה | [צילום](screenshots/complete-analysis/preview/history-empty-390.png) | [צילום](screenshots/complete-analysis/preview/history-empty-320.png) | [צילום](screenshots/complete-analysis/preview/history-empty-1440.png) | איור סטנדרטי למצב ריק, ללא נקודות התקדמות מומצאות; רשימה/גרף ומדידות ניסיוניות לפי וריאציה. |
| היסטוריה אמיתית | [צילום](screenshots/complete-analysis/local/real-history-390.png) | [צילום](screenshots/complete-analysis/local/real-history-320.png) | [צילום](screenshots/complete-analysis/local/real-history-1440.png) | רק המדידה שנוצרה בניתוח בפועל, שמירה, פתיחה מחדש ופירוט לקריאה בלבד. |

## פערים מכוונים

1. **נתוני ההמחשה אינם נתוני מוצר.** הערכים 74, ‏8.4 שניות ו־42% בסקיצות לא הוכנסו לאפליקציה. המנוע הקיים החזיר עבור קובץ הבדיקה מדד **58** ומקטע נצפה של **2.2 שניות**; תחילת ההחזקה המלאה לא נצפתה. ההסתייגות מוצגת ליד הזמן. המקור והגיבובים ב־[public-fixture.json](screenshots/complete-analysis/public-fixture.json). הסרטון אינו כלול באפליקציה.
2. **שלד אמיתי במקום שלד על איור.** בסקיצה הנגן מציג שלד להמחשה על הדמות. במימוש מצוירות רק נקודות מהסרטון ומהמעקב בפועל. בעיבוד מוצג איור מסומן כהמחשה רק עד לקבלת פריים מהסרטון; לאחר מכן מוצג הפריים האמיתי. אין מצלמה חיה או נקודות מזויפות.
3. **שמירה על אזהרות ונתונים אמיתיים.** הודעת המדידה הדו־ממדית הלא מכוילת נשמרה. טקסט המשוב והאזהרות עשוי להיות ארוך מהטקסט הקצר בסקיצה ולדרוש גלילה. מדדי הטכניקה, ההמלצות הקיימות והראיות זמינים בפירוט נפתח; לא נוצרו תוכניות אימון.
4. **נכסים מאושרים.** נעשה שימוש בדמות, בלוגו ובאיורים המאושרים הקיימים וב־Rubik המקומי. בחלק מהתנוחות/הציוד יש הבדלים בין המקור הקיים לבין הסקיצה. הוסרו כיתוב מוטמע ושוליים בלבד, ללא יצירת גוף חדש, מתיחת פרופורציות או חיתוך איברים. 13 גזירות חדשות מתועדות ב־[manifest](../vercel-app/assets/presentation/manifest.json); תשע גזירות #41 נשארו ללא שינוי.
5. **תנאי צילום אינם אימות ממוחשב.** ארבע תיבות הסימון הן תזכורת להכנת צילום, ואינן הוכחה לזווית או להיעדר תמיכה. ההסכמה המחייבת של פרונט לבר עדיין נבדקת לפני התחלת הניתוח. מנועי פלאנץ׳ ותרגילים שאינם זמינים נשארים חסומים.
6. **היסטוריה מוגבלת למה שנשמר.** הרשומות הקיימות של עמידת ידיים כוללות ציון/תאריך/שיטת חישוב בלבד. מסך הפירוט אינו משחזר וידאו, שלד, זמן או משוב שלא נשמרו. ההשוואות מחברות רק שיטות חישוב תואמות; מדידות ניסיוניות נשארות לפי וריאציה וללא ציון.
7. **הקטנת רוחב אינה הסתרת תוכן.** ב־320px נשמרים סדר התוכן, RTL וכפתורי 44px. כאשר התוכן האמיתי ארוך, משתמשים בגלילה אנכית ומרווח תחתון מעל הניווט. מסגרות המכשירים שבסקיצות אינן נבנות בתוך האפליקציה.

## בדיקות ותוצאות

- **140/140 בדיקות Node קיימות**, **4/4 בדיקות חבילת המובייל**; 42 מודולים נארזים עם CSP קיים ומודל/WASM מקומיים.
- [בדיקת הממשק הקיימת המלאה](screenshots/complete-analysis/existing-ui.json): 75 בחירות וריאציה → הנחיות → רענון בשלושה רוחבים; כולל גומיות, חיפוש, סינון, מיון, תמונות ושגיאת קובץ. התאמות בבדיקות משקפות את שינוי הכפתור, שורות ללא תמונות ואת הפרדת הנגן מהתוצאות, ולא ביטול של בדיקת פונקציונליות.
- [Chromium מקומי — מסלול מלא](screenshots/complete-analysis/local/checks.json): בחירת תרגיל, תנאי צילום, קובץ אמיתי, בדיקה מקדימה ללא ניתוח, ביטול ללא שמירה, ניתוח CPU ב־Worker, תוצאה אמיתית, שלד/זוויות/מהירות/פריימים, היסטוריה, רענון ופירוט לקריאה בלבד. סרטון ללא גוף אינו מקבל ציון ואינו משנה את הרשומה הקודמת. אין שגיאות יישום/HTTP או POSTs בבדיקה המוצלחת.
- [WebKit על Preview](screenshots/complete-analysis/preview/checks.json): ממשק, בחירה, גומיות, תנאים, קובץ לא תקין, ביטול בחירה, מצבים ריקים, RTL, מטרות 44px וללא גלילה אופקית ב־320/390/1440. רק סרגל הבדיקה המוזרק של Vercel מוסתר בצילומי QA; הגנת הפריסה לא השתנתה.
- [חבילת המובייל בדפדפן](screenshots/complete-analysis/native/checks.json): המסלול המלא עם מודל/WASM מקומיים, תוך חסימת HTTPS חיצוני. זו בדיקת web bundle של Capacitor, לא התקנה או אישור WKWebView/Android WebView פיזי.
- [גבולות המערכת](screenshots/complete-analysis/boundaries.json): הסכמה ניסיונית, תוצאה שלילית אמיתית לפרונט לבר, אין ציון/שמירה עבור סרטון ריק, שמירת נתוני אימון קיימים, היסטוריה פגומה ללא דריסה והשוואות תואמות בלבד. בדיקות התאימות הוותיקות משתמשות ברשומות וב־DOM fixtures מסומנים, בבידוד בלבד; הן אינן נתוני מוצר ולא נוצרו מהן צילומי ציונים.
- **הספרייה נשארה זהה פיקסלית ל־#41** ב־320/390/1440 בשני דפדפנים מקומיים. [גיבובי מערכת זהים לבסיס](screenshots/complete-analysis/preserved-system.json) מאשרים שמירה על המנוע, החישובים, MediaPipe, הקטלוג, הבחירה וגבולות האחסון.
- GitHub Actions: [Validate handstand coach — success](https://github.com/eyalwow/handstand2/actions/runs/42209122616), [Native preparation — success](https://github.com/eyalwow/handstand2/actions/runs/42209122535).

## מגבלות פתוחות

- **WebKit ב־Linux:** הממשק עבר. ניתוח וידאו אמיתי נכשל בשלב `scan` גם ב־#41 וגם בענף החדש, וללא ציון מוצג: [השוואת בסיס](screenshots/complete-analysis/webkit-inference-baseline.json). המנוע לא שונה כדי לעקוף זאת. נתיב הניתוח המוצלח נבדק ב־Chromium ובחבילת המובייל. נדרשת בדיקה ב־iPhone פיזי לפני טענה לתאימות מלאה.
- **Hosted Chromium:** לא נעשה שינוי בגבולות אמון ה־TLS של סביבת הבדיקה. ה־Preview נבדק ב־WebKit; המסלול עם הסקה אמיתית נבדק מקומית ובחבילת המובייל, ולא מוצג כאימות הסקה ב־Preview.
- אינטגרציית `handstand-coach-demo` הנפרדת עדיין נכשלת בגלל `Root Directory "coach-app" does not exist`, כשל קיים. פרויקט המתאמן המיועד `handstand-lab-coach` במצב READY. לא שונתה הגדרת הפרויקט הישן.
- צילומי המקור ניתנו inline בשיחה; ההשוואה חזותית מול שתי הסקיצות הנראות, ולא דוח image-diff אוטומטי שלהן.

לא בוצעו Merge, שינוי ב־Production או הפעלת שירות בתשלום. לא נבנו מסכי אימון או תוכניות אימון.
