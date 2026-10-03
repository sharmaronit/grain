import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const directory = process.argv[2];
if (!directory) throw new Error('Pass the built CSS directory.');
const files = (await readdir(directory)).filter(file => file.endsWith('.css'));
if (!files.length) throw new Error(`No compiled CSS found in ${directory}.`);
let checked = 0;
for (const file of files) {
  const css = await readFile(join(directory, file), 'utf8');
  for (const [, selector, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(?:^|;)\s*-webkit-backdrop-filter\s*:/.test(declarations)) continue;
    if (!/(?:^|;)\s*backdrop-filter\s*:/.test(declarations)) {
      throw new Error(`${file}: ${selector.trim()} lost standard backdrop-filter; Chromium cannot render this blur. Put the standard property after the Safari prefix.`);
    }
    checked++;
  }
}
if (!checked) throw new Error('No glass declarations found in compiled CSS.');
console.log(`Glass CSS verified: ${checked} rules retain standard backdrop-filter.`);
