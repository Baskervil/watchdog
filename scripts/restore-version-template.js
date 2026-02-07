import fs from 'fs';

// Restore version.ts template for git
const template = `// Auto-generated at build time
export const APP_VERSION = '__BUILD_VERSION__';
export const BUILD_TIME = '__BUILD_TIME__';
`;

fs.writeFileSync('src/lib/version.ts', template);

// Restore sw.js template
let sw = fs.readFileSync('static/sw.js', 'utf-8');
// Replace any 8-char hex version with placeholder
sw = sw.replace(/watchdog-[a-f0-9]{8}/, 'watchdog-{{VERSION}}');
sw = sw.replace(/const CACHE_VERSION = '[a-f0-9]{8}'/, "const CACHE_VERSION = '{{VERSION}}'");
fs.writeFileSync('static/sw.js', sw);

console.log('Version templates restored');
