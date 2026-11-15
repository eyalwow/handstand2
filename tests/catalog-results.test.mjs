import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogResultsLabel} from '../vercel-app/analysis-library-ui.js';
test('catalog counter describes matches separately from the complete library',()=>{
  assert.equal(catalogResultsLabel(0,159,{query:'absent'}),'0 התאמות');
  assert.equal(catalogResultsLabel(1,159,{query:'front lever'}),'התאמה אחת');
  assert.equal(catalogResultsLabel(2,159,{filter:'supported'}),'2 התאמות');
  assert.equal(catalogResultsLabel(20,159,{filter:'skills'}),'20 התאמות');
  assert.equal(catalogResultsLabel(131,159,{filter:'all'}),'131 תרגילים ומשפחות · 159 אפשרויות בספרייה כולה');
});
