import fs from 'fs';

// Simple 1x1 colored PNG in base64 (placeholder icons)
// In production, replace with actual dog/watchdog icons

const sizes = [192, 512];

// Create a simple SVG and convert to PNG using canvas-like approach
// For now, create placeholder text files that can be replaced
for (const size of sizes) {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a2e" rx="${size * 0.15}"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="${size * 0.5}" font-family="Arial">🐕</text>
</svg>`;
  
  fs.writeFileSync(`static/icon-${size}.svg`, svgContent);
  console.log(`Created static/icon-${size}.svg`);
}

// Create simple favicon SVG
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#1a1a2e" rx="4"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-size="20" font-family="Arial">🐕</text>
</svg>`;
fs.writeFileSync('static/favicon.svg', faviconSvg);
console.log('Created static/favicon.svg');

console.log('\\nNote: For PNG icons, use an online SVG to PNG converter or add sharp package');
