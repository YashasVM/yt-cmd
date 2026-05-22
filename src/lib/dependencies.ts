import { spawnSync, spawn } from 'node:child_process';
import os from 'node:os';

export type DependencyStatus = 'checking' | 'found' | 'missing' | 'installing' | 'installed' | 'failed';

export type DependencyInfo = {
  name: string;
  status: DependencyStatus;
  version?: string;
  error?: string;
};

/**
 * Check whether a binary is available on the system PATH and returns its version.
 */
function probeBinary(command: string, versionArgs: string[]): { available: boolean; version?: string } {
  try {
    const result = spawnSync(command, versionArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      timeout: 10_000,
    });

    if (result.status === 0 && result.stdout) {
      const output = result.stdout.toString().trim();
      // Extract first line or version-like string
      const versionMatch = output.match(/(\d+\.\d+[\w.\-]*)/);
      return { available: true, version: versionMatch?.[1] ?? output.split('\n')[0] };
    }

    return { available: false };
  } catch {
    return { available: false };
  }
}

export function checkFfmpeg(): { available: boolean; version?: string } {
  return probeBinary('ffmpeg', ['-version']);
}

export function checkYtDlp(): { available: boolean; version?: string } {
  return probeBinary('yt-dlp', ['--version']);
}

export function checkNodeVersion(): { available: boolean; version?: string } {
  const version = process.version;
  const major = Number.parseInt(version.slice(1).split('.')[0] ?? '0', 10);
  return { available: major >= 18, version };
}

/**
 * Returns the appropriate install command for ffmpeg on the current platform.
 */
export function getFfmpegInstallCommand(): { command: string; args: string[]; description: string } | null {
  const platform = os.platform();

  if (platform === 'win32') {
    return {
      command: 'winget',
      args: ['install', '--id', 'Gyan.FFmpeg', '-e', '--accept-source-agreements', '--accept-package-agreements'],
      description: 'winget install Gyan.FFmpeg',
    };
  }

  if (platform === 'darwin') {
    return {
      command: 'brew',
      args: ['install', 'ffmpeg'],
      description: 'brew install ffmpeg',
    };
  }

  // On Linux, we can't reliably auto-install without sudo.
  return null;
}

/**
 * Attempt to install ffmpeg. Returns a promise that resolves when done.
 * Uses a callback to stream install output lines.
 */
export function installFfmpeg(
  onOutput?: (line: string) => void,
): Promise<{ success: boolean; error?: string }> {
  const installInfo = getFfmpegInstallCommand();

  if (!installInfo) {
    return Promise.resolve({
      success: false,
      error: 'Auto-install is not supported on this platform. Install ffmpeg manually:\n  sudo apt install ffmpeg  (Debian/Ubuntu)\n  sudo pacman -S ffmpeg    (Arch)\n  sudo dnf install ffmpeg  (Fedora)',
    });
  }

  return new Promise((resolve) => {
    onOutput?.(`Running: ${installInfo.description}`);

    const child = spawn(installInfo.command, installInfo.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        onOutput?.(line);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      const lines = data.toString().split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        onOutput?.(line);
      }
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        error: `Failed to run ${installInfo.command}: ${err.message}`,
      });
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Verify it's actually available now
        const check = checkFfmpeg();
        if (check.available) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: 'Install command completed but ffmpeg is still not found. You may need to restart your terminal.',
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr.trim() || `Install exited with code ${code ?? 'unknown'}.`,
        });
      }
    });
  });
}

export function ensureFfmpegAvailable(): void {
  const result = spawnSync('ffmpeg', ['-version'], {
    stdio: 'ignore',
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new MissingFfmpegError();
  }
}

export class MissingFfmpegError extends Error {
  constructor() {
    super('ffmpeg is required but not installed. Re-launch the app to auto-install it.');
    this.name = 'MissingFfmpegError';
  }
}
