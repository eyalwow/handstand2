// Premium Fitness Anatomy — MOVALYT. Only reviewed, local assets may render.
import { ANALYSIS_CATALOG } from './analysis-catalog.js';
export const MEDIA_STYLE = 'Premium Fitness Anatomy — MOVALYT';
const REVIEW_CHECKS=Object.freeze(['same-athlete','anatomy','support','camera','grayscale','rights']);
// Approved stills from PR #37's ready manifest. Family cards keep their placeholders.
const APPROVED_STILLS = new Map(Object.entries({
  'planche-full-band': 'banded-full-planche',
  'front-lever-full-band': 'banded-full-front-lever',
  'front-lever-one-leg': 'one-leg-front-lever',
  'front-lever-full': 'full-front-lever',
  'planche-one-leg': 'one-leg-planche',
  'planche-super-advanced-tuck': 'super-advanced-tuck-planche',
  'v-sit': 'v-sit',
  'l-sit-tuck': 'tuck-l-sit',
  'l-sit-full': 'l-sit',
  'planche-straddle': 'straddle-planche',
  'front-lever-tuck': 'tuck-front-lever',
  'front-lever-super-advanced-tuck': 'super-advanced-tuck-front-lever',
  'planche-full': 'full-planche',
  'planche-tuck': 'tuck-planche',
  'muscle-up': 'muscle-up',
  'l-sit-one-leg': 'one-leg-l-sit',
  'planche-advanced-tuck': 'advanced-tuck-planche',
  'handstand': 'handstand',
  'pull-up': 'pull-up',
  'dip': 'dip',
  'push-up': 'push-up',
}));
const STILL_APPROVALS = Object.freeze(Object.fromEntries(REVIEW_CHECKS.map(key => [key, true])));
export const ANALYSIS_MEDIA = Object.freeze(Object.fromEntries(ANALYSIS_CATALOG.map(exercise => {
  const still = APPROVED_STILLS.get(exercise.id);
  return [exercise.id, Object.freeze({
    id: exercise.id,
    style: MEDIA_STYLE,
    status: still ? 'approved' : 'pending-review',
    image: still ? `./assets/anatomy/${still}.webp` : null,
    animation: null,
    alt: exercise.name,
    pose: exercise.definition || exercise.name,
    review: REVIEW_CHECKS,
    ...(still && {approvals: STILL_APPROVALS}),
  })];
})));
const local = path => typeof path==='string' && /^\.\/assets\/anatomy\/[a-z0-9/-]+\.(webp|avif|mp4|webm)$/.test(path) && !path.includes('..');
export function approvedMedia(asset) {
  if(!asset || asset.status!=='approved' || !REVIEW_CHECKS.every(key=>asset.approvals?.[key]===true)) return null;
  if(!local(asset.image) || !/\.(webp|avif)$/.test(asset.image))return null;
  const a=asset.animation;
  return {image:asset.image,alt:asset.alt,animation:a?.approved===true && local(a.src) && /\.(mp4|webm)$/.test(a.src) && a.seconds>=2 && a.seconds<=4?a:null};
}
export function analysisMediaFigure(id, {motion=false}={}) {
  const figure=document.createElement('figure');figure.className='anatomy-media';
  const asset=ANALYSIS_MEDIA[id],media=approvedMedia(asset);
  function showPlaceholder(){
    const mark=document.createElement('span');mark.className='anatomy-monogram';mark.textContent='M';mark.setAttribute('aria-hidden','true');
    const caption=document.createElement('figcaption');caption.textContent='איור מקצועי ממתין לאישור';figure.replaceChildren(mark,caption);
  }
  if(!media){
    showPlaceholder();
    return figure;
  }
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(motion && !reduced && media.animation){
    const video=document.createElement('video');video.src=media.animation.src;video.poster=media.image;
    video.controls=true;video.muted=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-label',media.alt);figure.append(video);
  }else{
    const img=document.createElement('img');
    img.addEventListener('error', showPlaceholder, {once:true});
    Object.assign(img,{alt:media.alt,loading:'lazy',decoding:'async',src:media.image});
    figure.append(img);
  }
  return figure;
}
