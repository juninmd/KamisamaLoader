const realFetch = globalThis.fetch;
const apiBase = process.env.KAMISAMA_E2E_API_URL;

if (!apiBase || !realFetch) {
  throw new Error('KAMISAMA_E2E_API_URL and global fetch are required');
}

globalThis.fetch = (input, init) => {
  const original = typeof input === 'string' ? input : input.url;
  if (!original.startsWith('https://gamebanana.com/apiv11/')) {
    return realFetch(input, init);
  }

  const source = new URL(original);
  const target = new URL(`${source.pathname}${source.search}`, apiBase);
  return realFetch(target, init);
};
