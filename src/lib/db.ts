import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Project {
  id: string;
  name: string;
  url: string;
  healthEndpoint?: string;
  checkInterval: number; // minutes
  status: 'up' | 'down' | 'unknown';
  lastCheck?: number;
  lastStatusChange?: number;
  responseTime?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Alert {
  id: string;
  projectId: string;
  type: 'down' | 'slow' | 'recovered';
  message: string;
  createdAt: number;
  acknowledged: boolean;
}

interface WatchdogDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { 'by-status': string };
  };
  alerts: {
    key: string;
    value: Alert;
    indexes: { 'by-project': string; 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<WatchdogDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WatchdogDB>('watchdog', 1, {
      upgrade(db) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-status', 'status');
        
        const alertStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertStore.createIndex('by-project', 'projectId');
        alertStore.createIndex('by-date', 'createdAt');
      }
    });
  }
  return dbPromise;
}

// Projects
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  return db.getAll('projects');
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

export async function saveProject(project: Partial<Project>): Promise<Project> {
  const db = await getDB();
  const now = Date.now();
  
  const fullProject: Project = {
    id: project.id || crypto.randomUUID(),
    name: project.name || 'Nový projekt',
    url: project.url || '',
    healthEndpoint: project.healthEndpoint,
    checkInterval: project.checkInterval || 5,
    status: project.status || 'unknown',
    lastCheck: project.lastCheck,
    lastStatusChange: project.lastStatusChange,
    responseTime: project.responseTime,
    createdAt: project.createdAt || now,
    updatedAt: now
  };
  
  await db.put('projects', fullProject);
  return fullProject;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
  // Delete related alerts
  const alerts = await db.getAllFromIndex('alerts', 'by-project', id);
  for (const alert of alerts) {
    await db.delete('alerts', alert.id);
  }
}

// Alerts
export async function getAllAlerts(): Promise<Alert[]> {
  const db = await getDB();
  const alerts = await db.getAll('alerts');
  return alerts.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getProjectAlerts(projectId: string): Promise<Alert[]> {
  const db = await getDB();
  return db.getAllFromIndex('alerts', 'by-project', projectId);
}

export async function saveAlert(alert: Partial<Alert>): Promise<Alert> {
  const db = await getDB();
  
  const fullAlert: Alert = {
    id: alert.id || crypto.randomUUID(),
    projectId: alert.projectId || '',
    type: alert.type || 'down',
    message: alert.message || '',
    createdAt: alert.createdAt || Date.now(),
    acknowledged: alert.acknowledged || false
  };
  
  await db.put('alerts', fullAlert);
  return fullAlert;
}

export async function acknowledgeAlert(id: string): Promise<void> {
  const db = await getDB();
  const alert = await db.get('alerts', id);
  if (alert) {
    alert.acknowledged = true;
    await db.put('alerts', alert);
  }
}

export async function deleteAlert(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('alerts', id);
}
