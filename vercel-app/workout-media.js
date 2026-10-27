import { FITNESS_WORKOUT, fitnessFigure } from "./fitness-art.js";
import { LIBRARY } from "./training-core.js";

// Reuse verified artwork only where the movement and equipment match.
// Remaining plan movements have local, explicitly schematic pose illustrations.
export const WORKOUT_MEDIA = {
  push:{slug:"push-up"}, pull:{slug:"pull-up"}, squat:{slug:"bodyweight-squat"},
  plank:{slug:"plank"}, inclinePush:{slug:"incline-push-up"}, pike:{slug:"pike-push-up"},
  row:{slug:"inverted-row",variant:"חתירה במוט נמוך"},
  hollow:{slug:"hollow-body-hold"}, sidePlank:{slug:"side-plank"},
  hangingKnee:{slug:"hanging-knee-raise"}, bridge:{slug:"glute-bridge"},
  wrist:{pose:"wrist"}, wall:{pose:"wall"}, wallKick:{pose:"wallKick"}, toePull:{pose:"toePull"},
  pullAssisted:{pose:"pullAssisted"}, negativePull:{pose:"negativePull"},
  dipAssisted:{pose:"dipAssisted"}, dip:{pose:"dip"}, lunge:{pose:"lunge"},
  split:{pose:"split"}, calf:{pose:"calf"}, shoulder:{pose:"shoulder"},
  diamond:{pose:"diamond"}, superman:{pose:"superman"}
};
const NS = "http://www.w3.org/2000/svg";
function svgElement(tag, attrs={}) {
  const el = document.createElementNS(NS,tag);
  for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,String(value));
  return el;
}
// Each polyline is a limb or trunk; dashed lines identify support, not body parts.
const poses = {
  wrist:{head:[100,64],lines:["110,88 155,110 170,175 205,175","110,88 100,130 100,175 120,175","155,110 205,145 205,175 235,175"],support:"75,181 265,181"},
  wall:{head:[152,146],lines:["162,130 164,86 164,35 178,35","162,130 140,153 140,180","162,130 185,153 185,180"],support:"186,20 186,180"},
  wallKick:{head:[126,145],lines:["140,130 180,94 200,35","140,130 120,157 120,180","140,130 151,156 151,180","180,94 228,140 248,160"],support:"210,20 210,180",arrow:"256,140 240,105 227,78"},
  toePull:{head:[150,146],lines:["162,130 164,85 174,35","162,130 139,155 139,180","162,130 185,153 185,180"],support:"193,20 193,180",arrow:"189,35 174,35 158,35"},
  pullAssisted:{head:[158,63],lines:["160,84 160,128 143,165 124,174","160,128 184,154 190,174","160,84 127,70 118,35","160,84 190,70 201,35"],support:"90,30 228,30 M111,181 208,181 M111,181 111,193 M208,181 208,193"},
  negativePull:{head:[158,45],lines:["160,66 160,112 153,158 163,178","160,66 128,75 120,35","160,66 195,75 204,35"],support:"90,30 228,30",arrow:"245,65 245,105 245,145"},
  dipAssisted:{head:[135,45],lines:["139,66 142,113 190,143 205,176","139,66 108,91 116,119","139,66 168,91 179,119"],support:"90,123 132,123 M160,123 205,123 M105,123 105,190 M195,123 195,190"},
  dip:{head:[150,46],lines:["151,67 155,117 185,145 161,173","151,67 123,92 128,119","151,67 183,92 180,119"],support:"100,123 143,123 M164,123 207,123 M112,123 112,190 M196,123 196,190"},
  lunge:{head:[145,41],lines:["149,62 150,110 106,135 106,179 85,179","150,110 199,140 221,179 242,179","149,68 125,89 146,107"],arrow:"178,191 212,191 247,191"},
  split:{head:[145,41],lines:["149,62 150,110 106,135 106,179 85,179","150,110 199,140 221,179 242,179","149,68 125,89 146,107"],arrow:"267,90 267,120 267,150"},
  calf:{head:[156,34],lines:["156,55 156,110 157,160 169,178 178,178","156,70 190,90 213,90"],support:"220,25 220,180",arrow:"115,173 115,152 115,131"},
  shoulder:{head:[159,81],lines:["148,102 105,133 89,178","148,102 177,112 214,90","105,133 149,145 163,178"],support:"220,25 220,180"},
  diamond:{head:[100,105],lines:["119,116 180,131 255,160","119,116 127,145 143,177","119,116 151,145 143,177"],support:"75,182 275,182"},
  superman:{head:[95,126],lines:["111,136 166,149 225,135 254,125","118,137 84,118 65,105"],support:"60,181 274,181"}
};
export function createSchematic(id) {
  const pose = poses[id];
  if (!pose) return null;
  const svg = svgElement("svg",{viewBox:"0 0 320 210",role:"img","aria-label":"איור סכמטי: " + LIBRARY[id].name});
  const title = svgElement("title");
  title.textContent = "איור סכמטי: " + LIBRARY[id].name;
  svg.append(title);
  svg.append(svgElement("path",{d:"M45 185 H280",stroke:"#516154","stroke-width":2}));
  if (pose.support) svg.append(svgElement("path",{d:"M"+pose.support,fill:"none",stroke:"#8a9d8b","stroke-width":4,"stroke-dasharray":"7 4"}));
  const body = svgElement("g",{fill:"none",stroke:"#b6ff4a","stroke-width":6,"stroke-linecap":"round","stroke-linejoin":"round"});
  body.append(svgElement("circle",{cx:pose.head[0],cy:pose.head[1],r:12}));
  for (const points of pose.lines) body.append(svgElement("polyline",{points}));
  svg.append(body);
  if (pose.arrow) {
    const points = pose.arrow.split(" ").map(pair => pair.split(",").map(Number));
    const [x,y] = points.at(-1), [px,py] = points.at(-2);
    const angle = Math.atan2(y-py,x-px);
    svg.append(svgElement("polyline",{points:pose.arrow,fill:"none",stroke:"#e1eddb","stroke-width":3}));
    svg.append(svgElement("polyline",{points:[x-10*Math.cos(angle-.5),y-10*Math.sin(angle-.5),x,y,x-10*Math.cos(angle+.5),y-10*Math.sin(angle+.5)].reduce((s,n,i)=>s+(i%2 ? "," : i ? " " : "")+n,""),fill:"none",stroke:"#e1eddb","stroke-width":3}));
  }
  return svg;
}
function text(tag,value) {
  const el = document.createElement(tag);
  el.textContent = value;
  return el;
}
export function renderWorkoutMedia(container,id) {
  // Avoid replacing a loaded illustration after each set or timer update.
  if (container.dataset.exercise === id) return;
  container.dataset.exercise = id;
  container.replaceChildren();
  if (FITNESS_WORKOUT[id]) { container.append(fitnessFigure(FITNESS_WORKOUT[id],LIBRARY[id].name,"workout")); return; }
  const media = WORKOUT_MEDIA[id];
  const figure = document.createElement("figure");
  const schematic = () => {
    const svg = createSchematic(id);
    if (svg) figure.replaceChildren(svg,text("figcaption","איור תנוחה סכמטי בלבד. היעזרו בהנחיה הכתובה; האיור אינו מציג את התנועה המלאה."));
    else figure.replaceChildren(text("figcaption","האיור לא נטען. אפשר להמשיך לפי ההנחיה הכתובה."));
  };
  if (media?.slug) {
    const image = document.createElement("img");
    image.src = "./assets/exercises/" + media.slug + "/frame-1.svg";
    image.alt = "איור התרגיל: " + (media.variant || LIBRARY[id].name);
    image.width = 320;
    image.height = 250;
    image.addEventListener("error",schematic,{once:true});
    const caption = text("figcaption",(media.variant ? "האפשרות המוצגת: " + media.variant + ". " : "") + "איור להמחשה: Workout Guide / Everkinetic · ");
    const credit = text("a","מקור ורישיון CC BY-SA 4.0");
    credit.href = "./assets/exercises/ATTRIBUTION.md";
    caption.append(credit);
    figure.append(image,caption);
  } else schematic();
  container.append(figure);
}
