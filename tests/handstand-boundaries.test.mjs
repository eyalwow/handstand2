import test from 'node:test';
import assert from 'node:assert/strict';
const node = () => ({
  children: [],
  append(...children) { this.children.push(...children); },
  replaceChildren() { this.children = []; },
});
const nodes = new Map();
const originalDocument = globalThis.document;
globalThis.document = {
  getElementById(id) {
    if (id === 'revokeCloudConsent') return null;
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  },
  createElement: node,
};
const {holdBoundaryNote, renderHandstandInsights} = await import('../vercel-app/handstand-insights-ui.js');
test.after(() => { globalThis.document = originalDocument; });

test('names the uncertain measurement boundary while keeping the sampled range', () => {
  const interval = {start: 47.53, end: 49.83};
  for (const [startObserved, endObserved, uncertain] of [
    [true, true, ''],
    [false, true, 'תחילת ההחזקה לא נקבעה בביטחון.'],
    [true, false, 'סוף ההחזקה לא נקבע בביטחון.'],
    [false, false, 'תחילת ההחזקה וסופה לא נקבעו בביטחון.'],
  ]) {
    const note = holdBoundaryNote({...interval, startObserved, endObserved});
    const range = 'הדגימות שנכללו במדידה הן מ־47.5 עד 49.8 שנ׳ בסרטון.';
    assert.equal(note, uncertain ? range + ' ' + uncertain : range);
  }
});

test('an entry score cannot display a short hold candidate as measured time', () => {
  const candidate = {start: 2, end: 3, seconds: 1, startObserved: true, endObserved: false};
  renderHandstandInsights(
    {hold: candidate, ascent: {score: 65}},
    {evidence: [], drills: []},
    null,
  );
  assert.deepEqual(nodes.get('holdDuration').children.map(child => child.textContent),
    ['רצף החזקה שנמדד', 'לא נמדד בביטחון']);
});