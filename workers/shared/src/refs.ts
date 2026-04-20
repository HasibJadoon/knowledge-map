export type DomainCode = 'QR' | 'AL' | 'AR' | 'WV' | 'PL' | 'CORE' | 'CM' | 'LX';

export interface TypedRef {
  domain: DomainCode;
  id: string;
}

export function parseTypedRef(ref: string): TypedRef | null {
  const idx = ref.indexOf(':');
  if (idx <= 0) return null;

  const domain = ref.slice(0, idx).toUpperCase() as DomainCode;
  const id = ref.slice(idx + 1);
  if (!id) return null;

  if (!['QR', 'AL', 'AR', 'WV', 'PL', 'CORE', 'CM', 'LX'].includes(domain)) {
    return null;
  }

  return { domain, id };
}

export function normalizeDomain(domain: DomainCode): Exclude<DomainCode, 'LX'> {
  return domain === 'LX' ? 'AL' : domain;
}
