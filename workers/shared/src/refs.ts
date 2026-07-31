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

export function formatTypedRef(domain: DomainCode, id: string): string {
  return `${domain}:${id}`;
}

/**
 * Strip a typed-ref prefix and return the domain-local primary key.
 *
 * The `AL:` / `QR:` prefix is a *reference-site* convention — it marks a value
 * as pointing into another domain. Primary keys inside a domain stay bare
 * (`ar_ling_roots.id`, `ar_ling_root_lemma.id`). Resolve cross-domain refs
 * through this before querying, e.g.
 *
 *   localId('AL:26ec9894256ccd2fcb77820470') === '26ec9894256ccd2fcb77820470'
 *   localId('26ec9894256ccd2fcb77820470')    === '26ec9894256ccd2fcb77820470'
 *
 * Pass `expected` to reject a ref aimed at a different domain (returns null).
 */
export function localId(ref: string, expected?: DomainCode): string | null {
  if (!ref) return null;
  const parsed = parseTypedRef(ref);
  if (!parsed) return ref; // already a bare local id
  if (expected && normalizeDomain(parsed.domain) !== normalizeDomain(expected)) {
    return null;
  }
  return parsed.id;
}
