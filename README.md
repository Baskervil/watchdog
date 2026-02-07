# 🐕 Watchdog

Monitoring a alertovanie projektov s push notifikáciami.

## Funkcie

- **Dashboard** - prehľad všetkých projektov a ich stavu
- **Health checks** - automatická kontrola dostupnosti
- **Push notifikácie** - multiplatformové alerty (iOS, Android, Desktop)
- **Offline support** - PWA s offline prístupom

## Setup

```bash
# Install dependencies
npm install

# Generate VAPID keys for push notifications
npm run generate-vapid

# Create .env from example and add keys
cp .env.example .env

# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | Public key for push notifications |
| `VAPID_PRIVATE_KEY` | Private key for push notifications |
| `VITE_VAPID_PUBLIC_KEY` | Same as public key (for client) |
| `VAPID_EMAIL` | Contact email for push service |
| `PORT` | Server port (default: 4012) |

## API

### POST /api/push/send

Send push notification to subscribed devices.

```json
{
  "title": "🔴 Project Down",
  "body": "example.com is not responding",
  "url": "/",
  "deviceName": "optional-specific-device"
}
```

### GET /api/check?url=https://example.com

Check if URL is accessible.

## Production

```bash
# Build
npm run build

# PM2
pm2 start ecosystem.config.cjs
```

## Port

Production: 4012
Domain: watchdog.pk01.sk
