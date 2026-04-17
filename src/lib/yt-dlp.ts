import { EventEmitter } from 'node:events';
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptionsWithoutStdio,
} from 'node:child_process';
import { createRequire } from 'node:module';

export type YtDlpProgressEvent = {
  percent?: number;
  totalSize?: string;
  currentSpeed?: string;
  eta?: string;
};

export type YtDlpEventEmitter = EventEmitter & {
  ytDlpProcess?: ChildProcessWithoutNullStreams;
  on(event: 'progress', listener: (progress: YtDlpProgressEvent) => void): YtDlpEventEmitter;
  on(
    event: 'ytDlpEvent',
    listener: (eventType: string, eventData: string) => void,
  ): YtDlpEventEmitter;
  on(event: 'error', listener: (error: Error) => void): YtDlpEventEmitter;
  on(event: 'close', listener: (code: number | null) => void): YtDlpEventEmitter;
  once(event: 'error', listener: (error: Error) => void): YtDlpEventEmitter;
  once(event: 'close', listener: (code: number | null) => void): YtDlpEventEmitter;
};

type YtDlpInstance = {
  getVersion(): Promise<string>;
  getVideoInfo(args: string | string[]): Promise<Record<string, unknown>>;
  exec(
    args?: string[],
    options?: SpawnOptionsWithoutStdio,
    abortSignal?: AbortSignal | null,
  ): YtDlpEventEmitter;
};

type YtDlpConstructor = {
  new (binaryPath?: string): YtDlpInstance;
  downloadFromGithub(
    filePath?: string,
    version?: string,
    platform?: NodeJS.Platform,
  ): Promise<void>;
};

const require = createRequire(import.meta.url);

export const YtDlpWrap = require('yt-dlp-wrap').default as YtDlpConstructor;
