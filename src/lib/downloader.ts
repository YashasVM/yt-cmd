import { spawnSync } from 'node:child_process';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import type { FormatPreset } from '../constants.js';
import {
  getDefaultDownloadDirectory,
  OUTPUT_TEMPLATE,
  YTDLP_COMMON_ARGS,
} from '../constants.js';
import { resolveYtDlpBinary, type BinaryStatusHandler } from './binary.js';
import {
  YtDlpWrap,
  type YtDlpEventEmitter,
} from './yt-dlp.js';
import { normalizeAndValidateVideoUrl } from './url.js';

export type VideoInfo = {
  id: string;
  title: string;
  duration?: number;
  uploader?: string;
};

export type DownloadProgress = {
  percent: number;
  currentSpeed?: string;
  eta?: string;
  totalSize?: string;
  downloadedSize?: string;
};

export type DownloadResult = {
  filePath?: string;
  outputDirectory: string;
  title: string;
};

export type DownloadCallbacks = {
  onBinaryStatus?: BinaryStatusHandler;
  onProgress?: (progress: DownloadProgress) => void;
  onOutputPath?: (filePath: string) => void;
};

export type DownloadTask = {
  promise: Promise<DownloadResult>;
  cancel: () => Promise<void>;
};

export class MissingFfmpegError extends Error {
  constructor() {
    super('Install ffmpeg: sudo apt install ffmpeg / brew install ffmpeg');
    this.name = 'MissingFfmpegError';
  }
}

export class DownloadCancelledError extends Error {
  constructor() {
    super('Download cancelled.');
    this.name = 'DownloadCancelledError';
  }
}

const METADATA_TIMEOUT_MS = 20_000;
const YTDLP_METADATA_ARGS = [
  '--no-playlist',
  '--skip-download',
  '--no-check-formats',
  '--no-warnings',
  '--socket-timeout',
  '15',
] as const;
const METADATA_TEMPLATE =
  '{"id":%(id)j,"title":%(title)j,"duration":%(duration)j,"uploader":%(uploader|)j}';

function ensureFfmpegInstalled() {
  const result = spawnSync('ffmpeg', ['-version'], {
    stdio: 'ignore',
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new MissingFfmpegError();
  }
}

function normalizePath(candidate: string) {
  return candidate.replace(/^"|"$/g, '').trim();
}

function extractOutputPath(eventData: string) {
  const patterns = [
    /^Destination:\s+(.+)$/i,
    /^Merging formats into\s+"(.+)"$/i,
    /^Destination:\s+"(.+)"$/i,
  ];

  for (const pattern of patterns) {
    const match = eventData.match(pattern);
    if (match?.[1]) {
      return normalizePath(match[1]);
    }
  }

  return undefined;
}

function sanitizeProgressValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || /^unknown/i.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function parseDownloadProgressEvent(eventData: string): Partial<DownloadProgress> | undefined {
  const normalized = eventData.trim();

  const etaMatch = normalized.match(
    /^(\d+(?:\.\d+)?)%\s+of\s+(~?\s*.+?)\s+at\s+(.+?)\s+ETA\s+(.+)$/i,
  );
  if (etaMatch) {
    return {
      percent: Number.parseFloat(etaMatch[1]),
      totalSize: sanitizeProgressValue(etaMatch[2]?.replace(/^~\s*/, '')),
      currentSpeed: sanitizeProgressValue(etaMatch[3]),
      eta: sanitizeProgressValue(etaMatch[4]),
    };
  }

  const completedMatch = normalized.match(
    /^(\d+(?:\.\d+)?)%\s+of\s+(~?\s*.+?)\s+in\s+(.+?)\s+at\s+(.+)$/i,
  );
  if (completedMatch) {
    return {
      percent: Number.parseFloat(completedMatch[1]),
      totalSize: sanitizeProgressValue(completedMatch[2]?.replace(/^~\s*/, '')),
      currentSpeed: sanitizeProgressValue(completedMatch[4]),
      eta: undefined,
    };
  }

  const sizeOnlyMatch = normalized.match(/^(\d+(?:\.\d+)?)%\s+of\s+(~?\s*.+)$/i);
  if (sizeOnlyMatch) {
    return {
      percent: Number.parseFloat(sizeOnlyMatch[1]),
      totalSize: sanitizeProgressValue(sizeOnlyMatch[2]?.replace(/^~\s*/, '')),
    };
  }

  return undefined;
}

async function ensureOutputDirectory(outputDirectory: string) {
  try {
    const directoryStat = await stat(outputDirectory);
    if (!directoryStat.isDirectory()) {
      throw new Error(`Download path is not a directory: ${outputDirectory}`);
    }

    return;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  try {
    await mkdir(outputDirectory, { recursive: true });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EEXIST'
    ) {
      const directoryStat = await stat(outputDirectory);
      if (directoryStat.isDirectory()) {
        return;
      }
    }

    throw error;
  }
}

async function cleanupPartialFiles(outputDirectory: string, videoId: string) {
  try {
    const entries = await readdir(outputDirectory, { withFileTypes: true });
    const removals = entries
      .filter((entry) => {
        if (!entry.isFile()) {
          return false;
        }

        const matchesVideo = entry.name.includes(`[${videoId}]`);
        const looksPartial =
          entry.name.endsWith('.part') ||
          entry.name.includes('.part-Frag') ||
          entry.name.endsWith('.ytdl');

        return matchesVideo && looksPartial;
      })
      .map((entry) => rm(path.join(outputDirectory, entry.name), { force: true }));

    await Promise.all(removals);
  } catch {
    // Ignore cleanup failures on exit paths.
  }
}

async function findCompletedFile(outputDirectory: string, videoId: string) {
  const entries = await readdir(outputDirectory, { withFileTypes: true });
  const match = entries.find((entry) => {
    if (!entry.isFile()) {
      return false;
    }

    return entry.name.includes(`[${videoId}]`) && !entry.name.endsWith('.part');
  });

  return match ? path.join(outputDirectory, match.name) : undefined;
}

export async function fetchVideoInfo(
  url: string,
  onBinaryStatus?: BinaryStatusHandler,
): Promise<VideoInfo> {
  const safeUrl = normalizeAndValidateVideoUrl(url);
  const binaryPath = await resolveYtDlpBinary(onBinaryStatus);
  const ytDlp = new YtDlpWrap(binaryPath);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);

  let stdout: string;
  try {
    stdout = await ytDlp.execPromise(
      [
        ...YTDLP_METADATA_ARGS,
        '--print',
        METADATA_TEMPLATE,
        safeUrl,
      ],
      { windowsHide: true },
      controller.signal,
    );
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Reading video info timed out. Check the URL or your connection and try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const metadataLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!metadataLine) {
    throw new Error('yt-dlp returned empty metadata.');
  }

  const info = JSON.parse(metadataLine) as {
    id?: string;
    title?: string;
    duration?: number;
    uploader?: string;
  };

  return {
    id: String(info.id ?? ''),
    title: String(info.title ?? 'Untitled video'),
    duration: typeof info.duration === 'number' ? info.duration : undefined,
    uploader: typeof info.uploader === 'string' ? info.uploader : undefined,
  };
}

