import os from 'node:os';
import path from 'node:path';

export const APP_DIR_NAME = '.yt-dlp-tui';
export const APP_NAME = 'yvm-yt';
export const OUTPUT_TEMPLATE = '%(title).180B [%(id)s].%(ext)s';
export const YTDLP_COMMON_ARGS = ['--no-playlist', '--newline', '--js-runtimes', 'node'];

export const link = (text: string, url: string) =>
  `\u001B]8;;${url}\u001B\\${text}\u001B]8;;\u001B\\`;

export type ContainerFormat = 'mp4' | 'mkv';

export const CONTAINER_OPTIONS: { value: ContainerFormat; label: string; description: string }[] = [
  { value: 'mp4', label: 'MP4', description: 'Widely compatible — plays everywhere, slightly larger files.' },
  { value: 'mkv', label: 'MKV', description: 'Flexible container — supports more codecs, ideal for archiving.' },
];

export type FormatPreset = {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: 'video' | 'audio';
  args: string[];
  requiresFfmpeg?: boolean;
};

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'best',
    label: 'Best quality',
    icon: '⬆',
    type: 'video',
    description: 'Highest available quality — merges video + audio streams.',
    args: ['-f', 'bv*+ba/b'],
    requiresFfmpeg: true,
  },
  {
    id: 'uhd-4k',
    label: '4K / UHD',
    icon: '✦',
    type: 'video',
    description: 'Up to 2160p — crisp ultra-high definition.',
    args: [
      '-f',
      'bestvideo[height<=2160]+bestaudio/best[height<=2160]',
    ],
    requiresFfmpeg: true,
  },
  {
    id: 'fhd-1080',
    label: '1080p Full HD',
    icon: '▸',
    type: 'video',
    description: 'Up to 1080p — great balance of quality and size.',
    args: [
      '-f',
      'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    ],
    requiresFfmpeg: true,
  },
  {
    id: 'hd-720',
    label: '720p HD',
    icon: '▸',
    type: 'video',
    description: 'Up to 720p — smaller download, still sharp.',
    args: [
      '-f',
      'bestvideo[height<=720]+bestaudio/best[height<=720]',
    ],
    requiresFfmpeg: true,
  },
  {
    id: 'audio-mp3',
    label: 'Audio — MP3',
    icon: '♫',
    type: 'audio',
    description: 'Extract audio as MP3 (192 kbps).',
    args: ['-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '2'],
    requiresFfmpeg: true,
  },
  {
    id: 'audio-mp3-hq',
    label: 'Audio — MP3 HQ',
    icon: '♫',
    type: 'audio',
    description: 'Extract audio as high-quality MP3 (320 kbps).',
    args: ['-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0'],
    requiresFfmpeg: true,
  },
];

export function getAppDirectory(): string {
  return path.join(os.homedir(), APP_DIR_NAME);
}

export function getDefaultDownloadDirectory(): string {
  return path.join(os.homedir(), 'Downloads');
}
