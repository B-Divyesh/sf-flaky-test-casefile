import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import { clusterAttempts, firstDivergence } from './normalize.js';
import { maskPng } from './png-mask.js';
import { renderCasefile } from './report-template.js';
import type { CasefileAttempt, CasefileData, CasefileReporterOptions, ProbeEvidence } from './types.js';

export type { CasefileData, CasefileReporterOptions, MaskRegion } from './types.js';
export { clusterAttempts, firstDivergence, normalizeFailure } from './normalize.js';

const DEFAULT_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];

export default class CasefileReporter implements Reporter {
  private readonly options: Required<CasefileReporterOptions>;
  private attempts: CasefileAttempt[] = [];
  private testCount = 0;

  constructor(options: CasefileReporterOptions = {}) {
    this.options = {
      outputDir: options.outputDir ?? 'casefile-report', includeTraces: options.includeTraces ?? false,
      includeVideos: options.includeVideos ?? false, copyScreenshots: options.copyScreenshots ?? true,
      redactHeaders: options.redactHeaders ?? DEFAULT_HEADERS, screenshotMasks: options.screenshotMasks ?? [],
    };
  }

  onBegin(_config: FullConfig, suite: Suite): void { this.testCount = suite.allTests().length; }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const attemptId = `${test.id || test.title}-${result.retry}-${this.attempts.length}`;
    const attempt: CasefileAttempt = {
      id: attemptId, testId: test.id || test.titlePath().join(' › '), title: test.title, path: test.titlePath(),
      project: test.parent.project()?.name ?? '', retry: result.retry, status: result.status,
      expectedStatus: test.expectedStatus, durationMs: Math.round(result.duration),
      errors: result.errors.map((error) => error.message ?? error.value ?? String(error)),
      stdout: result.stdout.map((value) => typeof value === 'string' ? value : value.toString('utf8')).map((value) => this.redactText(value)),
      stderr: result.stderr.map((value) => typeof value === 'string' ? value : value.toString('utf8')).map((value) => this.redactText(value)),
      events: [], attachments: [],
    };
    for (let index = 0; index < result.attachments.length; index += 1) {
      const attachment = result.attachments[index]!;
      const contentType = attachment.contentType || 'application/octet-stream';
      if (attachment.name === 'casefile-events' || contentType === 'application/vnd.casefile+json') {
        try {
          const bytes = attachment.body ?? (attachment.path ? await readFile(attachment.path) : undefined);
          if (!bytes) throw new Error('Attachment has no body or path');
          const evidence = JSON.parse(this.redactText(bytes.toString('utf8'))) as ProbeEvidence;
          attempt.events = Array.isArray(evidence.events) ? evidence.events : [];
          attempt.attachments.push({ name: attachment.name, contentType, state: 'copied', note: `${attempt.events.length} structured events` });
        } catch (error) { attempt.attachments.push({ name: attachment.name, contentType, state: 'unavailable', note: String(error) }); }
        continue;
      }
      const extension = extname(attachment.path ?? '') || (contentType === 'image/png' ? '.png' : '');
      const isScreenshot = contentType.startsWith('image/'); const isTrace = attachment.name === 'trace' || extension === '.zip'; const isVideo = contentType.startsWith('video/');
      const allowed = (isScreenshot && this.options.copyScreenshots) || (isTrace && this.options.includeTraces) || (isVideo && this.options.includeVideos);
      if (!allowed) {
        attempt.attachments.push({ name: attachment.name, contentType, state: 'excluded', note: isTrace || isVideo ? 'Privacy-safe default' : 'Attachment type is not exported' });
        continue;
      }
      if (isScreenshot && this.options.screenshotMasks.length && contentType !== 'image/png') {
        attempt.attachments.push({ name: attachment.name, contentType, state: 'excluded', note: 'Masked export supports PNG only' });
        continue;
      }
      try {
        const bytes = attachment.body ?? (attachment.path ? await readFile(attachment.path) : undefined);
        if (!bytes) throw new Error('Attachment has no body or path');
        const directory = resolve(this.options.outputDir, 'assets'); await mkdir(directory, { recursive: true });
        const filename = `${this.attempts.length}-${index}-${basename(attachment.path ?? attachment.name).replace(/[^a-z0-9._-]/gi, '-')}${extension && !basename(attachment.path ?? attachment.name).endsWith(extension) ? extension : ''}`;
        const output = resolve(directory, filename);
        if (isScreenshot && this.options.screenshotMasks.length) await writeFile(output, maskPng(bytes, this.options.screenshotMasks));
        else if (attachment.path && !attachment.body) await copyFile(attachment.path, output);
        else await writeFile(output, bytes);
        attempt.attachments.push({ name: attachment.name, contentType, state: 'copied', path: `assets/${filename}`, note: isScreenshot && this.options.screenshotMasks.length ? `${this.options.screenshotMasks.length} mask(s) baked in` : undefined });
      } catch (error) { attempt.attachments.push({ name: attachment.name, contentType, state: 'unavailable', note: String(error) }); }
    }
    attempt.errors = attempt.errors.map((value) => this.redactText(value));
    this.attempts.push(attempt);
  }

  async onEnd(_result: FullResult): Promise<void> {
    const clusters = clusterAttempts(this.attempts);
    const byTest = new Map<string, CasefileAttempt[]>();
    for (const attempt of this.attempts) byTest.set(attempt.testId, [...(byTest.get(attempt.testId) ?? []), attempt]);
    for (const attempts of byTest.values()) {
      const baseline = attempts.find((attempt) => attempt.status === 'passed' && attempt.events.length) ?? attempts.find((attempt) => attempt.events.length);
      if (baseline) for (const attempt of attempts) if (attempt !== baseline && attempt.events.length) attempt.divergence = firstDivergence(baseline.events, attempt.events);
    }
    const failures = this.attempts.filter((attempt) => !['passed', 'skipped'].includes(attempt.status)).length;
    const flaky = [...byTest.values()].filter((attempts) => attempts.some((item) => item.status === 'passed') && attempts.some((item) => !['passed', 'skipped'].includes(item.status))).length;
    const data: CasefileData = {
      schema: 1, generatedAt: new Date().toISOString(), title: 'Flaky Test Casefile',
      summary: { tests: this.testCount || byTest.size, attempts: this.attempts.length, failures, flaky, clusters: clusters.length },
      clusters, attempts: this.attempts,
      privacy: { tracesIncluded: this.options.includeTraces, videosIncluded: this.options.includeVideos, redactedHeaders: this.options.redactHeaders, screenshotMasks: this.options.screenshotMasks.length },
    };
    await mkdir(this.options.outputDir, { recursive: true });
    await Promise.all([
      writeFile(resolve(this.options.outputDir, 'casefile.json'), `${JSON.stringify(data, null, 2)}\n`),
      writeFile(resolve(this.options.outputDir, 'index.html'), renderCasefile(data)),
    ]);
  }

  printsToStdio(): boolean { return false; }

  private redactText(value: string): string {
    let output = value.replaceAll(process.cwd(), '<workspace>').replaceAll(homedir(), '<home>');
    for (const name of this.options.redactHeaders) output = output.replace(new RegExp(`(${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*[:=]\\s*)([^\\s,;]+)`, 'gi'), '$1[REDACTED]');
    return output.replace(/([?&](?:token|access_token|api_key|signature)=)[^&#\s]+/gi, '$1[REDACTED]');
  }
}
