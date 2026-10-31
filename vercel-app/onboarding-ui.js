import { ANALYSIS_CATALOG, exerciseById } from "./analysis-catalog.js";
import {
  GOALS,
  readPreferences,
  savePreferences,
  browserPreferencesStorage,
} from "./onboarding-data.js";
import {
  icon,
  exerciseArtwork,
  exerciseCaption,
  statusBadge,
} from "./ui-elements.js";
const $ = (id) => document.getElementById(id);
const steps = [
  "onboardingWelcome",
  "onboardingGoals",
  "onboardingExercises",
  "onboardingExplain",
  "onboardingFinish",
];
export function createOnboarding({ onShow, onComplete }) {
  const initial = readPreferences(browserPreferencesStorage);
  let profile = initial.profile,
    error = initial.error,
    open = false,
    step = 0,
    sessionComplete = profile?.completed === true,
    draft;
  for (const goal of GOALS) {
    const label = document.createElement("label");
    label.className = "goal-card";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "goal";
    input.id = "goal-" + goal.id;
    input.value = goal.id;
    const copy = document.createElement("span"),
      title = document.createElement("strong"),
      description = document.createElement("small");
    title.textContent = goal.title;
    description.textContent = goal.description;
    copy.append(title, description);
    label.append(input, icon(goal.icon), copy);
    $("goalChoices").append(label);
    input.addEventListener("change", () => {
      draft.goal = goal.id;
      render();
    });
  }
  for (const exercise of ANALYSIS_CATALOG.filter(x=>!x.variation||x.id==='handstand')) {
    const label = document.createElement("label");
    label.className = "interest-card exercise-card";
    label.dataset.status = exercise.status;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "interest";
    input.value = exercise.id;
    input.id = "interest-" + exercise.id;
    input.setAttribute(
      "aria-label",
      exercise.name +
        " — תחום עניין" +
        (exercise.status === "available" ? "" : " — הניתוח בקרוב"),
    );
    label.append(
      input,
      exerciseArtwork(exercise),
      statusBadge(exercise),
      exerciseCaption(exercise),
    );
    $("interestChoices").append(label);
    input.addEventListener("change", () => {
      draft.interests = Array.from(
        document.querySelectorAll('input[name="interest"]:checked'),
        (node) => node.value,
      );
      renderFooter();
    });
  }
  function renderFooter() {
    $("onboardingHeader").hidden = step === 0;
    $("onboardingFooter").hidden = step === 0;
    $("onboardingStepLabel").textContent = step + 1 + " / " + steps.length;
    const progress = $("onboardingProgress");
    progress.replaceChildren();
    steps.forEach((_, index) => {
      const item = document.createElement("i");
      if (index === step) item.className = "active";
      progress.append(item);
    });
    const next = $("onboardingNext");
    next.disabled = step === 1 && !draft.goal;
    next.textContent =
      step === 4
        ? "לאפליקציה"
        : step === 2
          ? "המשך" +
            (draft.interests.length
              ? " · " + draft.interests.length + " תרגילים"
              : "")
          : "המשך";
    $("onboardingError").textContent = error || "";
  }
  function render() {
    steps.forEach((id, index) => ($(id).hidden = index !== step));
    document
      .querySelectorAll('input[name="goal"]')
      .forEach((input) => (input.checked = input.value === draft.goal));
    document
      .querySelectorAll('input[name="interest"]')
      .forEach(
        (input) => (input.checked = draft.interests.includes(input.value)),
      );
    if (step === 4) {
      $("onboardingSummary").textContent = draft.goal
        ? "הכיוון שבחרת: " + GOALS.find((goal) => goal.id === draft.goal).title
        : "מתחילים בצילום אחד ובמבט חדש על התנועה.";
      const chips = $("chosenInterests");
      chips.replaceChildren();
      for (const id of draft.interests) {
        const chip = document.createElement("span");
        chip.textContent = exerciseById(id).name;
        chips.append(chip);
      }
    }
    renderFooter();
    const heading = $(steps[step]).querySelector("h1");
    if (heading) heading.focus({ preventScroll: true });
    $(steps[step]).scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function finish(skipped = false) {
    const saved = savePreferences(browserPreferencesStorage, draft, {
      skipped,
    });
    profile = saved.profile || {
      ...draft,
      version: 1,
      completed: true,
      skipped,
    };
    error = saved.error;
    sessionComplete = true;
    open = false;
    onComplete({ profile, error });
  }
  function start() {
    draft = {
      goal: profile?.goal || null,
      interests: [...(profile?.interests || ["handstand"])],
    };
    open = true;
    step = 0;
    onShow();
    render();
  }
  $("welcomeStart").onclick = () => {
    step = 1;
    render();
  };
  $("welcomeSkip").onclick = () => finish(true);
  $("onboardingSkip").onclick = () => finish(true);
  $("onboardingBack").onclick = () => {
    step = Math.max(0, step - 1);
    render();
  };
  $("onboardingNext").onclick = () => {
    if (step === 1 && !draft.goal) return;
    if (step === 4) finish();
    else {
      step++;
      render();
    }
  };
  document.querySelectorAll("[data-onboarding-skip]").forEach((link) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      finish(true);
    }),
  );
  return {
    start,
    get isOpen() {
      return open;
    },
    get needsIntroduction() {
      return !sessionComplete;
    },
    get preferences() {
      return profile;
    },
    get storageError() {
      return error;
    },
  };
}
export async function renderOnboardingPose() {
  try {
    const response = await fetch("./assets/campaign/onboarding-pose.json");
    if (!response.ok) throw Error();
    const data = await response.json(),
      svg = $("onboardingPose"),
      ns = svg.namespaceURI;
    svg.replaceChildren();
    svg.removeAttribute("hidden");
    const point = (i) =>
      data.landmarks[i]?.visibility >= 0.5 ? data.landmarks[i] : null;
    for (const [a, b] of [
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
    ]) {
      const p = point(a),
        q = point(b);
      if (!p || !q) continue;
      const line = document.createElementNS(ns, "line");
      for (const [key, value] of Object.entries({
        x1: p.x * 1024,
        y1: p.y * 1536,
        x2: q.x * 1024,
        y2: q.y * 1536,
        stroke: "#c4ff64",
        "stroke-width": 7,
        "stroke-linecap": "round",
      }))
        line.setAttribute(key, value);
      svg.append(line);
    }
    for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      const p = point(i);
      if (!p) continue;
      const circle = document.createElementNS(ns, "circle");
      for (const [key, value] of Object.entries({
        cx: p.x * 1024,
        cy: p.y * 1536,
        r: 10,
        fill: "#c4ff64",
      }))
        circle.setAttribute(key, value);
      svg.append(circle);
    }
  } catch {
    $("onboardingPose").setAttribute("hidden", "");
  }
}
