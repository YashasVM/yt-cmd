import { constants as fsConstants } from 'node:fs';
import { access, chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { getAppDirectory } from '../constants.js';
import { YtDlpWrap } from './yt-dlp.js';

export type BinaryStatusHandler = (message: string | null) => void;

const execFileAsync = promisify(execFile);
const UPDATE_MARKER_FILE = '.yt-dlp-last-update';
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SELF_UPDATE_TIMEOUT_MS = 120_000;

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

function getUpdateMarkerPath() {
  return path.join(getAppDirectory(), UPDATE_MARKER_FILE);
}

async function isUpdateCheckDue() {
  try {
    const raw = await readFile(getUpdateMarkerPath(), 'utf8');
    const lastCheck = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(lastCheck)) {
      return true;
    }

    return Date.now() - lastCheck >= UPDATE_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function markUpdateChecked() {
  try {
    await mkdir(path.dirname(getUpdateMarkerPath()), { recursive: true });
    await writeFile(getUpdateMarkerPath(), String(Date.now()), 'utf8');
  } catch {
    // A missed marker only means we check again next launch.
  }
}

async function selfUpdate(binaryPath: string) {
  await execFileAsync(binaryPath, ['-U'], {
    windowsHide: true,
    timeout: SELF_UPDATE_TIMEOUT_MS,
  });
}

/**
 * Keeps the cached yt-dlp binary fresh. YouTube breaks older releases with
 * HTTP 403 errors, so the binary is self-updated at most once a day.
 */
export async function updateYtDlpIfStale(onStatus?: BinaryStatusHandler) {
  const binaryPath = await resolveYtDlpBinary(onStatus);

  if (!(await isUpdateCheckDue())) {
    return false;
  }

  onStatus?.('Updating yt-dlp...');
  try {
    await selfUpdate(binaryPath);
  } catch {
    // Self-update failures (offline, no permissions) are non-fatal; the
    // existing binary keeps working until it stops, then it is re-fetched.
  } finally {
    onStatus?.(null);
    await markUpdateChecked();
  }

  if (!(await isWorkingBinary(binaryPath))) {
    throw new Error('yt-dlp stopped working after an update attempt.');
  }

  return true;
}

export function prewarmYtDlpBinary(onStatus?: BinaryStatusHandler) {
  return updateYtDlpIfStale(onStatus).then(
    () => true,
    () => false,
  );
}
