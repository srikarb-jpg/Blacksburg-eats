import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('tmp/pdfs', { recursive: true });
for (const name of ['Problem Statement PM1.1', 'Backlog · Blacksburg Eats']) {
  const pdf = await getDocument({ data: new Uint8Array(readFileSync(`C:/Users/nagab/Downloads/${name}.pdf`)), useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += `\nPAGE ${i}\n` + content.items.map(x => x.str + (x.hasEOL ? '\n' : ' ')).join('');
  }
  writeFileSync(`tmp/pdfs/${name}.txt`, text);
  console.log(`DOCUMENT: ${name}\n${text}`);
}
