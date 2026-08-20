# HOLEN DL

The terminal downloader in the [Holen suite](https://github.com/YashasVM/HOLEN).

Paste a video URL, pick a format, and download. Powered by `yt-dlp`, with a clean interactive UI and automatic dependency setup.

## Run it

```bash
npx holen-dl
```

Also available as `npx yvm-yt` and `npx yt-cmd`.

## What it does

- Downloads video or audio from supported `yt-dlp` sites
- Offers quality presets, custom resolution, MP4, MKV, and MP3
- Finds or downloads `yt-dlp` automatically; helps install `ffmpeg`
- Saves files to `~/Downloads`

## Develop

```bash
npm install
npm run dev
npm run check
```

MIT License · Built with [yt-dlp](https://github.com/yt-dlp/yt-dlp)
