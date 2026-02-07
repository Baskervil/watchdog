import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';

const PROJECTS_FILE = './data/projects.json';

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
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updatedAt: Date.now()
  };
  
  await saveProjects(projects);
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
