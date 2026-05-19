import type { RouteRecordRaw } from 'vue-router';

export type RouterMode = 'frontend' | 'backend' | 'mixed';

export interface UniAdminRouteMeta {
  title: string;
  icon?: string;
  hidden?: boolean;
  hideInMenu?: boolean;
  hideChildrenInMenu?: boolean;
  hideInTab?: boolean;
  hideInBreadcrumb?: boolean;
  access?: string | string[] | ((user: unknown) => boolean);
  ignoreAccess?: boolean;
  keepAlive?: boolean;
  noCache?: boolean;
  affix?: boolean;
  affixTabOrder?: number;
  order?: number;
  sort?: number;
  iframeSrc?: string;
  link?: string;
  externalLink?: string;
  activePath?: string;
  query?: Record<string, unknown>;
  noBasicLayout?: boolean;
  requiresAuth?: boolean;
}

export interface UniAdminRouteRecord extends Omit<RouteRecordRaw, 'meta'> {
  meta: UniAdminRouteMeta;
  children?: UniAdminRouteRecord[];
}

const AUTHORITY_FIELDS = ['access', 'authority', 'permission', 'roles'] as const;

export function normalizeAuthority(meta: Record<string, unknown>): string | string[] | undefined {
  for (const field of AUTHORITY_FIELDS) {
    const value = meta[field];
    if (value !== undefined && value !== null && value !== '') {
      return value as string | string[];
    }
  }
  return undefined;
}
