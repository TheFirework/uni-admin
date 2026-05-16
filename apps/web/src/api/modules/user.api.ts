import type { defaultInstance } from '@/lib/request/instances/default';

export interface UserInfo {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  status: number;
  roles?: string[];
  createdAt?: string;
}

export interface QueryUserParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: number;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  nickname?: string;
  email?: string;
  phone?: number;
  roles?: string[];
}

export interface UpdateUserDTO {
  nickname?: string;
  email?: string;
  phone?: number;
  status?: number;
  roles?: string[];
}

let api: typeof import('@/lib/request/instances/default.js').defaultInstance;

async function getApi() {
  if (!api) {
    const mod = await import('@/lib/request/instances/default.js');
    api = mod.defaultInstance;
  }
  return api;
}

/** 获取用户列表 */
export async function getUserList(params?: QueryUserParams): Promise<{
  list: UserInfo[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const instance = await getApi();
  return instance.get('/users', { params });
}

/** 获取用户详情 */
export async function getUserDetail(id: string): Promise<UserInfo> {
  const instance = await getApi();
  return instance.get(`/users/${id}`);
}

/** 创建用户 */
export async function createUser(data: CreateUserDTO): Promise<UserInfo> {
  const instance = await getApi();
  return instance.post('/users', data);
}

/** 更新用户 */
export async function updateUser(id: string, data: UpdateUserDTO): Promise<UserInfo> {
  const instance = await getApi();
  return instance.put(`/users/${id}`, data);
}

/** 删除用户 */
export async function deleteUser(id: string): Promise<void> {
  const instance = await getApi();
  return instance.del(`/users/${id}`);
}

/** 更新用户状态 */
export async function updateUserStatus(id: string, status: number): Promise<void> {
  const instance = await getApi();
  return instance.put(`/users/${id}/status`, { status });
}
