import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
for (const [label, name] of [['problem', 'Problem Statement PM1.1'], ['backlog', 'Backlog · Blacksburg Eats']]) {
 const doc = await getDocument({data:new Uint8Array(readFileSync(`C:/Users/nagab/Downloads/${name}.pdf`)),useSystemFonts:true}).promise;
 for(let n=1;n<=doc.numPages;n++) {
  const page=await doc.getPage(n), viewport=page.getViewport({scale:1.4});
  const canvas=createCanvas(viewport.width,viewport.height);
  await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  writeFileSync(`tmp/pdfs/${label}-${n}.png`,canvas.toBuffer('image/png'));
 }
}
