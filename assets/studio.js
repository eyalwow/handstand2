// Presentation only. Pose detection, scores and replay remain in index.html.
(() => {
  const file = document.getElementById("file");
  const zone = document.getElementById("dropzone");
  const selected = document.getElementById("selectedFile");
  const name = document.getElementById("fileName");
  file.addEventListener("change", () => {
    const video = file.files[0];
    if (!video) return;
    name.textContent = video.name;
    selected.hidden = false;
  });
  let dragDepth = 0;
  zone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  zone.addEventListener("dragleave", () => {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      zone.classList.remove("dragover");
    }
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    zone.classList.remove("dragover");
    const video = e.dataTransfer?.files[0];
    if (!video) return;
    if (!video.type.startsWith("video/")) {
      document.getElementById("status").textContent =
        "זה לא קובץ וידאו. בחרו סרטון כדי להתחיל בניתוח.";
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(video);
    file.files = transfer.files;
    file.dispatchEvent(new Event("change", { bubbles: true }));
  });
})();
