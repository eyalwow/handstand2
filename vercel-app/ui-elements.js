export function icon(name) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  node.classList.add("icon");
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(node.namespaceURI, "use");
  use.setAttribute("href", "#i-" + name);
  node.append(use);
  return node;
}
export function exerciseArtwork(exercise) {
  if (exercise.artwork) {
    const image = document.createElement("img");
    Object.assign(image, {
      src: exercise.artwork.src,
      alt: exercise.artwork.alt,
      width: exercise.artwork.width,
      height: exercise.artwork.height,
      loading: "lazy",
      decoding: "async",
    });
    return image;
  }
  const placeholder = document.createElement("span");
  placeholder.className = "exercise-art-placeholder";
  placeholder.append(
    icon(
      exercise.category === "core"
        ? "angle"
        : exercise.category === "strength"
          ? "bolt"
          : "pose",
    ),
  );
  return placeholder;
}
export function exerciseCaption(exercise) {
  const wrap = document.createElement("span");
  wrap.className = "exercise-caption";
  const title = document.createElement("strong");
  title.textContent = exercise.name;
  const english = document.createElement("small");
  english.textContent = exercise.english;
  english.dir = "ltr";
  wrap.append(title, english);
  return wrap;
}
export function statusBadge(exercise) {
  const badge = document.createElement("span");
  badge.className = "exercise-status " + exercise.status;
  badge.textContent = exercise.status === "available" ? "ניתוח זמין" : "בקרוב";
  return badge;
}
