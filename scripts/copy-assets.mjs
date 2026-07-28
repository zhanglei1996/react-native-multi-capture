import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(projectRoot, 'assets');
const destination = resolve(projectRoot, 'lib', 'assets');

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
