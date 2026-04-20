export async function callService<T>(
  service: Fetcher | undefined,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!service) {
    throw new Error('Required service binding is not configured');
  }

  const request = new Request(`https://domain.internal${path}`, init);
  const response = await service.fetch(request);
  if (!response.ok) {
    throw new Error(`Service call failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
