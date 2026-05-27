export interface DictItem {
  dictLabel: string;
  dictValue: string;
  tagType?: string;
  sort: number;
}

export interface DictDataType {
  id: number;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  tagType?: string;
  sort: number;
  status: number;
  remark?: string;
}

export interface DictTypeItem {
  id: number;
  dictCode: string;
  dictName: string;
  status: number;
  isSystem: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuDTO {
  id: string;
  name: string;
  path: string;
  component?: string;
  redirect?: string;
  meta: {
    title: string;
    icon?: string;
    hidden?: boolean;
    affix?: boolean;
    noCache?: boolean;
    externalLink?: string;
    roles?: string[];
    [key: string]: unknown;
  };
  sort: number;
  children?: MenuDTO[];
}

import type { HttpClient } from '@uni-admin/request';

let api: HttpClient;

async function getApi(): Promise<HttpClient> {
  if (!api) {
    const mod = await import('@/lib/request/instances/default.js');
    api = mod.default;
  }
  return api;
}

// ====== 字典类型管理接口 ======

export interface PaginatedResult<T> {
  list: T[];
  total: number;
}

export async function getDictTypeList(params?: {
  keyword?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<DictTypeItem>> {
  const instance = await getApi();
  return instance.get('/system/dict/type/list', { params });
}

export async function createDictType(data: { dictCode: string; dictName: string; remark?: string; status?: number; isSystem?: number }) {
  const instance = await getApi();
  return instance.post('/system/dict/type', data);
}

export async function updateDictType(id: number, data: { dictName?: string; remark?: string; status?: number }) {
  const instance = await getApi();
  return instance.put(`/system/dict/type/${id}`, data);
}

export async function deleteDictType(id: number) {
  const instance = await getApi();
  return instance.delete(`/system/dict/type/${id}`);
}

export async function toggleDictTypeStatus(id: number, status: number) {
  const instance = await getApi();
  return instance.put(`/system/dict/type/${id}/status`, { status });
}

// ====== 字典数据管理接口 ======

export async function getDictDataList(params?: { dictCode?: string; status?: number }): Promise<DictDataType[]> {
  const instance = await getApi();
  return instance.get('/system/dict/data/list', { params });
}

export async function createDictData(data: {
  dictCode: string; dictLabel: string; dictValue: string;
  tagType?: string; sort?: number; status?: number; remark?: string;
}) {
  const instance = await getApi();
  return instance.post('/system/dict/data', data);
}

export async function updateDictData(id: number, data: {
  dictLabel?: string; dictValue?: string; tagType?: string;
  sort?: number; status?: number; remark?: string;
}) {
  const instance = await getApi();
  return instance.put(`/system/dict/data/${id}`, data);
}

export async function deleteDictData(id: number) {
  const instance = await getApi();
  return instance.delete(`/system/dict/data/${id}`);
}

// ====== 公开查询接口 ======

/** 按编码查询字典项（带缓存） */
export async function getDictItems(dictCode: string): Promise<DictItem[]> {
  const instance = await getApi();
  return instance.get(`/public/dict/${dictCode}`);
}

/** 按编码+值翻译为标签 */
export async function getDictLabel(code: string, value: string): Promise<string> {
  const instance = await getApi();
  return instance.get(`/public/dict/${code}/${value}`);
}

/** 批量查询多个字典 */
export async function getDictBatch(codes: string[]): Promise<Record<string, DictItem[]>> {
  const instance = await getApi();
  return instance.get('/public/dict/batch', { params: { codes: codes.join(',') } });
}

// ====== 菜单接口 ======

export async function getMenus(): Promise<MenuDTO[]> {
  const instance = await getApi();
  const response = await instance.get('/system/menus');

  if (Array.isArray(response)) {
    return response as unknown as MenuDTO[];
  }

  if (response?.data) {
    const innerData = response.data;
    if (Array.isArray(innerData)) {
      return innerData as unknown as MenuDTO[];
    }

    if (innerData?.data && Array.isArray(innerData.data)) {
      return innerData.data as unknown as MenuDTO[];
    }
  }

  console.warn('[getMenus] API 返回格式异常，尝试提取菜单数据:', response);
  return [];
}
