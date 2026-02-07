import fs from 'fs';
import crypto from 'crypto';

const version = crypto.randomBytes(4).toString('hex');
const buildTime = new Date().toISOString();

// Inject into service worker - replace placeholder OR existing version
let sw = fs.readFileSync('static/sw.js', 'utf-8');
sw = sw.replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`);
fs.writeFileSync('static/sw.js', sw);

// Inject into version.ts
let versionTs = fs.readFileSync('src/lib/version.ts', 'utf-8');
versionTs = versionTs.replace(/export const APP_VERSION = '[^']*';/, `export const APP_VERSION = '${version}';`);
versionTs = versionTs.replace(/export const BUILD_TIME = '[^']*';/, `export const BUILD_TIME = '${buildTime}';`);
fs.writeFileSync('src/lib/version.ts', versionTs);

console.log(`Version injected: ${version} (${buildTime})`);
