import type { InternalAxiosRequestConfig } from 'axios';

export function generateCacheKey(config: InternalAxiosRequestConfig): string {
  const parts = [
    config.method?.toUpperCase() || 'GET',
    config.url || '',
    JSON.stringify(sortObject(config.params) || {}),
    JSON.stringify(sortObject(config.data) || {}),
  ];
  return parts.join(':');
}

function sortObject(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sortObject(item));

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}
