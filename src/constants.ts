import os from 'node:os';
import path from 'node:path';

export const APP_DIR_NAME = '.yt-dlp-tui';
export const APP_NAME = 'yvm-yt';
export const OUTPUT_TEMPLATE = '%(title).180B [%(id)s].%(ext)s';
export const YTDLP_COMMON_ARGS = ['--no-playlist', '--newline', '--js-runtimes', 'node'];

export const link = (text: string, url: string) =>
  `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`;

export type FormatPreset = {
  id: string;
  label: string;
  description: string;
  args: string[];
  requiresFfmpeg?: boolean;
};

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'best',
    label: 'Best quality',
    description: 'Highest available quality with automatic merge when needed.',
    args: ['-f', 'bv*+ba/b'],
    requiresFfmpeg: true,
  },
  {
    id: 'mp4-1080',
    label: 'MP4 1080p',
    description: 'Prefer MP4 video/audio streams up to 1080p.',
    args: [
      '-f',
      'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]',
      '--merge-output-format',
      'mp4',
    ],
    requiresFfmpeg: true,
  },
  {
    id: 'mp4-720',
    label: 'MP4 720p',
    description: 'Smaller MP4 download capped at 720p.',
    args: [
      '-f',
      'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]',
      '--merge-output-format',
      'mp4',
    ],
    requiresFfmpeg: true,
  },
  {
    id: 'audio-mp3',
    label: 'Audio MP3',
    description: 'Extract audio and convert it to MP3.',
    args: ['-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3'],
    requiresFfmpeg: true,
  },
  {
    id: 'audio-original',
    label: 'Original audio',
    description: 'Download the best audio-only stream without conversion.',
    args: ['-f', 'bestaudio/best'],
  },
];

export function getAppDirectory(): string {
  return path.join(os.homedir(), APP_DIR_NAME);
}

export function getDefaultDownloadDirectory(): string {
  return path.join(os.homedir(), 'Downloads');
}
