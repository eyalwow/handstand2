import { GOALS, LEVELS, LIBRARY, generatePlan } from './training-core.js';
import { readTraining, readWorkout } from './workout-core.js';

// Read the existing training data; opening Home never writes or seeds storage.
const byId = id => document.getElementById(id);
function renderHome() {
  let training;
  try { training = readTraining(localStorage); }
  catch { byId('home-plan-note').textContent = 'לא ניתן לקרוא את התוכנית השמורה. אפשר לפתוח את התוכנית ולבדוק את האחסון.'; return; }
  const saved = training;
  training = {...saved,
    goal:GOALS.some(x => x.id === saved.goal) ? saved.goal : 'handstand',
    level:LEVELS.some(x => x.id === saved.level) ? saved.level : 'beginner',
    day:['A','B','C'].includes(saved.day) ? saved.day : 'A',
    sessions:saved.sessions.filter(x => x && Number.isFinite(Date.parse(x.date)) && Array.isArray(x.exercises))};
  const day = generatePlan(training.goal, training.level).find(item => item.id === training.day);
  byId('feature-title').textContent = day.name;
  byId('home-plan-focus').textContent = day.focus;
  byId('home-plan-meta').textContent = `${GOALS.find(x => x.id === training.goal).label} · ${LEVELS.find(x => x.id === training.level).label} · אימון ${day.id}`;
  const list = byId('home-exercises'); list.replaceChildren();
  for (const exercise of day.list.slice(0,3)) {
    const row = document.createElement('li');
    const name = document.createElement('span'); name.textContent = LIBRARY[exercise.id].name;
    const dose = document.createElement('small'); dose.textContent = `${exercise.sets} × ${exercise.target}`;
    row.append(name,dose); list.append(row);
  }
  const link = byId('home-start');
  link.href = './workout.html?' + new URLSearchParams({start:'1',goal:training.goal,level:training.level,day:day.id});
  link.textContent = 'התחלת אימון';
  try {
    const active = readWorkout(localStorage);
    if (active && !active.finishedAt) { link.href='./workout.html'; link.textContent='המשך האימון השמור'; }
  } catch { /* Keep the plan link; never overwrite an unreadable active workout. */ }
  const count = training.sessions.length;
  byId('home-session-count').textContent = count;
  byId('home-progress').textContent = count ? `${count} אימונים ביומן. אפשר לראות את פירוט התרגול והמדידות.` : 'האימון הראשון שלך הוא נקודת ההתחלה.';
  byId('home-plan-note').textContent = `${day.list.length} תרגילים בתוכנית · ניתן להתאים לרמה ולמטרה שלך.`;
  byId('home-analysis-history').textContent = 'אין עדיין מדידה שמורה.';
  try {
    const raw = JSON.parse(localStorage.getItem('handstand-lab-analyses-v1') || '[]');
    const entries = Array.isArray(raw) ? raw.filter(x => x && typeof x.model === 'string' && Number.isFinite(x.score) && x.score>=0 && x.score<=100 && Number.isFinite(Date.parse(x.date))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)) : [];
    if (entries.length) byId('home-analysis-history').textContent = `${Math.round(entries[0].score)} / 100 · ${new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'short'}).format(new Date(entries[0].date))}`;
  } catch { /* Missing/corrupt history is never presented as a measured score. */ }
}
renderHome();
window.addEventListener('storage',renderHome);
window.addEventListener('hashchange',renderHome);
window.addEventListener('pageshow',renderHome);
