// Library-only crops of reviewed stills. Original art remains in every other view.
import {ANALYSIS_MEDIA, approvedMedia, analysisMediaFigure} from './analysis-media.js';
const CATALOG_STILLS = new Set(['handstand-corrected', 'full-front-lever', 'full-planche', 'pull-up', 'muscle-up', 'dip', 'l-sit', 'v-sit', 'push-up']);
export function catalogArtwork(id) {
  const figure = analysisMediaFigure(id);
  const media = approvedMedia(ANALYSIS_MEDIA[id]);
  const stem = media?.image.split('/').pop().replace(/\.webp$/, '');
  if (CATALOG_STILLS.has(stem)) {
    // Keep the reviewed alt text, loading policy and error placeholder.
    figure.querySelector('img').src = `./assets/catalog/${stem}.webp`;
  }
  return figure;
}
