# yvm-yt

Minimal terminal UI for `yt-dlp` built with Ink.

## Requirements

- Node.js `18+`
- `ffmpeg` for merged video downloads and MP3 extraction
- An interactive terminal

## Features

- Paste a YouTube URL
- Pick a curated download preset
- Download in `4K / UHD`, `1080p`, `720p`, or audio-only presets
- Watch live download progress
- Auto-detect or download the `yt-dlp` binary
- Save downloads to your `Downloads` folder

## Usage

After publishing:

```bash
npx yvm-yt
bunx yvm-yt
```

For local development:

```bash
bun run dev
```

## Development

```bash
bun install
bun run check
npm run build
bun run dev
```

## Local CLI Testing

For local testing with the exact package-manager commands:

```bash
npm link
bun link
```

After that, from any directory on your machine:

```bash
npx yvm-yt
bunx yvm-yt
```

## Notes

- `4K / UHD` uses the best stream up to `2160p` and merges to `mkv`
- `MP4 1080p` and `MP4 720p` prefer MP4-compatible streams
- `Audio MP3` converts with `ffmpeg`
- If `yt-dlp` is not installed globally, the app downloads its own binary automatically

## Publish

The published package is built automatically when you pack or publish:

```bash
npm pack
```

To make `npx yvm-yt` and `bunx yvm-yt` work on other machines without linking, publish it to npm:

```bash
npm publish
```
