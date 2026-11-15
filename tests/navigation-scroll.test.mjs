import test from 'node:test';
import assert from 'node:assert/strict';
import {createRouteScroll} from '../vercel-app/navigation-scroll.js';
function browser() {
  const listeners = {}, frames = []; let id = 0;
  const win = {
    scrollX:0, scrollY:0,
    crypto:{randomUUID:()=>String(++id)},
    history:{state:{unrelated:'preserved'}, replaceState(state){this.state=state}},
    document:{addEventListener(){}},
    addEventListener(name, fn){listeners[name]=fn},
    requestAnimationFrame(fn){frames.push(fn)},
    scrollTo({left,top}){this.scrollX=left;this.scrollY=top},
  };
  const controller = createRouteScroll(win);
  return {win, controller, flush(){while(frames.length)frames.shift()()}, scroll(y){win.scrollY=y;listeners.scroll()}, hide(){listeners.pagehide()}};
}
test('history entries preserve independent scroll positions without changing application storage',()=>{
  const b=browser();b.controller.restore(b.controller.begin());b.flush();
  const first=b.win.history.state;assert.equal(first.unrelated,'preserved');b.scroll(350);
  b.win.history.state=null;b.controller.restore(b.controller.begin());b.flush();
  const second=b.win.history.state;b.scroll(80);
  b.win.history.state=first;b.controller.restore(b.controller.begin());b.flush();assert.equal(b.win.scrollY,350);
  b.win.history.state=second;b.controller.restore(b.controller.begin());b.flush();assert.equal(b.win.scrollY,80);
  b.win.history.state=null;b.controller.restore(b.controller.begin());b.flush();assert.equal(b.win.scrollY,0);
});
test('a pagehide snapshot survives document recreation and stale renders cannot restore old entries',()=>{
  const b=browser();b.controller.restore(b.controller.begin());b.flush();b.scroll(394);b.hide();
  const saved=b.win.history.state;const next=browser();next.win.history.state=saved;
  next.controller.restore(next.controller.begin());next.flush();assert.equal(next.win.scrollY,394);
  next.scroll(150);next.win.history.state=null;const stale=next.controller.begin();
  next.win.history.state=null;const current=next.controller.begin();
  next.controller.restore(stale);next.controller.restore(current);next.flush();assert.equal(next.win.scrollY,0);
});

test('same-URL entries and WebViews without randomUUID keep independent positions',()=>{
  const b=browser();b.win.crypto={};b.controller.restore(b.controller.begin());b.flush();b.scroll(350);
  const first=b.win.history.state;b.win.history.state=null;b.scroll(200);const second=b.win.history.state;
  assert.notEqual(first.movalytScrollEntry,second.movalytScrollEntry);
  b.win.history.state=first;b.controller.restore(b.controller.begin());b.flush();assert.equal(b.win.scrollY,350);
});
