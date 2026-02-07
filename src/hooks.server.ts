import { startScheduler } from '$lib/server/scheduler';

// Start server-side monitoring when server starts
startScheduler();

export const handle = async ({ event, resolve }) => {
  return resolve(event);
};
