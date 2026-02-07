import sharp from 'sharp';

const sizes = [
  { size: 32, name: 'favicon.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' }
];

async function createIcons() {
  const input = 'static/watchdog-logo.jpg';
  
  for (const { size, name } of sizes) {
    await sharp(input)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(`static/${name}`);
    console.log(`Created static/${name} (${size}x${size})`);
  }
  
  // Create ICO-style favicon
  await sharp(input)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile('static/favicon.png');
  
  console.log('\nAll icons created from logo!');
}

createIcons().catch(console.error);
