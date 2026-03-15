import { API_BASE } from '../../../shared/api-base';

export function resolveApiRoot(): string {
  const normalized = API_BASE.replace(/\/+$/, '');
  if (!normalized) {
    return '/api';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}
