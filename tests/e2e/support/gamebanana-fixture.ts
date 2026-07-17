import AdmZip from 'adm-zip';
import http from 'node:http';

const records = [
  { _idRow: 4242, _sName: 'E2E Aura Pack', _sVersion: '2.0', _nDownloadCount: 9001,
    _aSubmitter: { _sName: 'Kamisama QA' }, _aRootCategory: { _sName: 'Aura' } },
  { _idRow: 4343, _sName: 'Broken E2E Pack', _sVersion: '1.0',
    _aSubmitter: { _sName: 'Kamisama QA' }, _aRootCategory: { _sName: 'Aura' } },
  { _idRow: 4444, _sName: 'Traversal E2E Pack', _sVersion: '1.0',
    _aSubmitter: { _sName: 'Kamisama QA' }, _aRootCategory: { _sName: 'Security' } },
];

const archive = (name: string, body: string) => {
  const zip = new AdmZip();
  zip.addFile(name, Buffer.from(body));
  return zip.toBuffer();
};

const unsafeArchive = () => {
  const output = archive('safe.pak', 'must-not-escape');
  const safe = Buffer.from('safe.pak');
  const unsafe = Buffer.from('../x.pak');
  for (let at = output.indexOf(safe); at >= 0; at = output.indexOf(safe, at + 1)) unsafe.copy(output, at);
  return output;
};

export type Fixture = Awaited<ReturnType<typeof startFixture>>;

export async function startFixture() {
  const valid = archive('AuraPack/awesome.pak', 'e2e-pak-fixture');
  const unsafe = unsafeArchive();
  const requests: string[] = [];
  let baseUrl = '';
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    requests.push(`${url.pathname}${url.search}`);
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname.endsWith('/Game/21179/ProfilePage')) {
      response.end(JSON.stringify({ _aModRootCategories: [
        { _idRow: 101, _sName: 'Aura', _nItemCount: 2 },
        { _idRow: 202, _sName: 'Security', _nItemCount: 1 },
      ] }));
      return;
    }
    if (url.pathname.endsWith('/Subfeed') || url.pathname.endsWith('/Util/Search/Results')) {
      const query = url.searchParams.get('_sSearchString')?.toLowerCase();
      const category = url.searchParams.get('_aFilters[Generic_Category]');
      const filtered = records.filter(record =>
        (!query || record._sName.toLowerCase().includes(query)) &&
        (!category || (category === '101' ? record._aRootCategory._sName === 'Aura' : record._aRootCategory._sName === 'Security'))
      );
      response.end(JSON.stringify({ _aRecords: filtered }));
      return;
    }
    const id = /\/Mod\/(\d+)\/ProfilePage$/.exec(url.pathname)?.[1];
    if (id) {
      const record = records.find(item => String(item._idRow) === id)!;
      const file = id === '4242' ? 'fixture.zip' : id === '4343' ? 'broken.zip' : 'unsafe.zip';
      response.end(JSON.stringify({ ...record, _sText: `Hermetic details for ${record._sName}`,
        _aFiles: [{ _idRow: Number(id), _sDownloadUrl: `${baseUrl}/${file}` }] }));
      return;
    }
    if (/\/Mod\/\d+\/Updates$/.test(url.pathname)) {
      response.end('[]');
      return;
    }
    if (url.pathname === '/fixture.zip') {
      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Length', valid.length);
      response.write(valid.subarray(0, Math.floor(valid.length / 2)));
      setTimeout(() => response.end(valid.subarray(Math.floor(valid.length / 2))), 800);
      return;
    }
    if (url.pathname === '/broken.zip') {
      response.setHeader('Content-Type', 'application/zip');
      response.end('not-a-zip');
      return;
    }
    if (url.pathname === '/unsafe.zip') {
      response.setHeader('Content-Type', 'application/zip');
      response.end(unsafe);
      return;
    }
    response.statusCode = 404;
    response.end('{}');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server failed');
  baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    requests,
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}
