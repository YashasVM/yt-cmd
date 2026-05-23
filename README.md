<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/yvm--yt-YouTube_Downloader_for_Your_Terminal-FF0044?style=for-the-badge&labelColor=0A0A0F&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjRkYwMDQ0IiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjIiIHk9IjQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxNiIgcng9IjIiLz48cGF0aCBkPSJNMTAgOGw2IDQtNiA0VjhaIiBmaWxsPSIjRkYwMDQ0Ii8+PC9zdmc+">
  <img alt="yvm-yt Banner" src="https://img.shields.io/badge/yvm--yt-YouTube_Downloader_for_Your_Terminal-FF0044?style=for-the-badge&labelColor=0A0A0F">
</picture>

### Download YouTube videos and audio from your terminal

[![Version](https://img.shields.io/badge/version-1.0.0-FF0044?style=flat-square&labelColor=1a1a2e)](https://github.com/YashasVM/yt-cmd)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&labelColor=1a1a2e)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%2B%20macOS%20%2B%20Linux-green?style=flat-square&labelColor=1a1a2e)](https://github.com/YashasVM/yt-cmd)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-orange?style=flat-square&labelColor=1a1a2e)](https://nodejs.org)

**Interactive** · **Auto-installs dependencies** · **Always outputs MP4/MP3** · **Zero config**

---

</div>

> [!IMPORTANT]
> **yvm-yt** requires an interactive terminal. It will not work inside piped commands or non-TTY environments.

## What is yvm-yt?

A terminal UI that wraps `yt-dlp` to make downloading YouTube videos dead simple. Paste a URL, pick a quality, get your file. No flags to memorize, no format strings to write.

```
Paste URL  →  Pick Quality  →  Download  →  Done
```

The app **auto-installs** `yt-dlp` and offers to install `ffmpeg` if they're missing. Videos always output as **MP4** (MKV fallback). Audio always outputs as **MP3**.

---

## Quick Start

### One command

```bash
npx yvm-yt
```

That's it. If you use Bun:

```bash
bunx yvm-yt
```

> [!TIP]
> You can also run it as `npx yt-cmd` or `bunx yt-cmd` — both aliases work.

---

## Features

| Feature | Details |
|---|---|
| **Quality Picker** | Best, 4K, 1080p, 720p — resolution is always respected |
| **Audio Extraction** | MP3 at 192 kbps (standard) or 320 kbps (high quality) |
| **Smart Formats** | Videos → MP4 (MKV fallback) · Audio → MP3 — always editor-friendly |
| **Dependency Check** | Detects `yt-dlp` and `ffmpeg` on startup, auto-installs if missing |
| **Auto yt-dlp** | Downloads its own `yt-dlp` binary if not installed globally |
| **ffmpeg Installer** | Offers one-key install via `winget` (Windows) or `brew` (macOS) |
| **Progress Display** | Live progress bar with speed, ETA, and file size |
| **Clean Cancellation** | Ctrl+C cleans up partial files automatically |
| **URL Validation** | Only accepts valid YouTube URLs — no accidental downloads |

---

## User Flow

```
┌─────────────────────┐
│  Dependency Check   │  Checks Node.js, yt-dlp, ffmpeg
│                     │  Auto-installs if missing
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Welcome            │  Paste a YouTube URL
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Quality Picker     │  ⬆ Best · ✦ 4K · ▸ 1080p · ▸ 720p
│                     │  ♫ MP3 · ♫ MP3 HQ
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Downloading        │  Progress bar + speed + ETA
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Done               │  ✓ File saved to ~/Downloads
└─────────────────────┘
```

---

## Available Formats

### Video

| Preset | Resolution | Output | Requires |
|---|---|---|---|
| **Best quality** | Highest available | MP4 (MKV fallback) | ffmpeg |
| **4K / UHD** | Up to 2160p | MP4 (MKV fallback) | ffmpeg |
| **1080p Full HD** | Up to 1080p | MP4 (MKV fallback) | ffmpeg |
| **720p HD** | Up to 720p | MP4 (MKV fallback) | ffmpeg |

### Audio

| Preset | Quality | Output | Requires |
|---|---|---|---|
| **Audio — MP3** | 192 kbps | MP3 | ffmpeg |
| **Audio — MP3 HQ** | 320 kbps | MP3 | ffmpeg |

> [!NOTE]
> All video presets merge the best video and audio streams at the selected resolution. The output is always MP4 — if the codecs can't fit in MP4, it falls back to MKV automatically.

---

## Architecture

```
bin/index.ts              Entry point — renders the Ink app
src/
├── App.tsx               Main app component — screen state machine
├── constants.ts          Format presets, paths, config
├── lib/
│   ├── binary.ts         yt-dlp binary resolution + auto-download
│   ├── dependencies.ts   Dependency detection + auto-install (ffmpeg, yt-dlp)
│   ├── downloader.ts     Download engine — progress parsing, cleanup
│   ├── url.ts            YouTube URL validation
│   └── yt-dlp.ts         yt-dlp-wrap bridge
└── screens/
    ├── DependencyCheck.tsx   Startup dependency verification
    ├── Welcome.tsx           URL input with ASCII art
    ├── FormatPicker.tsx      Quality/format selection
    ├── Downloading.tsx       Progress display
    └── Done.tsx              Success/error result
```

### Output Defaults

| Type | Format | Strategy |
|---|---|---|
| Video | MP4 | `--merge-output-format mp4/mkv` — prefers MP4, falls back to MKV |
| Audio | MP3 | `--extract-audio --audio-format mp3` — always converts to MP3 |
| Download path | `~/Downloads` | User's default Downloads folder |

---

## Developer Guide

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) (optional, for faster dev)

### Install dependencies

```bash
npm install
```

### Local development

```bash
bun run dev
```

### Validate

```bash
npx tsc --noEmit       # Type check
npx tsc -p tsconfig.build.json  # Production build
npm audit              # Security check
```

### Test the packaged CLI locally

```bash
npm link
npx yvm-yt
# or
npx yt-cmd
```

### Build and publish

```bash
npm pack       # Creates tarball
npm publish    # Publishes to npm
```

> [!NOTE]
> The `prepack` script runs the build automatically before `npm pack` or `npm publish`.

---

## Dependency Auto-Install

The app checks for required tools on startup:

| Tool | Detection | Auto-Install |
|---|---|---|
| **Node.js** | Always present (we're running on it) | — |
| **yt-dlp** | Checks `PATH`, then `~/.yt-dlp-tui/yt-dlp` | Downloads binary from GitHub |
| **ffmpeg** | Checks `PATH` via `ffmpeg -version` | `winget` (Windows) · `brew` (macOS) · Manual (Linux) |

On **Linux**, ffmpeg auto-install requires `sudo` which the app won't run. It shows manual install instructions instead:

```bash
sudo apt install ffmpeg     # Debian / Ubuntu
sudo pacman -S ffmpeg       # Arch
sudo dnf install ffmpeg     # Fedora
```

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made by [@yashas.vm](https://github.com/YashasVM)**

*YouTube downloads without the hassle. Just paste and go.*
Based on [Yt-Dlp](https://github.com/yt-dlp/yt-dlp)
</div>
