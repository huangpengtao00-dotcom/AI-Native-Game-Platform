import { id } from './util.mjs';

export function createRequestId() {
  return id('req');
}

export function logEvent(level, event, fields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function redactError(error) {
  return {
    name: error?.name ?? 'Error',
    message: error?.message ?? 'Unknown error'
  };
}