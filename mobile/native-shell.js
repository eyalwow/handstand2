// Loaded only by the packaged athlete app. No engine/pose/scoring hooks.
// The native bridge is injected by Capacitor before page scripts execute.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelector('video#v')?.pause();
});

// Android Back/exit keeps Capacitor's platform behavior; no App plugin or
// listener is added here. Hash-route behavior still needs device testing.
// Do not persist blob URLs: the existing history stores summaries only.
