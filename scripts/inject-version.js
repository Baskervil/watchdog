import fs from 'fs';
import crypto from 'crypto';

const version = crypto.randomBytes(4).toString('hex');
const buildTime = new Date().toISOString();

// Inject into service worker
let sw = fs.readFileSync('static/sw.js', 'utf-8');
sw = sw.replace('{{VERSION}}', version);
fs.writeFileSync('static/sw.js', sw);

// Inject into version.ts (will be compiled into build)
let versionTs = fs.readFileSync('src/lib/version.ts', 'utf-8');
versionTs = versionTs.replace('__BUILD_VERSION__', version);
versionTs = versionTs.replace('__BUILD_TIME__', buildTime);
fs.writeFileSync('src/lib/version.ts', versionTs);

console.log(`Version injected: ${version} (${buildTime})`);
