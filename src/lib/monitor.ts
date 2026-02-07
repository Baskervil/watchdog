import type { Project } from './db';

export interface CheckResult {
  status: 'up' | 'down';
  responseTime: number;
  statusCode?: number;
  error?: string;
}

export async function checkProject(project: Project): Promise<CheckResult> {
  const url = project.healthEndpoint || project.url;
  const startTime = performance.now();
  
  try {
    const response = await fetch(`/api/check?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(30000)
    });
    
    const data = await response.json();
    const responseTime = Math.round(performance.now() - startTime);
    
    return {
      status: data.ok ? 'up' : 'down',
      responseTime,
      statusCode: data.statusCode,
      error: data.error
    };
  } catch (err) {
    return {
      status: 'down',
      responseTime: Math.round(performance.now() - startTime),
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

export function formatUptime(lastStatusChange: number | undefined): string {
  if (!lastStatusChange) return 'N/A';
  
  const diff = Date.now() - lastStatusChange;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}m`;
}

export function formatResponseTime(ms: number | undefined): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
