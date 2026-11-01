import {analysisFor} from './analysis-registry.js';
import {readLibrarySelection} from './library-state.js';
let selected='handstand';
try{const saved=readLibrarySelection(globalThis.localStorage).exerciseId;if(analysisFor(saved,{allowExperimental:true}))selected=saved;}catch{}
export const selectedExerciseId=()=>selected;
export function selectExercise(id) {
  if(!analysisFor(id,{allowExperimental:true}))return false;
  selected=id;return true;
}
