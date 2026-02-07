import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface CheckConfig {
  url: string;
  type?: 'http' | 'content' | 'json';
  // For content check
  containsText?: string;
  notContainsText?: string;
  // For JSON check  
  jsonPath?: string;
  jsonValue?: string;
  // Auth
  headers?: Record<string, string>;
  // Login flow (basic)
  loginUrl?: string;
  loginData?: Record<string, string>;
}

export const GET: RequestHandler = async ({ url }) => {
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return json({ ok: false, error: 'Missing url parameter' }, { status: 400 });
  }
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Watchdog/1.0'
      }
    });
    
    clearTimeout(timeout);
    
    return json({
      ok: response.ok,
      statusCode: response.status
    });
  } catch (err) {
    return json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// POST for advanced checks
export const POST: RequestHandler = async ({ request }) => {
  const config: CheckConfig = await request.json();
  const startTime = performance.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    let cookies = '';
    
    // Login flow if configured
    if (config.loginUrl && config.loginData) {
      const loginRes = await fetch(config.loginUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Watchdog/1.0'
        },
        body: JSON.stringify(config.loginData),
        signal: controller.signal
      });
      
      // Extract cookies from login response
      const setCookie = loginRes.headers.get('set-cookie');
      if (setCookie) {
        cookies = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
      }
      
      if (!loginRes.ok) {
        clearTimeout(timeout);
        return json({
          ok: false,
          error: 'Login failed',
          statusCode: loginRes.status,
          responseTime: Math.round(performance.now() - startTime)
        });
      }
    }
    
    // Main request
    const headers: Record<string, string> = {
      'User-Agent': 'Watchdog/1.0',
      ...config.headers
    };
    
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    
    const response = await fetch(config.url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const responseTime = Math.round(performance.now() - startTime);
    
    if (!response.ok) {
      return json({
        ok: false,
        statusCode: response.status,
        responseTime
      });
    }
    
    const body = await response.text();
    
    // Content check
    if (config.type === 'content') {
      if (config.containsText && !body.includes(config.containsText)) {
        return json({
          ok: false,
          error: `Missing expected text: "${config.containsText}"`,
          statusCode: response.status,
          responseTime
        });
      }
      
      if (config.notContainsText && body.includes(config.notContainsText)) {
        return json({
          ok: false,
          error: `Found unexpected text: "${config.notContainsText}"`,
          statusCode: response.status,
          responseTime
        });
      }
    }
    
    // JSON check
    if (config.type === 'json' && config.jsonPath) {
      try {
        const data = JSON.parse(body);
        const value = getJsonPath(data, config.jsonPath);
        
        if (config.jsonValue !== undefined && String(value) !== config.jsonValue) {
          return json({
            ok: false,
            error: `JSON value mismatch: expected "${config.jsonValue}", got "${value}"`,
            statusCode: response.status,
            responseTime
          });
        }
      } catch {
        return json({
          ok: false,
          error: 'Invalid JSON response',
          statusCode: response.status,
          responseTime
        });
      }
    }
    
    return json({
      ok: true,
      statusCode: response.status,
      responseTime
    });
    
  } catch (err) {
    return json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      responseTime: Math.round(performance.now() - startTime)
    });
  }
};

function getJsonPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