export function downloadVideo({
  url,
  preset,
  videoInfo,
  outputDirectory = getDefaultDownloadDirectory(),
}: {
  url: string;
  preset: FormatPreset;
  videoInfo: VideoInfo;
  outputDirectory?: string;
}, callbacks: DownloadCallbacks = {}): DownloadTask {
  const safeUrl = normalizeAndValidateVideoUrl(url);
  let emitter: YtDlpEventEmitter | undefined;
  let cleanedUp = false;
  let knownOutputPath: string | undefined;
  let wasCancelled = false;
  let latestProgress: DownloadProgress = { percent: 0 };
  const controller = new AbortController();

  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    await cleanupPartialFiles(outputDirectory, videoInfo.id);
  };

  const promise = (async () => {
    if (preset.requiresFfmpeg) {
      ensureFfmpegInstalled();
    }

    await ensureOutputDirectory(outputDirectory);
    const binaryPath = await resolveYtDlpBinary(callbacks.onBinaryStatus);
    const ytDlp = new YtDlpWrap(binaryPath);
    const args = [
      ...YTDLP_COMMON_ARGS,
      ...preset.args,
      '--paths',
      outputDirectory,
      '-o',
      OUTPUT_TEMPLATE,
      '--',
      safeUrl,
    ];

    emitter = ytDlp.exec(args, undefined, controller.signal);

    emitter.on('ytDlpEvent', (eventType: string, eventData: string) => {
      const candidate = extractOutputPath(eventData);
      if (candidate) {
        knownOutputPath = path.isAbsolute(candidate)
          ? candidate
          : path.join(outputDirectory, candidate);
        callbacks.onOutputPath?.(knownOutputPath);
      }

      if (eventType !== 'download') {
        return;
      }

      const parsedProgress = parseDownloadProgressEvent(eventData);
      if (parsedProgress) {
        latestProgress = {
          ...latestProgress,
          ...parsedProgress,
          percent: parsedProgress.percent ?? latestProgress.percent,
        };
        callbacks.onProgress?.(latestProgress);
      }
    });

    const code = await new Promise<number | null>((resolve, reject) => {
      emitter?.once('error', reject);
      emitter?.once('close', resolve);
    });

    if (code !== 0) {
      if (wasCancelled) {
        throw new DownloadCancelledError();
      }

      throw new Error(`yt-dlp exited with code ${code ?? 'unknown'}.`);
    }

    const resolvedPath =
      knownOutputPath ?? (await findCompletedFile(outputDirectory, videoInfo.id));

    return {
      filePath: resolvedPath,
      outputDirectory,
      title: videoInfo.title,
    };
  })().catch(async (error) => {
    await cleanup();
    throw error;
  });

  return {
    promise,
    cancel: async () => {
      wasCancelled = true;
      controller.abort();

      if (emitter?.ytDlpProcess && !emitter.ytDlpProcess.killed) {
        emitter.ytDlpProcess.kill('SIGINT');
      }

      await cleanup();
    },
  };
}
