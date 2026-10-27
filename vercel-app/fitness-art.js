// Original AI-generated art direction study, seven exact movements only.
// Muscle colors are illustrative emphasis, not a validated activation map.
export const FITNESS_ART = {
  "מתח באחיזה עילית":"pull-up", "שכיבות סמיכה":"push-up",
  "סקוואט משקל גוף":"squat", "דיפס במקבילים":"dip",
  "L-sit ברגליים ישרות":"l-sit", "החזקת הולו":"hollow"
};
export const FITNESS_WORKOUT = {pull:"pull-up",push:"push-up",squat:"squat",dip:"dip",hollow:"hollow"};
const staticHolds = new Set(["l-sit","hollow","wall"]);
export function fitnessFigure(slug,name,context="detail",doc=document) {
  const figure=doc.createElement("figure");
  figure.className="fitness-art fitness-art--"+context;
  const frames=doc.createElement("div");
  frames.className="fitness-art-frames";
  const count=context==="card" || staticHolds.has(slug) ? 1 : 2;
  for(let i=1;i<=count;i++) {
    const panel=doc.createElement("div");
    const image=doc.createElement("img");
    // Cards show the loaded/held position; details retain natural left-to-right order.
    const frame=context==="card" && !staticHolds.has(slug) ? 2 : i;
    image.src="./assets/fitness/"+slug+"-"+(context==="card" ? "card" : frame)+".jpg";
    image.alt=name+" — "+(staticHolds.has(slug) ? "מבט "+frame : frame===1 ? "תנוחת התחלה" : "תנוחת סיום");
    image.loading=context==="workout" ? "eager" : "lazy";
    image.decoding="async";
    image.width=context==="card" ? 320 : 512;
    image.height=context==="card" ? 240 : 384;
    panel.append(image);
    if(context!=="card"){
      const label=doc.createElement("span");
      label.textContent=staticHolds.has(slug) ? "מבט "+frame : frame===1 ? "התחלה" : "סיום";
      panel.append(label);
    }
    frames.append(panel);
  }
  figure.append(frames);
  if(context!=="card"){
    const caption=doc.createElement("figcaption");
    caption.textContent="המחשה מקורית · הדגשת שרירים כללית להמחשה בלבד";
    figure.append(caption);
  }
  return figure;
}
