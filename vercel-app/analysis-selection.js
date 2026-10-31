import {analysisFor} from './analysis-registry.js';
let selected='handstand';
export const selectedExerciseId=()=>selected;
export function selectExercise(id) {
  if(!analysisFor(id,{allowExperimental:true}))return false;
  selected=id;return true;
}
