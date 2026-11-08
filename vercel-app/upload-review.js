// UI review before dispatching the existing engine's unchanged file-change handler.
// Files/object URLs live only in memory; no upload, storage or inference happens here.
import {selectedExerciseId} from './analysis-selection.js';
const $=id=>document.getElementById(id),preview=$('uploadPreview'),review=$('uploadReview'),start=$('startReviewedAnalysis');
let approvedInput=null,pendingInput=null,objectURL=null,selection=null,revision=0;
function clearReview(preserveInput=null){
  revision++;preview.pause();preview.removeAttribute('src');preview.load();
  if(objectURL)URL.revokeObjectURL(objectURL);
  objectURL=null;if(pendingInput&&pendingInput!==preserveInput)pendingInput.value='';pendingInput=null;
  start.disabled=true;review.hidden=true;$('uploadReviewStatus').textContent='';
  delete review.dataset.state;$('replaceUpload').hidden=true;
}
function reviewError(message){
  preview.pause();preview.removeAttribute('src');preview.load();
  review.hidden=false;review.dataset.state='error';start.disabled=true;
  $('uploadReviewStatus').textContent=message;$('replaceUpload').hidden=false;
}
// Presentation only: the engine owns outcomes, values and storage.
export function finishUploadReview(outcome){
  if(['scored','unreliable'].includes(outcome))return;
  const message=$('status').textContent;
  clearReview();
  if(outcome!=='cancelled'){
    reviewError(message);$('status').textContent='';
    requestAnimationFrame(()=>{
      if(location.hash==='#analyze')$('replaceUpload').focus({preventScroll:true});
    });
  }
}
$('replaceUpload').addEventListener('click',()=>$('file').click());
for(const id of ['file','cameraFile'])$(id).addEventListener('change',event=>{
  if(approvedInput===event.currentTarget){approvedInput=null;return;}
  event.stopImmediatePropagation();
  const input=event.currentTarget,file=input.files?.[0];if(!file)return;
  clearReview(input);pendingInput=input;selection=selectedExerciseId();const token=revision;
  review.hidden=false;$('uploadFileLabel').textContent=file.name;
  if(!file.size || (file.type && !file.type.startsWith('video/'))){reviewError('יש לבחור קובץ וידאו תקין. נסה סרטון MP4 שמתנגן במכשיר.');return;}
  $('uploadReviewStatus').textContent='בודקים שאפשר לנגן את הסרטון…';
  objectURL=URL.createObjectURL(file);preview.src=objectURL;
  preview.onloadedmetadata=()=>{
    if(token!==revision)return;
    const valid=Number.isFinite(preview.duration)&&preview.duration>0&&preview.duration<=120&&preview.videoWidth>0;
    start.disabled=!valid;
    if(!valid){reviewError('יש לבחור סרטון תקין באורך של עד שתי דקות.');return;}
    $('uploadReviewStatus').textContent=`הסרטון מוכן · ${preview.duration.toFixed(1)} שנ׳. אפשר לצפות בו לפני הניתוח.`;
  };
  preview.onerror=()=>{if(token===revision&&review.dataset.state!=='error')reviewError('לא ניתן לנגן את הקובץ. נסה לשמור עותק MP4 תואם ולבחור אותו שוב.');};
},true);
start.addEventListener('click',()=>{
  if(start.disabled||!pendingInput)return;
  if(selection!==selectedExerciseId()){clearReview();return;}
  if(selection!=='handstand'&&!$('frontLeverSideView').checked){$('uploadReviewStatus').textContent='לפני ההמשך יש לאשר צילום צד יציב לניתוח הניסיוני.';$('frontLeverSideView').focus();return;}
  preview.pause();start.disabled=true;approvedInput=pendingInput;
  pendingInput.dispatchEvent(new Event('change',{bubbles:true}));
});
$('discardUpload').addEventListener('click',clearReview);
$('exerciseSelect').addEventListener('change',clearReview);
window.addEventListener('hashchange',()=>{
  preview.pause();
  if(selection && selection!==selectedExerciseId())clearReview();
  if(location.hash==='#analyze'&&pendingInput?.files?.length)start.disabled=!Number.isFinite(preview.duration)||preview.duration<=0||preview.duration>120;
});
window.addEventListener('pagehide',clearReview);
