import fs from 'node:fs/promises';
import path from 'node:path';

export default async function globalSetup() {
  const evidence = path.resolve('tests/evidence/homologation');
  await fs.rm(evidence, { recursive: true, force: true });
  await fs.mkdir(evidence, { recursive: true });
}
