export interface DictItem {
  id: string;
  label: string;
  value: string;
  type: string;
  sort: number;
  status: number;
}

let api: typeof import('@/lib/request/instances/default.js').defaultInstance;

async function getApi() {
  if (!api) {
    const mod = await import('@/lib/request/instances/default.js');
    api = mod.defaultInstance;
  }
  return api;
}

/** 获取字典列表 */
export async function getDictList(type: string): Promise<DictItem[]> {
  const instance = await getApi();
  return instance.get(`/system/dict/${type}`);
}
