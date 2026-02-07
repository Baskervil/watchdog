import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
