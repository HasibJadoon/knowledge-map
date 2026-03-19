export const onRequestGet: PagesFunction = async () => {
  const spec = await import('./openapi.json');
  return new Response(JSON.stringify(spec.default ?? spec), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
