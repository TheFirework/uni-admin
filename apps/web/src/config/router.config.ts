import type { RouterMode } from '@/router/routes/types';

export type { RouterMode };

export interface RouterConfig {
  mode: RouterMode;
  cacheEnabled: boolean;
  cacheTTL: number;
  prefetchEnabled: boolean;
  hoverDelay: number;
  maxPrefetchCache: number;
}

const VALID_MODES: RouterMode[] = ['frontend', 'backend', 'mixed'];

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function validateConfig(): Readonly<RouterConfig> {
  const rawMode = import.meta.env.VITE_ROUTER_MODE as string | undefined;

  let mode: RouterMode = 'backend';
  if (rawMode && VALID_MODES.includes(rawMode as RouterMode)) {
    mode = rawMode as RouterMode;
  } else if (rawMode) {
    console.warn(`[RouterConfig] 无效的路由模式 "${rawMode}"，已降级为 "backend"`);
  }

  const config: RouterConfig = {
    mode,
    cacheEnabled: parseBoolean(import.meta.env.VITE_MENU_CACHE, false),
    cacheTTL: parseNumber(import.meta.env.VITE_MENU_CACHE_TTL, 1800000),
    prefetchEnabled: parseBoolean(import.meta.env.VITE_PREFETCH_ENABLED, true),
    hoverDelay: parseNumber(import.meta.env.VITE_HOVER_DELAY, 150),
    maxPrefetchCache: parseNumber(import.meta.env.VITE_MAX_PREFETCH_CACHE, 10),
  };

  if (import.meta.env.DEV) {
    console.log(`[Main] 路由模式: ${mode}`);
    console.log(`[Main] 缓存启用: ${config.cacheEnabled}`);
  }

  return Object.freeze(config) as Readonly<RouterConfig>;
}

export const routerConfig: Readonly<RouterConfig> = validateConfig();
