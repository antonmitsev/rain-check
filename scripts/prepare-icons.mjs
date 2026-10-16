import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const source = await readFile(new URL('../public/icons/app-icon.svg', import.meta.url));
const destination = new URL('../public/icons/', import.meta.url);
await mkdir(destination, { recursive: true });

// iOS Home Screen does not reliably use manifest.webmanifest icons.
// Generate an opaque, 180×180 apple-touch-icon.png explicitly from the
// same vector artwork as the standard PWA icons on every production build.
for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['favicon-32.png', 32]
]) {
  const svg = new Resvg(source, {
    fitTo: { mode: 'width', value: size }
  });
  const png = svg.render().asPng();
  await writeFile(new URL(name, destination), png);
}
console.log('Generated RainCheck PNG icons: 180, 192, 512 and favicon 32.');
