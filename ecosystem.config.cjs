module.exports = {
  apps: [{
    name: 'watchdog',
    script: 'build/index.js',
    cwd: '/home/pravaruka/clawd/projects/watchdog',
    env: {
      NODE_ENV: 'production',
      PORT: 4012,
      ORIGIN: 'https://watchdog.pk01.sk',
      VAPID_PUBLIC_KEY: 'BIXWS3_zdgcXaIkRcVWfNYdlIJllAmDFFS4uKy30R_f71lslDRj7TmMZTCZ4716IAfT1gQunJSMPlJ4US_cBC_8',
      VAPID_PRIVATE_KEY: 'NUynK-AglPbgNflKI_n1x-7mZpn7eOuGePdjaug2sGo',
      VAPID_EMAIL: 'mailto:peter@pk01.sk'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M'
  }]
};
