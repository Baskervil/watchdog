module.exports = {
  apps: [{
    name: 'watchdog',
    script: 'build/index.js',
    cwd: '/home/pravaruka/clawd/projects/watchdog',
    env: {
      NODE_ENV: 'production',
      PORT: 4012,
      ORIGIN: 'https://watchdog.pk01.sk',
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
      VAPID_EMAIL: 'mailto:peter@pk01.sk'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M'
  }]
};
