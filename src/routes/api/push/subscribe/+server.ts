import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

const SUBSCRIPTIONS_FILE = './data/subscriptions.json';

interface Subscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceName: string;
  createdAt: number;
}

async function ensureDataDir() {
  const dir = path.dirname(SUBSCRIPTIONS_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
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
  await ensureDataDir();
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { subscription, deviceName } = await request.json();
    
    if (!subscription?.endpoint) {
      return json({ error: 'Invalid subscription' }, { status: 400 });
    }
    
    const subs = await getSubscriptions();
    
    // Remove existing subscription with same endpoint
    const filtered = subs.filter(s => s.endpoint !== subscription.endpoint);
    
    // Add new subscription
    filtered.push({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceName: deviceName || 'Unknown',
      createdAt: Date.now()
    });
    
    await saveSubscriptions(filtered);
    
    return json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return json({ error: 'Failed to save subscription' }, { status: 500 });
  }
};
