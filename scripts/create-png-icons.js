import sharp from 'sharp';
import fs from 'fs';

const sizes = [32, 192, 512];

async function createIcons() {
  for (const size of sizes) {
    const svgBuffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#1a1a2e" rx="${Math.round(size * 0.15)}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size * 0.35}" fill="#3b82f6"/>
      <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="${size * 0.4}" fill="white" font-family="Arial, sans-serif">W</text>
    </svg>`);
    
    const filename = size === 32 ? 'favicon.png' : `icon-${size}.png`;
    await sharp(svgBuffer).png().toFile(`static/${filename}`);
    console.log(`Created static/${filename}`);
  }
}

createIcons().catch(console.error);
