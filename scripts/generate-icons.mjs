import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icons/icon.svg');
const outDir = path.resolve('public/icons');

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192x192.png'));
  console.log('✓ Generated icon-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512x512.png'));
  console.log('✓ Generated icon-512x512.png');

  // maskable 512x512 (with padding for maskable area)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#1e1b4b'
    })
    .png()
    .toFile(path.join(outDir, 'maskable-icon-512x512.png'));
  console.log('✓ Generated maskable-icon-512x512.png');

  // Apple touch icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');
}

generate().catch(console.error);

