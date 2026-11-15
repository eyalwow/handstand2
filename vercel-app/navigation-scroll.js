// Scroll belongs to a browser history entry, not to a route name. Two visits
// to #catalog may have different positions. No application storage is touched.
export function createRouteScroll(win = window) {
  const key = 'movalytScrollEntry';
  const positions = new Map();
  let nextId = 0;
  const session = Date.now().toString(36);
  const newId = () => win.crypto?.randomUUID?.() || `movalyt-${session}-${++nextId}`;
  let activeId = null, activeUrl = null, restoring = false, revision = 0;
  win.history.scrollRestoration = 'manual';
  const record = () => {
    if (!activeId || restoring || win.location?.href !== activeUrl) return;
    // Same-URL fragment navigation may create a state-less entry without a
    // hashchange. Stamp that entry before recording its own scroll position.
    const state = win.history.state || {};
    if (!state[key]) {
      activeId = newId();
      win.history.replaceState({...state, [key]:activeId}, '');
    }
    positions.set(activeId, {x:win.scrollX, y:win.scrollY});
  };
  win.addEventListener('scroll', record, {passive:true});
  win.document.addEventListener('click', event => {
    if (event.target.closest?.('a[href]')) record();
  }, true);
  win.addEventListener('pagehide', () => {
    record();
    if (activeId && win.history.state?.[key] === activeId)
      win.history.replaceState({...win.history.state, movalytScrollPosition:positions.get(activeId)}, '');
  });
  return {
    begin() {
      const state = win.history.state || {};
      const id = state[key] || newId();
      const previous = positions.get(id) || state.movalytScrollPosition;
      // Re-entrant rendering of the same entry is a new screen transition, not Back.
      const target = id !== activeId && previous ? {...previous} : {x:0,y:0};
      if (!state[key]) win.history.replaceState({...state, [key]:id}, '');
      activeId = id;
      activeUrl = win.location?.href;
      restoring = true;
      return {id, target, revision:++revision};
    },
    restore(entry) {
      win.requestAnimationFrame(() => {
        if (entry.revision !== revision) return;
        win.scrollTo({left:entry.target.x, top:entry.target.y, behavior:'instant'});
        restoring = false;
        record();
      });
    },
  };
}
