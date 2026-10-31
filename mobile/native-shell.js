// Loaded only by the packaged athlete app. No engine/pose/scoring hooks.
// The native bridge is injected by Capacitor before page scripts execute.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) document.querySelector('video#v')?.pause();
});

// Keep Back in Android's existing WebView history. At the root the normal
// platform behavior applies; no listener overrides the OS exit gesture.
// Do not persist blob URLs: the existing history stores summaries only.
