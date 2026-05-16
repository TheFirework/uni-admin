import type { Router } from 'vue-router';

let routerInstance: Router | null = null;

export function setRouter(router: Router): void {
  routerInstance = router;
}

export function getRouter(): Router | null {
  return routerInstance;
}

export async function navigateToLogin(path = '/login'): Promise<void> {
  if (routerInstance) {
    await routerInstance.push(path);
  } else {
    window.location.href = path;
  }
}
