# הפעלת Gemini לכל משתמשי Handstand Lab — בלי מפתח לכל מתאמן

מצב נוכחי: קוד ה־Firebase AI Logic מוכן בענף `feat/shared-firebase-gemini`, אך **Gemini עדיין אינו פעיל**. האפליקציה ממשיכה להציג משוב מבוסס מדידות מקומי.

## מה בעל האתר צריך לעשות פעם אחת

1. להיכנס ל־https://console.firebase.google.com/ עם חשבון Google וליצור פרויקט בשם Handstand Lab (או שם דומה). לבחור **Spark / No-cost** בלי להפעיל Billing. Google Analytics לא נדרש.
2. בקונסול Firebase לבחור **AI Services → AI Logic → Get started**, לבחור **Gemini Developer API** (לא Agent Platform/Vertex AI), ולהשלים את האשף.
3. להוסיף **Web app** לפרויקט. להעתיק את **firebaseConfig** מהגדרות הפרויקט — זו תצורת Web ציבורית שמותר לשלב באתר. היא איננה מפתח סודי של Gemini.
4. תחת **Security → App Check**, לרשום את אפליקציית ה־Web באמצעות **reCAPTCHA Enterprise**. להוסיף את הדומיין `eyalwow.github.io` לרשימת הדומיינים המורשים בקונסול Google (שם דומיין בלבד, בלי נתיב `/handstand2/preview/`).
5. לוודא ש־**Firebase AI Logic App Check** מופעל במצב **Enforced**. לא לבטל אותו כדי לעקוף שגיאות.
6. לשלוח למפתח *רק* את ה־`firebaseConfig` הציבורי ואת ה־**reCAPTCHA Enterprise site key** הציבורי, או להכניס את שניהם לקובץ `preview/firebase-config.js`. **לא לשלוח Gemini API key, מפתח שירות, reCAPTCHA secret או debug token**.
7. לאחר עדכון `firebase-config.js`, לבצע מיזוג/פרסום ובדיקת וידאו אמיתית. לוודא שהתג בדוח משתנה ל־`Gemini AI`, וששום משתמש אינו מתבקש להכניס מפתח.
8. לעקוב אחר המכסות ב־Firebase וב־Google AI Studio. החינם מוגבל — אם מגיעים למכסה, הממשק עובר אוטומטית למשוב מדידות מקומי.

## מה עושה הקוד

- `preview/firebase-gemini.js`: משתמש ב־Firebase AI Logic עם `GoogleAIBackend`, דרך Google-managed proxy וב־App Check עם `ReCaptchaEnterpriseProvider`.
- `preview/ai-feedback.js`: מייצר משוב מתוך מדידות אמיתיות, שולח ל־Gemini רק JSON של מדדי זוויות ותנועה, ומאמת שכל תרגיל נמצא בקטלוג המומלץ. לא שולח קובץ וידאו.
- `preview/firebase-config.js`: מחכה לפרטי הפרויקט הציבוריים. עד שהם מוגדרים, Gemini אינו מופעל באתר, והמשוב המקומי נשאר זמין.
- כל משתמש מקבל משוב AI אוטומטי ברגע שהחיבור המשותף מוגדר — **בלי להיכנס לחשבון Google ובלי להקליד מפתח**.

## אבטחה ועלויות

- אין להכניס Gemini secret אל JavaScript ציבורי, GitHub או שדה קלט בדפדפן.
- יש להשאיר App Check פעיל כדי להפחית שימוש לרעה. הוא לא הבטחה נגד כל סוג ניצול; המשך ניטור המכסות חשוב.
- Firebase AI Logic ללא עלות שירות בפני עצמו; Gemini Developer API כולל מסלול ללא תשלום לפרויקטים זכאים, עם מכסות. reCAPTCHA Essentials מאפשר עד 10,000 הערכות בחודש ללא תשלום כשאין חיוב, ולאחר מכן הבקשות נחסמות. הזמינות בפועל כפופה לתנאי Google.
- שימוש במסלול Free יכול לשמש את Google לשיפור מוצרים; חשוב להציג הודעת פרטיות למשתמשים ולשלוח רק את נתוני התנועה הנדרשים.
- לפי הנחיות Firebase, App Check נדרש ל־AI Logic — יש להשתמש במפתח reCAPTCHA Enterprise ציבורי של אתר אמיתי.

מקורות:
- https://firebase.google.com/docs/ai-logic/get-started?api=web
- https://firebase.google.com/docs/ai-logic/pricing
- https://firebase.google.com/docs/ai-logic/app-check
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
