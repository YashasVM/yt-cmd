# yvm-yt

Minimal terminal UI for `yt-dlp` built with Ink.

## Features

- Paste a YouTube URL
- Pick a curated download preset
- Watch live download progress
- Auto-detect or download the `yt-dlp` binary

## Development

```bash
bun install
bun run check
bun run build
bun run dev
```

## Publish

The published package entry point is built with:

```bash
bun build bin/index.ts --outdir dist --target node
```
