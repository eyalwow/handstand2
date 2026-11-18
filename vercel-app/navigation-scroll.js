// Per-entry navigation metadata only: no workout/analysis data or media.
// The tab cache survives document replacement, including reload where a
// pagehide-only history snapshot can arrive too late for the new document.
export const NAVIGATION_CACHE_KEY = 'movalyt-navigation-v1';
export function createRouteScroll(win = window, {captureView = () => null, restoreView = () => {}} = {}) {
  const key = 'movalytScrollEntry', records = new Map();
  const validPosition = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.y >= 0;
  try {
    const cached = JSON.parse(win.sessionStorage?.getItem(NAVIGATION_CACHE_KEY) || 'null');
    if (cached?.version === 1 && Array.isArray(cached.entries))
      for (const entry of cached.entries.slice(-64))
        if (typeof entry.id === 'string' && typeof entry.url === 'string' && validPosition(entry.position)) records.set(entry.id, entry);
  } catch { /* Navigation still works using history state if tab storage is unavailable. */ }
  let nextId = 0, active = null, pending = null, revision = 0, timer = null;
  const session = Date.now().toString(36);
  const newId = () => win.crypto?.randomUUID?.() || `movalyt-${session}-${++nextId}`;
  const state = () => win.history.state || {};
  const href = () => win.location?.href;
  const replace = value => { try { win.history.replaceState(value, ''); } catch { /* Preserve the tab cache. */ } };
  const saveCache = () => {
    while (records.size > 64) records.delete(records.keys().next().value);
    try { win.sessionStorage?.setItem(NAVIGATION_CACHE_KEY, JSON.stringify({version:1, entries:[...records.values()]})); } catch { /* No user records are replaced. */ }
  };
  const flush = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (!active || pending || href() !== active.url || state()[key] !== active.id) return;
    const entry = records.get(active.id);
    if (entry) replace({...state(), movalytScrollPosition:entry.position, movalytScrollView:entry.view});
  };
  const record = (immediate = false) => {
    if (!active || pending || href() !== active.url) return;
    if (!state()[key]) {
      // A same-URL link can create a distinct entry without hashchange.
      active = {id:newId(), url:href()};
      replace({...state(), [key]:active.id});
    }
    if (state()[key] !== active.id) return;
    records.delete(active.id);
    records.set(active.id, {...active, position:{x:win.scrollX, y:win.scrollY}, view:captureView()});
    saveCache();
    if (immediate) flush();
    else if (timer === null) timer = setTimeout(() => { timer = null; flush(); }, 500);
  };
  win.history.scrollRestoration = 'manual';
  win.addEventListener('scroll', () => record(), {passive:true});
  win.addEventListener('scrollend', () => record(true));
  for (const event of ['input','change','toggle']) win.document.addEventListener(event, () => record(), true);
  win.document.addEventListener('click', event => {
    if (event.target.closest?.('a[href]')) record(true);
  }, true);
  win.document.addEventListener('visibilitychange', () => { if (win.document.hidden) record(true); });
  win.addEventListener('pagehide', () => record(true));
  win.addEventListener('pageshow', event => { if (event.persisted) record(true); });
  return {
    begin() {
      const current = state(), url = href();
      let id = current[key];
      const fresh = !id || (active?.id === id && active.url !== url);
      if (fresh) { id = newId(); replace({...current, [key]:id, movalytScrollPosition:null, movalytScrollView:null}); }
      if (active?.id === id && active.url === url) {
        if (pending) return pending;
        record();
        // Rendering the current entry preserves the live position, not zero.
        return pending = {id, url, target:{x:win.scrollX,y:win.scrollY}, revision};
      }
      if (timer !== null) { clearTimeout(timer); timer = null; }
      const cached = records.get(id);
      const previous = cached && cached.url === url ? cached : fresh ? null : {position:current.movalytScrollPosition, view:current.movalytScrollView};
      active = {id, url};
      pending = {id, url, target:validPosition(previous?.position) ? {...previous.position} : {x:0,y:0}, revision:++revision};
      restoreView(previous?.view);
      return pending;
    },
    restore(entry) {
      if (pending !== entry || entry.scheduled) return;
      entry.scheduled = true;
      win.requestAnimationFrame(() => {
        if (pending !== entry || entry.revision !== revision) return;
        win.scrollTo({left:entry.target.x, top:entry.target.y, behavior:'instant'});
        pending = null;
        record(true);
      });
    },
  };
}
