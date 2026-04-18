import { constants as fsConstants } from 'node:fs';
import { access, chmod, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getAppDirectory } from '../constants.js';
import { YtDlpWrap } from './yt-dlp.js';

export type BinaryStatusHandler = (message: string | null) => void;

let resolvedBinaryPath: string | null = null;
let pendingBinaryResolution: Promise<string> | null = null;

function getCachedBinaryPath() {
  const extension = os.platform() === 'win32' ? '.exe' : '';
  return path.join(getAppDirectory(), `yt-dlp${extension}`);
}

async function isExecutable(filePath: string) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function isWorkingBinary(binaryPath: string) {
  try {
    const version = await new YtDlpWrap(binaryPath).getVersion();
    return Boolean(version.trim());
  } catch {
    return false;
  }
}

async function resolveYtDlpBinaryUncached(onStatus?: BinaryStatusHandler) {
  const cachedBinary = getCachedBinaryPath();
  if ((await isExecutable(cachedBinary)) && (await isWorkingBinary(cachedBinary))) {
    return cachedBinary;
  }

  if (await isWorkingBinary('yt-dlp')) {
    return 'yt-dlp';
  }

  await mkdir(path.dirname(cachedBinary), { recursive: true });
  onStatus?.('Fetching yt-dlp binary...');
  await YtDlpWrap.downloadFromGithub(cachedBinary);

  if (os.platform() !== 'win32') {
    await chmod(cachedBinary, 0o755);
  }

  onStatus?.(null);

  if (!(await isWorkingBinary(cachedBinary))) {
    throw new Error('yt-dlp was downloaded but could not be executed.');
  }

  return cachedBinary;
}

export async function resolveYtDlpBinary(onStatus?: BinaryStatusHandler) {
  if (resolvedBinaryPath) {
    return resolvedBinaryPath;
  }

  if (!pendingBinaryResolution) {
    pendingBinaryResolution = resolveYtDlpBinaryUncached(onStatus)
      .then((binaryPath) => {
        resolvedBinaryPath = binaryPath;
        return binaryPath;
      })
      .finally(() => {
        pendingBinaryResolution = null;
      });
  }

  return pendingBinaryResolution;
}

export function prewarmYtDlpBinary() {
  return resolveYtDlpBinary().catch(() => undefined);
}
