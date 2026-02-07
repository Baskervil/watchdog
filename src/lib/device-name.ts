const adjectives = ['Rýchly', 'Tichý', 'Modrý', 'Zelený', 'Statočný', 'Bystrý', 'Šikovný', 'Múdry'];
const nouns = ['Vlk', 'Orol', 'Medveď', 'Líška', 'Jeleň', 'Sokol', 'Rys', 'Jazvec'];

function generateName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

export function getDeviceName(): string {
  if (typeof localStorage === 'undefined') return 'Server';
  
  let name = localStorage.getItem('watchdog-device-name');
  if (!name) {
    name = generateName();
    localStorage.setItem('watchdog-device-name', name);
  }
  return name;
}

export function regenerateDeviceName(): string {
  const name = generateName();
  localStorage.setItem('watchdog-device-name', name);
  return name;
}
