// Premium Fitness Anatomy — MOVALYT. Only reviewed, local assets may render.
import { ANALYSIS_CATALOG } from './analysis-catalog.js';
export const MEDIA_STYLE = 'Premium Fitness Anatomy — MOVALYT';
const REVIEW_CHECKS=Object.freeze(['same-athlete','anatomy','support','camera','grayscale','rights']);
export const ANALYSIS_MEDIA = Object.freeze(Object.fromEntries(ANALYSIS_CATALOG.map(x=>[x.id,Object.freeze({
  id:x.id, style:MEDIA_STYLE, status:'pending-review', image:null, animation:null,
  alt:x.name, pose:x.definition || x.name,
  review:REVIEW_CHECKS,
})])));
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
  if(!media){
    const mark=document.createElement('span');mark.className='anatomy-monogram';mark.textContent='M';mark.setAttribute('aria-hidden','true');
    const caption=document.createElement('figcaption');caption.textContent='איור מקצועי ממתין לאישור';figure.append(mark,caption);return figure;
  }
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(motion && !reduced && media.animation){
    const video=document.createElement('video');video.src=media.animation.src;video.poster=media.image;
    video.controls=true;video.muted=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-label',media.alt);figure.append(video);
  }else{
    const img=document.createElement('img');Object.assign(img,{src:media.image,alt:media.alt,loading:'lazy',decoding:'async',width:640,height:400});figure.append(img);
  }
  return figure;
}
