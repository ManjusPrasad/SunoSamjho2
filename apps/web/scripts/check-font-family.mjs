import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [html, css, tailwindConfig] = await Promise.all([
  readFile(path.join(appRoot, 'index.html'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'index.css'), 'utf8'),
  readFile(path.join(appRoot, 'tailwind.config.cjs'), 'utf8'),
]);

const loadedFamilies = [...html.matchAll(/fonts\.googleapis\.com\/css2\?family=([^"'&]+)/g)]
  .map(([, family]) => decodeURIComponent(family.replaceAll('+', ' ')));

if (loadedFamilies.length !== 1 || !loadedFamilies[0].startsWith('Open Sans:')) {
  throw new Error('The app must load exactly one Google Font family: Open Sans.');
}

if (!/--font-sans:\s*'Open Sans'/.test(css) || !/--font-mono:\s*'Open Sans'/.test(css)) {
  throw new Error('CSS sans and mono font tokens must both use Open Sans.');
}

for (const alias of ['sans', 'mono', 'serif']) {
  const family = new RegExp(`${alias}:\\s*\\['Open Sans',\\s*'sans-serif'\\]`);
  if (!family.test(tailwindConfig)) {
    throw new Error(`Tailwind ${alias} font alias must use Open Sans.`);
  }
}

console.log('Font family check passed: Open Sans is the only configured family.');
