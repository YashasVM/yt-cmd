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
npm run build
bun run dev
```

## Run As A CLI

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

## Publish

The published package is built automatically when you pack or publish:

```bash
npm pack
```

To make `npx yvm-yt` and `bunx yvm-yt` work on other machines without linking, publish it to npm:

```bash
npm publish
```
