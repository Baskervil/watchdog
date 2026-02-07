import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import webpush from 'web-push';

const PROJECTS_FILE = './data/projects.json';
const SUBSCRIPTIONS_FILE = './data/subscriptions.json';

// Set VAPID keys
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
  deviceName: string;
}

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

async function sendAlert(title: string, body: string, url: string = '/') {
  const subs = await getSubscriptions();
  const payload = JSON.stringify({ title, body, url });
  
  await Promise.allSettled(
    subs.map(sub => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      )
    )
  );
}

// GET single project
export const GET: RequestHandler = async ({ params }) => {
  const projects = await getProjects();
  const project = projects.find(p => p.id === params.id);
  
  if (!project) {
    throw error(404, 'Project not found');
  }
  
  return json(project);
};

// PATCH update project
export const PATCH: RequestHandler = async ({ params, request }) => {
  const updates = await request.json();
  const projects = await getProjects();
  const index = projects.findIndex(p => p.id === params.id);
  
  if (index === -1) {
    throw error(404, 'Project not found');
  }
  
  const oldProject = projects[index];
  const newStatus = updates.status;
  
  // Check for status change
  const statusChanged = newStatus && oldProject.status !== newStatus && oldProject.status !== 'unknown';
  
  projects[index] = {
    ...oldProject,
    ...updates,
    updatedAt: Date.now(),
    lastStatusChange: statusChanged ? Date.now() : oldProject.lastStatusChange
  };
  
  await saveProjects(projects);
  
  // Send notification on status change
  if (statusChanged) {
    const project = projects[index];
    if (newStatus === 'down') {
      await sendAlert(
        `🔴 ${project.name} je NEDOSTUPNÝ`,
        `Služba ${project.url} nereaguje`,
        '/'
      );
    } else if (newStatus === 'up' && oldProject.status === 'down') {
      await sendAlert(
        `🟢 ${project.name} je SPÄŤ ONLINE`,
        `Služba ${project.url} opäť funguje`,
        '/'
      );
    }
  }
  
  return json(projects[index]);
};

// DELETE project
export const DELETE: RequestHandler = async ({ params }) => {
  const projects = await getProjects();
  const filtered = projects.filter(p => p.id !== params.id);
  
  if (filtered.length === projects.length) {
    throw error(404, 'Project not found');
  }
  
  await saveProjects(filtered);
  return json({ success: true });
};
