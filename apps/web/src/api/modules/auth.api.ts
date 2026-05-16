import type { defaultInstance } from '@/lib/request/instances/default';

export interface LoginDTO {
  username: string;
  password: string;
  captcha?: string;
  captchaKey?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    nickname: string;
    roles: string[];
  };
}

export interface RegisterDTO {
  username: string;
  password: string;
  email?: string;
  captcha?: string;
  captchaKey?: string;
}

export interface CaptchaResult {
  captchaKey: string;
  captchaImage: string;
}

let api: typeof import('@/lib/request/instances/default.js').defaultInstance;

async function getApi() {
  if (!api) {
    const mod = await import('@/lib/request/instances/default.js');
    api = mod.defaultInstance;
  }
  return api;
}

/** 登录（跳过 Token 和错误提示） */
export async function login(data: LoginDTO): Promise<LoginResult> {
  const instance = await getApi();
  return instance.post('/auth/login', data, { skipToken: true });
}

/** 登出 */
export async function logout(): Promise<void> {
  const instance = await getApi();
  return instance.post('/auth/logout', undefined, { showError: false });
}

/** 获取验证码图片 */
export async function getCaptcha(): Promise<CaptchaResult> {
  const instance = await getApi();
  return instance.get('/auth/captcha', { skipToken: true });
}

/** 刷新 Token */
export async function refreshToken(refreshTokenStr: string): Promise<{ accessToken: string }> {
  const instance = await getApi();
  return instance.post('/auth/refresh-token', { refreshToken: refreshTokenStr }, {
    skipToken: true,
    skipErrorHandler: true,
  });
}
