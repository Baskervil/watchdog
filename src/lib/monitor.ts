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
    // Use advanced check if configured
    if (project.checkType && project.checkType !== 'http') {
      return await advancedCheck(project);
    }
    
    // Simple HTTP check
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

async function advancedCheck(project: Project): Promise<CheckResult> {
  const startTime = performance.now();
  
  try {
    const config: any = {
      url: project.healthEndpoint || project.url,
      type: project.checkType
    };
    
    // Content check options
    if (project.containsText) config.containsText = project.containsText;
    if (project.notContainsText) config.notContainsText = project.notContainsText;
    
    // JSON check options
    if (project.jsonPath) config.jsonPath = project.jsonPath;
    if (project.jsonValue) config.jsonValue = project.jsonValue;
    
    // Login flow
    if (project.loginUrl && project.loginEmail && project.loginPassword) {
      config.loginUrl = project.loginUrl;
      config.loginData = {
        email: project.loginEmail,
        password: project.loginPassword
      };
    }
    
    const response = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(30000)
    });
    
    const data = await response.json();
    
    return {
      status: data.ok ? 'up' : 'down',
      responseTime: data.responseTime || Math.round(performance.now() - startTime),
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
