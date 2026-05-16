import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import * as authApi from '@/api/modules/auth.api';
import type { LoginDTO, LoginResult } from '@/api/modules/auth.api';

// 用户信息接口（从 LoginResult 提取）
export interface UserInfo {
  id: string;
  username: string;
  nickname: string;
  roles: string[];
}

// 认证状态接口
interface AuthState {
  user: UserInfo | null;        // 当前用户信息
  accessToken: string | null;    // AccessToken（内存存储）
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
    hasRole: (state) => (role: boolean): boolean => {
      return state.user?.roles.includes(role) ?? false;
    },

    // 检查是否已认证
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
        const result: LoginResult = await authApi.login(credentials);

        // 更新 Store 状态
        this.user = result.user as UserInfo;
        this.accessToken = result.accessToken;
        this.isAuthenticated = true;

        // 如果浏览器支持 Credential API 且用户勾选了"记住我"，提示保存凭证
        if (this.rememberMe && 'PasswordCredential' in window) {
          this.saveCredentialToBrowser(credentials.username, credentials.password);
        }

        console.log('[Auth] 登录成功，用户:', result.user.username);
        return result;
      } catch (error: any) {
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
        console.log('[Auth] 已登出，认证状态已清除');
      }
    },

    /**
     * 检查当前认证状态（用于页面刷新后恢复会话）
     * 尝试使用 RefreshToken 恢复登录状态
     * @returns Promise<boolean> 是否恢复成功
     */
    async checkAuth(): Promise<boolean> {
      // 如果已有有效 AccessToken，直接返回 true
      if (this.isAuthenticated && this.accessToken) {
        return true;
      }

      // 尝试检查是否存在 RefreshToken Cookie（由后端设置）
      // 注意：前端无法直接读取 HttpOnly Cookie，但可以通过刷新 Token 接口间接检测
      try {
        // 尝试调用 refreshToken 接口（如果 RefreshToken Cookie 存在且有效）
        const result = await authApi.refreshToken('');

        // 如果成功，说明 RefreshToken 有效，更新状态
        if (result?.accessToken) {
          // 需要获取完整的用户信息（这里简化处理，实际可能需要额外的 /auth/me 接口）
          this.accessToken = result.accessToken;
          this.isAuthenticated = true;

          // TODO: 可能需要额外调用来获取完整的 user 信息
          console.log('[Auth] 通过 RefreshToken 恢复会话成功');
          return true;
        }

        return false;
      } catch (error) {
        // RefreshToken 无效或不存在，保持未认证状态
        console.info('[Auth] 无法恢复会话（无有效 RefreshToken）');
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
