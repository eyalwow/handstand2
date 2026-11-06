import {ANALYSIS_MEDIA, approvedMedia, analysisMediaFigure} from './analysis-media.js';
const CATALOG = new Set(['handstand-corrected','full-front-lever','full-planche','pull-up','muscle-up','dip','l-sit','v-sit','push-up']);
// All are deterministic crops of the existing reviewed sources, never new poses.
export function presentationArtwork(id) {
  const figure = analysisMediaFigure(id);
  const media = approvedMedia(ANALYSIS_MEDIA[id]);
  if (media) {
    const name = media.image.split('/').pop();
    figure.querySelector('img').src = `./assets/${CATALOG.has(name.replace(/\.webp$/, '')) ? 'catalog' : 'presentation'}/${name}`;
  }
  return figure;
}
