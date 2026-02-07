import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';

const PROJECTS_FILE = './data/projects.json';

export interface Project {
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

// GET all projects
export const GET: RequestHandler = async () => {
  const projects = await getProjects();
  return json(projects);
};

// POST new project
export const POST: RequestHandler = async ({ request }) => {
  const project = await request.json();
  const projects = await getProjects();
  
  const newProject: Project = {
    id: project.id || crypto.randomUUID(),
    name: project.name,
    url: project.url,
    healthEndpoint: project.healthEndpoint,
    checkInterval: project.checkInterval || 5,
    status: 'unknown',
    createdAt: Date.now()
  };
  
  projects.push(newProject);
  await saveProjects(projects);
  
  return json(newProject, { status: 201 });
};
