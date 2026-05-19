import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import * as authApi from '@/api/modules/auth.api';
import type { LoginDTO, LoginResult } from '@/api/modules/auth.api';
import { storage } from '@/utils/storage';
import router from '@/router';

// 用户信息接口（从 LoginResult 提取）
export interface UserInfo {
  userId: string;
  username: string;
  email: string;
  roles: number[];
}

// 认证状态接口
interface AuthState {
  user: UserInfo | null;        // 当前用户信息
  accessToken: string | null;    // AccessToken（内存存储，用于 HTTP 请求头）
  isAuthenticated: boolean;       // 认证状态标记
  rememberMe: boolean;           // 是否记住登录状态
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    rememberMe: false,
  }),

  getters: {
    // 获取当前用户名
    username: (state): string | null => state.user?.username ?? null,

    // 获取用户角色列表
    roles: (state): string[] => state.user?.roles ?? [],

    // 检查是否拥有指定角色
    hasRole: (state) => (role: number): boolean => {
      return state.user?.roles.includes(role) ?? false;
    },

    // 检查是否已认证（同时检查内存和 Storage）
    isLoggedIn: (state): boolean => state.isAuthenticated && !!state.accessToken,
  },

  actions: {
    /**
     * 执行用户登录
     * @param credentials 登录凭证（用户名、密码、验证码等）
     * @returns Promise<LoginResult> 登录结果（包含 accessToken 和用户信息）
     */
    async login(credentials: LoginDTO): Promise<LoginResult> {
      try {
        // 调用登录 API（skipToken: true，因为还未登录）
        console.log('[Auth] 开始登录请求...');
        const result: LoginResult = await authApi.login(credentials);
        console.log('[Auth] API 返回成功:', { user: result.user, hasToken: !!result.accessToken });

        // 更新 Store 状态
        this.user = result.user as UserInfo;
        this.accessToken = result.accessToken;
        this.isAuthenticated = true;
        console.log('[Auth] Store 状态已更新');

        // 将 Token 通过 Storage 加密持久化存储
        try {
          await storage.set('token', result.accessToken, {
            encrypt: true,
            namespace: 'auth',
          });
          console.log('[Auth] Token 已加密存储');
        } catch (storageError) {
          console.error('[Auth] Token 存储失败:', storageError);
          // 存储失败不阻塞登录流程，仅警告
        }

        // 存储用户信息到 Storage（便于刷新后恢复）
        try {
          await storage.set('userInfo', result.user, {
            namespace: 'user',
          });
          console.log('[Auth] 用户信息已存储');
        } catch (storageError) {
          console.error('[Auth] 用户信息存储失败:', storageError);
        }

        console.log('[Auth] 登录流程完成，用户:', result.user.username);
        return result;
      } catch (error: any) {
        console.error('[Auth] 登录过程出错:', error);
        // 清除可能的部分状态
        this.logout(false); // 不调用登出 API，仅清除本地状态

        // 根据错误类型抛出更具体的错误（由上层组件处理显示）
        throw error;
      }
    },

    /**
     * 执行用户登出
     * @param callApi 是否调用后端登出接口（默认 true）
     */
    async logout(callApi: boolean = true): Promise<void> {
      try {
        // 如果需要，调用后端登出 API（通知后端清除 RefreshToken Cookie）
        if (callApi) {
          await authApi.logout();
        }
      } catch (error) {
        // 即使 API 调用失败，也要清除本地状态
        console.warn('[Auth] 登出 API 调用失败:', error);
      } finally {
        // 无论成功失败，都清除本地认证状态
        this.resetAuthState();

        // 【新增】联动清空 Storage 中的关联命名空间
        storage.clearNamespace('auth');   // 清除 Token
        storage.clearNamespace('user');   // 清除用户信息
        storage.clearNamespace('tags');   // 清除标签临时状态

        // 【新增】重置菜单 Store 状态（统一通过 menuStore 管理）
        const { useMenuStore } = await import('@/stores/menu.store');
        const menuStore = useMenuStore();
        menuStore.resetMenuState();

        console.log('[Auth] 已登出，认证状态和 Storage 已清除');
      }
    },

    /**
     * 检查当前认证状态（用于页面刷新后恢复会话）
     * 【修改】改为从 Storage 读取 Token 判断登录状态（替代纯内存判断）
     * @returns Promise<boolean> 是否恢复成功
     */
    async checkAuth(): Promise<boolean> {
      // 如果已有有效 AccessToken，直接返回 true
      if (this.isAuthenticated && this.accessToken) {
        return true;
      }

      // 【新增】尝试从 Storage 读取 Token 判断登录状态
      try {
        const storedToken = await storage.get<string>('token', {
          defaultValue: '',
          namespace: 'auth',
          encrypt: true,
        });

        if (!storedToken) {
          return false;
        }

        // 从 Storage 恢复用户信息
        const storedUser = await storage.get<UserInfo>('userInfo', {
          defaultValue: null,
          namespace: 'user',
        });

        if (storedUser) {
          this.user = storedUser;
        }

        // 恢复 Token 到内存（用于 HTTP 请求头）
        this.accessToken = storedToken;
        this.isAuthenticated = true;

        console.log('[Auth] 通过 Storage 恢复会话成功');
        return true;
      } catch (error) {
        // Storage 读取失败，保持未认证状态
        console.warn('[Auth] 无法从 Storage 恢复会话:', error);
        return false;
      }
    },

    /**
     * 将凭证保存到浏览器 Credential Manager（可选增强）
     * 仅在 HTTPS 环境或 localhost 下生效
     */
    saveCredentialToBrowser(username: string, password: string): void {
      if (!('PasswordCredential' in window) || !('credentials' in navigator)) {
        console.info('[Auth] 当前浏览器不支持 Credential API');
        return;
      }

      // 创建 PasswordCredential 对象
      const credential = new PasswordCredential({
        id: username,
        password: password,
        name: username,
        iconURL: window.location.origin + '/favicon.ico',
      });

      // 异步保存到浏览器（不阻塞流程）
      navigator.credentials.store(credential).then(() => {
        console.log('[Auth] 凭证已保存到浏览器凭证管理器');
      }).catch((err) => {
        // 用户拒绝或浏览器不支持，静默处理
        console.warn('[Auth] 浏览器拒绝保存凭证:', err.message);
      });
    },

    /**
     * 重置所有认证状态到初始值
     */
    resetAuthState(): void {
      this.user = null;
      this.accessToken = null;
      this.isAuthenticated = false;
      // 注意：不清除 rememberMe，因为它是用户偏好设置
    },
  },

  // 持久化配置（可选）：仅持久化非敏感的用户偏好
  // persist: {
  //   key: 'auth',
  //   paths: ['rememberMe'],
  //   storage: localStorage,
  // },
});
