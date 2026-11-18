import test from 'node:test';
import assert from 'node:assert/strict';
import {createRouteScroll} from '../vercel-app/navigation-scroll.js';
let uuid = 0;
function browser() {
  const listeners = {}, frames = [];
  const win = {
    scrollX:0, scrollY:0, location:{href:'http://test/#catalog'},
    crypto:{randomUUID:()=>String(++uuid)},
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

test('duplicate initialization and repeated renders preserve the restoration target',()=>{
  const b=browser();b.win.history.state={movalytScrollEntry:'saved',movalytScrollPosition:{x:0,y:350},foreign:42};
  const first=b.controller.begin(),duplicate=b.controller.begin();
  assert.equal(duplicate,first);assert.equal(first.target.y,350);
  b.controller.restore(first);b.controller.restore(duplicate);b.flush();assert.equal(b.win.scrollY,350);
  b.controller.restore(b.controller.begin());b.flush();assert.equal(b.win.scrollY,350);assert.equal(b.win.history.state.foreign,42);
});
test('older entries and view state survive a new controller without a pagehide snapshot',()=>{
  const memory=new Map(),sessionStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const b=browser();b.win.sessionStorage=sessionStorage;
  b.controller.restore(b.controller.begin());b.flush();b.scroll(470);const first={...b.win.history.state};
  b.win.history.state=null;b.controller.restore(b.controller.begin());b.flush();b.scroll(520);
  const next=browser();next.win.sessionStorage=sessionStorage;next.win.history.state=first;
  // Recreate the controller after installing tab storage, like a new document.
  const c=createRouteScroll(next.win);c.restore(c.begin());next.flush();assert.equal(next.win.scrollY,470);
  let view={query:'lever',filter:'all'},restored;
  next.win.history.state=null;const d=createRouteScroll(next.win,{captureView:()=>view,restoreView:value=>restored=value});
  d.restore(d.begin());next.flush();next.win.scrollY=300;
  d.restore(d.begin());next.flush();const saved={...next.win.history.state};
  const reload=createRouteScroll(next.win,{restoreView:value=>restored=value});
  next.win.history.state=saved;reload.restore(reload.begin());next.flush();assert.deepEqual(restored,view);
});
test('unavailable navigation storage and malformed metadata preserve application state',()=>{
  const b=browser();Object.defineProperty(b.win,'sessionStorage',{get(){throw Error('blocked')}});
  b.win.history.state={movalytScrollEntry:'saved',movalytScrollPosition:{x:0,y:394},foreign:'kept'};
  const c=createRouteScroll(b.win);c.restore(c.begin());b.flush();assert.equal(b.win.scrollY,394);assert.equal(b.win.history.state.foreign,'kept');
  b.win.history.state={movalytScrollEntry:'bad',movalytScrollPosition:{x:0,y:'oops'}};c.restore(c.begin());b.flush();assert.equal(b.win.scrollY,0);
});
