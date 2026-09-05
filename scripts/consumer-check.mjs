import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const workspace = await mkdtemp(join(tmpdir(), 'flaky-test-casefile-consumer-'));

try {
  await run(npm, ['run', 'build'], { cwd: process.cwd() });
  const packed = await run(npm, ['pack', '--json', '--pack-destination', workspace], { cwd: process.cwd() });
  const filename = JSON.parse(packed.stdout)[0]?.filename;
  if (!filename) throw new Error('npm pack did not return a tarball filename');
  const tarball = resolve(workspace, filename);
  const consumer = join(workspace, 'consumer');
  await mkdir(consumer);
  await run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd: consumer });
  await run(process.execPath, ['--input-type=module', '--eval', "import Reporter, { normalizeFailure } from 'flaky-test-casefile'; import { createCasefileProbe } from 'flaky-test-casefile/probe'; if (typeof Reporter !== 'function' || !normalizeFailure('Timeout 10ms') || typeof createCasefileProbe !== 'function') process.exit(1);"], { cwd: consumer });
  await run(process.execPath, ['--eval', "const Reporter = require('flaky-test-casefile'); const probe = require('flaky-test-casefile/probe'); if (typeof Reporter.default !== 'function' || typeof probe.createCasefileProbe !== 'function') process.exit(1);"], { cwd: consumer });
  console.log('Clean ESM and CommonJS consumer imports passed.');
} finally {
  await rm(workspace, { recursive: true, force: true });
}
