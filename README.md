# yvm-yt

Terminal UI for downloading YouTube videos with `yt-dlp`.

## Install And Run

This section is for someone who just wants to use the app.

### 1. Install Node.js

You need Node.js `18` or newer because the app is launched with `npx`.

Download Node.js from `https://nodejs.org/`.

### 2. Install ffmpeg

`ffmpeg` is required for:

- `4K / UHD`
- `Best quality`
- `MP4 1080p`
- `MP4 720p`
- `Audio MP3`

Install it with one of these:

```bash
# Windows (winget)
winget install Gyan.FFmpeg

# macOS (Homebrew)
brew install ffmpeg

# Ubuntu / Debian
sudo apt install ffmpeg
```

### 3. Run the app

```bash
npx yvm-yt
```

If you use Bun instead of Node:

```bash
bunx yvm-yt
```

### 4. Use it

1. Paste a YouTube URL.
2. Pick a format.
3. Wait for the download to finish.

Downloads are saved to your default `Downloads` folder.

### Available formats

- `Best quality`: highest available quality with merge when needed
- `4K / UHD`: up to `2160p`, merged to `mkv`
- `MP4 1080p`: MP4-friendly video/audio up to `1080p`
- `MP4 720p`: MP4-friendly video/audio up to `720p`
- `Audio MP3`: extracts audio and converts to MP3
- `Original audio`: best audio-only stream without conversion

### Notes

- The app accepts only `http(s)` YouTube URLs.
- If `yt-dlp` is not installed globally, the app downloads its own binary automatically.
- You must run it in an interactive terminal.

## Developer Guide

This section is for working on the project itself.

### Install dependencies

```bash
bun install
npm install
```

`bun install` maintains `bun.lock`.

`npm install` maintains `package-lock.json` so `npm audit` and npm-based packaging work correctly.

### Local development

```bash
bun run dev
```

### Validate the project

```bash
npm run check
npm run build
npm run audit
```

### Test the packaged CLI locally

Register the package globally on your machine:

```bash
npm link
bun link
```

Then run it from any directory:

```bash
npx yvm-yt
bunx yvm-yt
```

### Package and publish

Build output is created automatically when you pack or publish.

```bash
npm pack
npm publish
```
