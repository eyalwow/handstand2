import { GOALS, LEVELS, LIBRARY, generatePlan } from "./training-core.js";

export const ACTIVE_KEY = "handstand-lab-active-workout-v1";
export const TRAINING_KEY = "handstand-lab-training-ui-v1";
const validDate = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const validSelection = (items, id) => items.some(item => item.id === id);

export function createWorkout({goal="handstand", level="beginner", day="A"} = {}, now=Date.now(), id=globalThis.crypto.randomUUID()) {
  if (!validSelection(GOALS,goal)) goal = "handstand";
  if (!validSelection(LEVELS,level)) level = "beginner";
  const plan = generatePlan(goal,level);
  const workout = plan.find(item => item.id === day) || plan[0];
  return {
    version:1, id, goal, level, day:workout.id, name:workout.name,
    startedAt:new Date(now).toISOString(), finishedAt:null, currentExercise:0, restEndsAt:null,
    exercises:workout.list.map(item => ({...item, completed:Array(item.sets).fill(false)}))
  };
}

// Reject corrupt sessions without overwriting the original or silently resetting progress.
export function validateWorkout(value) {
  if (!value || value.version !== 1 || typeof value.id !== "string" || !value.id || value.id.length > 100 ||
      !validSelection(GOALS,value.goal) || !validSelection(LEVELS,value.level) || !["A","B","C"].includes(value.day) ||
      typeof value.name !== "string" || value.name.length > 200 || !validDate(value.startedAt) ||
      !(value.finishedAt === null || (validDate(value.finishedAt) && Date.parse(value.finishedAt) >= Date.parse(value.startedAt))) ||
      !(value.restEndsAt === null || (Number.isFinite(value.restEndsAt) && value.restEndsAt >= 0)) ||
      !Array.isArray(value.exercises) || !value.exercises.length || value.exercises.length > 18 ||
      !Number.isInteger(value.currentExercise) || value.currentExercise < 0 || value.currentExercise >= value.exercises.length) return null;
  if (!value.exercises.every(ex => ex && Object.hasOwn(LIBRARY,ex.id) && Number.isInteger(ex.sets) && ex.sets > 0 && ex.sets <= 12 &&
      typeof ex.target === "string" && ex.target.length < 100 && Number.isFinite(ex.rest) && ex.rest >= 0 && ex.rest <= 600 &&
      Array.isArray(ex.completed) && ex.completed.length === ex.sets && ex.completed.every(done => typeof done === "boolean"))) return null;
  if (new Set(value.exercises.map(ex => ex.id)).size !== value.exercises.length) return null;
  return value;
}

export function workoutSummary(workout, now=Date.now()) {
  const setResults = workout.exercises.map(ex => ({id:ex.id, completedSets:ex.completed.filter(Boolean).length, plannedSets:ex.sets, target:ex.target}));
  return {
    setResults,
    completedSets:setResults.reduce((sum,ex) => sum + ex.completedSets,0),
    totalSets:setResults.reduce((sum,ex) => sum + ex.plannedSets,0),
    completedExercises:setResults.filter(ex => ex.completedSets === ex.plannedSets).length,
    totalExercises:setResults.length,
    seconds:Math.max(0,Math.floor(((workout.finishedAt ? Date.parse(workout.finishedAt) : now) - Date.parse(workout.startedAt))/1000))
  };
}

export function changeWorkout(workout, action, now=Date.now()) {
  if (workout.finishedAt) return workout;
  const next = structuredClone(workout);
  const exercise = next.exercises[next.currentExercise];
  if (action.type === "set") {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= exercise.sets || typeof action.done !== "boolean") throw new Error("Invalid set");
    exercise.completed[action.index] = action.done;
  } else if (action.type === "exercise") {
    if (!Number.isInteger(action.index) || action.index < 0 || action.index >= next.exercises.length) throw new Error("Invalid exercise");
    next.currentExercise = action.index;
  } else if (action.type === "rest") {
    next.restEndsAt = now + exercise.rest*1000;
  } else if (action.type === "skip-rest") {
    next.restEndsAt = null;
  } else if (action.type === "finish") {
    if (!workoutSummary(next,now).completedSets) throw new Error("Complete at least one set");
    next.finishedAt = new Date(Math.max(now,Date.parse(next.startedAt))).toISOString();
    next.restEndsAt = null;
  } else throw new Error("Invalid action");
  return next;
}

export function remainingRest(workout, now=Date.now()) {
  return workout.restEndsAt === null ? 0 : Math.max(0,Math.ceil((workout.restEndsAt-now)/1000));
}

export function readTraining(storage) {
  const raw = storage.getItem(TRAINING_KEY);
  if (raw === null) return {goal:"handstand",level:"beginner",day:"A",sessions:[]};
  const data = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.sessions)) throw new Error("Invalid training history");
  return data;
}

export function readWorkout(storage) {
  const raw = storage.getItem(ACTIVE_KEY);
  if (raw === null) return null;
  const value = validateWorkout(JSON.parse(raw));
  if (!value) throw new Error("Invalid saved workout");
  return value;
}

export function saveWorkout(storage, workout) {
  if (!validateWorkout(workout)) throw new Error("Invalid workout");
  storage.setItem(ACTIVE_KEY,JSON.stringify(workout));
}

// Keep the finished session available for recovery and summary until the next explicit start.
// Retry after an interrupted history write never duplicates the session.
export function saveFinishedWorkout(storage, workout) {
  if (!workout.finishedAt || !validateWorkout(workout)) throw new Error("Invalid finished workout");
  const data = readTraining(storage);
  if (data.sessions.some(item => item && item.id === workout.id)) return;
  const summary = workoutSummary(workout);
  const record = {
    id:workout.id, date:workout.finishedAt, startedAt:workout.startedAt,
    name:workout.name, goal:workout.goal, level:workout.level, day:workout.day,
    minutes:Math.round(summary.seconds/60),
    exercises:summary.setResults.filter(ex => ex.completedSets > 0).map(ex => ex.id),
    setResults:summary.setResults
  };
  storage.setItem(TRAINING_KEY,JSON.stringify({...data,sessions:[...data.sessions,record]}));
}
