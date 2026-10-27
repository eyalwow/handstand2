import {mkdir,copyFile} from 'node:fs/promises';
await mkdir(new URL('./public/',import.meta.url),{recursive:true});
for(const file of ['index.html','style.css','app.js','store.js'])await copyFile(new URL(file,import.meta.url),new URL('public/'+file,import.meta.url));
await copyFile(new URL('../vercel-app/exercise-library.js',import.meta.url),new URL('public/catalog.js',import.meta.url));
