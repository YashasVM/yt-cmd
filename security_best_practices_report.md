# Security Best Practices Report

## Executive Summary

The codebase is small and has a limited attack surface. I found two actionable issues in the local application code and fixed both:

- untrusted URL input could reach `yt-dlp` argument parsing without a hard option terminator
- the `ffmpeg` presence check used a shell-based process spawn on Windows even though no shell was needed

Dependency audit status after generating `package-lock.json`: `0` known vulnerabilities from `npm audit`.

## Medium Severity

### SBP-001: Missing downloader-side URL validation and argument termination

Impact: a caller that bypasses the UI validation could feed option-like input into `yt-dlp` and change downloader behavior.

- Rule ID: `SBP-001`
- Severity: `Medium`
- Location: [src/lib/downloader.ts](/abs/path/C:/Users/YashasVM/Downloads/code/yt/src/lib/downloader.ts:186) and [src/lib/downloader.ts](/abs/path/C:/Users/YashasVM/Downloads/code/yt/src/lib/downloader.ts:203)
- Evidence:

```ts
const info = await ytDlp.getVideoInfo([...YTDLP_COMMON_ARGS, url]);
```

```ts
const args = [
  ...YTDLP_COMMON_ARGS,
  ...preset.args,
  '--paths',
  outputDirectory,
  '-o',
  OUTPUT_TEMPLATE,
  url,
];
```

- Impact: a string beginning with `-` can be interpreted by `yt-dlp` as additional flags instead of a URL when the exported downloader functions are called outside the current UI path.
- Fix: validate the URL again in the downloader layer and insert `--` before the media URL to terminate option parsing.
- Mitigation: keep the UI-side validation as an early rejection path, but do not rely on it as the only boundary.
- False positive notes: the current UI already restricted input to YouTube URLs, so the exploit path was limited to alternate callers or future refactors. The exported functions still needed defense in depth.

## Low Severity

### SBP-002: Shell-based ffmpeg availability check

- Rule ID: `SBP-002`
- Severity: `Low`
- Location: [src/lib/downloader.ts](/abs/path/C:/Users/YashasVM/Downloads/code/yt/src/lib/downloader.ts:64)
- Evidence:

```ts
const result = spawnSync('ffmpeg', ['-version'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});
```

- Impact: spawning through a shell broadens the command-execution surface unnecessarily.
- Fix: call `spawnSync` directly without `shell` and keep the check hidden with `windowsHide`.
- Mitigation: continue passing arguments as an array and avoid shell mode for fixed binary probes.
- False positive notes: the command and arguments were static, so this was hardening rather than a demonstrated remote exploit.

## Dependency Review

- `npm audit` result: `0` known vulnerabilities
- A committed `package-lock.json` is now present so npm installs are reproducible and audits work reliably
- An `npm run audit` script was added for repeatable checks

## Residual Risk

- The project can auto-download a `yt-dlp` binary from GitHub when no local binary is present. That behavior is convenient, but it still depends on trusting the upstream download path. Verify your release and distribution policy around that behavior if you want stronger supply-chain controls.
