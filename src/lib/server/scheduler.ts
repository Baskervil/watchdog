import fs from 'fs/promises';
import webpush from 'web-push';

const PROJECTS_FILE = './data/projects.json';
const SUBSCRIPTIONS_FILE = './data/subscriptions.json';

// VAPID setup
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface Project {
  id: string;
  name: string;
  url: string;
  healthEndpoint?: string;
  checkInterval: number;
  status: 'up' | 'down' | 'unknown';
  lastCheck?: number;
  lastStatusChange?: number;
  responseTime?: number;
  createdAt: number;
  updatedAt?: number;
}

interface Subscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

async function getProjects(): Promise<Project[]> {
  try {
    const data = await fs.readFile(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveProjects(projects: Project[]) {
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

async function getSubscriptions(): Promise<Subscription[]> {
  try {
    const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function sendAlert(title: string, body: string) {
  const subs = await getSubscriptions();
  const payload = JSON.stringify({ title, body, url: '/' });
  
  await Promise.allSettled(
    subs.map(sub => 
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
    )
  );
}

async function checkUrl(url: string): Promise<{ ok: boolean; responseTime: number; statusCode?: number }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Watchdog/1.0' }
    });
    
    clearTimeout(timeout);
    
    // Consider 2xx and 3xx as OK (redirects mean server is alive)
    const isOk = response.status >= 200 && response.status < 400;
    
    return {
      ok: isOk,
      responseTime: Date.now() - startTime,
      statusCode: response.status
    };
  } catch {
    return {
      ok: false,
      responseTime: Date.now() - startTime
    };
  }
}

async function runChecks() {
  if (isRunning) return;
  isRunning = true;
  
  try {
    const projects = await getProjects();
    const now = Date.now();
    let hasChanges = false;
    
    for (const project of projects) {
      const lastCheck = project.lastCheck || 0;
      const interval = project.checkInterval * 60 * 1000;
      
      // Skip if checked recently
      if (now - lastCheck < interval) continue;
      
      const url = project.healthEndpoint || project.url;
      const result = await checkUrl(url);
      
      const newStatus = result.ok ? 'up' : 'down';
      const statusChanged = project.status !== newStatus && project.status !== 'unknown';
      
      project.status = newStatus;
      project.responseTime = result.responseTime;
      project.lastCheck = now;
      project.updatedAt = now;
      
      if (statusChanged) {
        project.lastStatusChange = now;
        
        // Send push notification
        if (newStatus === 'down') {
          await sendAlert(
            `🔴 ${project.name} je NEDOSTUPNÝ`,
            `Služba ${project.url} nereaguje`
          );
          console.log(`[Watchdog] ALERT: ${project.name} is DOWN`);
        } else {
          await sendAlert(
            `🟢 ${project.name} je SPÄŤ ONLINE`,
            `Služba ${project.url} opäť funguje`
          );
          console.log(`[Watchdog] RECOVERED: ${project.name} is UP`);
        }
      }
      
      hasChanges = true;
    }
    
    if (hasChanges) {
      await saveProjects(projects);
    }
  } catch (err) {
    console.error('[Watchdog] Check error:', err);
  } finally {
    isRunning = false;
  }
}

export function startScheduler() {
  if (intervalId) return;
  
  console.log('[Watchdog] Server-side monitoring started');
  
  // Run immediately
  runChecks();
  
  // Then every 60 seconds
  intervalId = setInterval(runChecks, 60000);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Watchdog] Server-side monitoring stopped');
  }
}
