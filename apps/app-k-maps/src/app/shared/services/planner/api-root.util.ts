import { environment } from '../../../../environments/environment';

export function resolveApiRoot(): string {
  const normalized = environment.apiBase.replace(/\/+$/, '');
  if (!normalized) {
    return '/api';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}
