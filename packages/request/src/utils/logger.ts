export const SLOW_THRESHOLD_MS = 3000;

export interface MetricData {
  url: string;
  method: string;
  duration: number;
  status?: number;
  success: boolean;
  isError: boolean;
  errorType?: string;
}

export function collectMetrics(_data: MetricData): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Metrics]', _data);
  }
}

export function reportSlowRequest(_data: { url: string; duration: number }): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Slow Request] ${_data.url} took ${_data.duration}ms`);
  }
}

export function maskUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url.split('?')[0];
  }
}
