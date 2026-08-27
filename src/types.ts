export type MaskRegion = { x: number; y: number; width: number; height: number };

export type CasefileReporterOptions = {
  outputDir?: string;
  includeTraces?: boolean;
  includeVideos?: boolean;
  copyScreenshots?: boolean;
  redactHeaders?: string[];
  screenshotMasks?: MaskRegion[];
};

export type ProbeEvent = {
  kind: 'request' | 'response' | 'console' | 'pageerror' | 'dom';
  at: number;
  label?: string;
  method?: string;
  url?: string;
  status?: number;
  level?: string;
  message?: string;
  headers?: Record<string, string>;
  dom?: { title: string; url: string; landmarks: string[]; textHash: string };
};

export type ProbeEvidence = { schema: 1; startedAt: string; events: ProbeEvent[] };

export type CasefileAttachment = {
  name: string;
  contentType: string;
  path?: string;
  state: 'copied' | 'excluded' | 'unavailable';
  note?: string;
};

export type CasefileAttempt = {
  id: string;
  testId: string;
  title: string;
  path: string[];
  project: string;
  retry: number;
  status: string;
  expectedStatus: string;
  durationMs: number;
  errors: string[];
  stdout: string[];
  stderr: string[];
  events: ProbeEvent[];
  attachments: CasefileAttachment[];
  signature?: string;
  symptom?: string;
  clusterId?: string;
  divergence?: { index: number; expected?: ProbeEvent; actual?: ProbeEvent; summary: string };
};

export type CasefileCluster = {
  id: string;
  symptom: string;
  signature: string;
  count: number;
  tests: string[];
  attempts: string[];
};

export type CasefileData = {
  schema: 1;
  generatedAt: string;
  title: string;
  summary: { tests: number; attempts: number; failures: number; flaky: number; clusters: number };
  clusters: CasefileCluster[];
  attempts: CasefileAttempt[];
  privacy: { tracesIncluded: boolean; videosIncluded: boolean; redactedHeaders: string[]; screenshotMasks: number };
};
