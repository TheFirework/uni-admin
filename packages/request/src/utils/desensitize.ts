const SENSITIVE_FIELDS = [
  'password', 'passwd', 'pwd',
  'token', 'access_token', 'refresh_token',
  'secret', 'api_key', 'apikey',
  'authorization',
  'phone', 'mobile', 'telephone',
  'idCard', 'id_card', 'idcard',
  'credit_card', 'creditCard',
];

export function desensitize(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return maskString(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => desensitize(item));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      // 检查字段名是否匹配敏感词（不区分大小写的包含匹配）
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        result[key] = '***';
      } else {
        result[key] = desensitize(value);
      }
    }
    return result;
  }

  return data;
}

function maskString(str: string): string {
  if (str.length <= 6) return '***';
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
}
