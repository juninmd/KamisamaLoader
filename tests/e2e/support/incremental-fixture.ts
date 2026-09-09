import AdmZip from 'adm-zip';
import http from 'node:http';

export async function startIncrementalFixture() {
  let version = 1;
  let broken = true;
  let baseUrl = '';
  const requests: string[] = [];
  const records = [
    { _idRow: 5001, _sName: 'Aura Celestial', _aSubmitter: { _sName: 'Kamisama QA' } },
    { _idRow: 5002, _sName: 'Traje Alternativo', _aSubmitter: { _sName: 'Kamisama QA' } },
  ];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    requests.push(url.pathname);
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname.endsWith('/Game/21179/ProfilePage')) {
      response.end(JSON.stringify({ _aModRootCategories: [] })); return;
    }
    if (url.pathname.endsWith('/Subfeed') || url.pathname.endsWith('/Util/Search/Results')) {
      response.end(JSON.stringify({ _aRecords: records.map(record => ({ ...record, _sVersion: String(version) })) })); return;
    }
    const id = /\/Mod\/(\d+)\/ProfilePage$/.exec(url.pathname)?.[1];
    if (id) {
      const record = records.find(item => String(item._idRow) === id);
      response.end(JSON.stringify({ ...record, _sVersion: String(version), _sText: 'Pacote de teste incremental.',
        _aFiles: [{ _idRow: Number(id) * 10 + version, _sDownloadUrl: `${baseUrl}/${id}-v${version}.zip` }] })); return;
    }
    if (url.pathname.endsWith('/Updates')) { response.end('[]'); return; }
    const file = /\/(\d+)-v(\d+)\.zip$/.exec(url.pathname);
    if (file) {
      response.setHeader('Content-Type', 'application/zip');
      if (file[1] === '5002' && file[2] === '2' && broken) { response.end('invalid archive'); return; }
      const zip = new AdmZip();
      zip.addFile('same.pak', Buffer.from('identical across versions'));
      zip.addFile('changed.pak', Buffer.from(`version-${file[2]}`));
      zip.addFile(file[2] === '1' ? 'removed.pak' : 'added.pak', Buffer.from('delta'));
      const data = zip.toBuffer();
      response.setHeader('Content-Length', data.length);
      response.write(data.subarray(0, 30));
      setTimeout(() => response.end(data.subarray(30)), 350);
      return;
    }
    response.statusCode = 404; response.end('{}');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture failed');
  baseUrl = `http://127.0.0.1:${address.port}`;
  return { baseUrl, requests, advance: () => { version = 2; }, repair: () => { broken = false; },
    close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}
