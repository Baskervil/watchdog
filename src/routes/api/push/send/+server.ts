import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import webpush from 'web-push';
import fs from 'fs/promises';

const SUBSCRIPTIONS_FILE = './data/subscriptions.json';

// Set VAPID keys from environment
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface Subscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName: string;
}

async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSubscriptions(subs: Subscription[]) {
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { title, body, url, deviceName } = await request.json();
    
    if (!title) {
      return json({ error: 'Missing title' }, { status: 400 });
    }
    
    const subs = await getSubscriptions();
    const targets = deviceName 
      ? subs.filter(s => s.deviceName === deviceName)
      : subs;
    
    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || '/'
    });
    
    const results = await Promise.allSettled(
      targets.map(sub => 
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )
      )
    );
    
    // Remove failed subscriptions (expired)
    const failedEndpoints = new Set<string>();
    results.forEach((result, i) => {
      if (result.status === 'rejected' && result.reason?.statusCode === 410) {
        failedEndpoints.add(targets[i].endpoint);
      }
    });
    
    if (failedEndpoints.size > 0) {
      const updated = subs.filter(s => !failedEndpoints.has(s.endpoint));
      await saveSubscriptions(updated);
    }
    
    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return json({ sent, failed, total: targets.length });
  } catch (err) {
    console.error('Send push error:', err);
    return json({ error: 'Failed to send notifications' }, { status: 500 });
  }
};
