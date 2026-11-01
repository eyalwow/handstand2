import {exerciseById} from './analysis-catalog.js';
export const LIBRARY_SELECTION_KEY='movalyt-library-selection-v1';
export function readLibrarySelection(storage){
  const raw=storage.getItem(LIBRARY_SELECTION_KEY);
  if(!raw)return {exerciseId:'handstand'};
  const value=JSON.parse(raw);
  if(value?.version!==1 || !exerciseById(value.exerciseId))throw Error('בחירה שמורה אינה זמינה. הנתונים לא שונו.');
  return {exerciseId:value.exerciseId};
}
export function saveLibrarySelection(storage,exerciseId){
  if(!exerciseById(exerciseId))throw Error('Unknown exercise');
  readLibrarySelection(storage); // Preserve corrupt or future schemas.
  storage.setItem(LIBRARY_SELECTION_KEY,JSON.stringify({version:1,exerciseId}));
}
