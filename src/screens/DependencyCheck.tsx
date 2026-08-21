import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Spinner } from '@inkjs/ui';
import {
  checkFfmpeg,
  checkNodeVersion,
  checkYtDlp,
  getFfmpegInstallCommand,
  installFfmpeg,
  type DependencyStatus,
} from '../lib/dependencies.js';
import { prewarmYtDlpBinary } from '../lib/binary.js';

type DepEntry = {
  name: string;
  status: DependencyStatus;
  version?: string;
  error?: string;
};

const STATUS_ICON: Record<DependencyStatus, string> = {
  checking: '○',
  found: '●',
  missing: '✗',
  installing: '◐',
  installed: '●',
  failed: '✗',
};

const STATUS_COLOR: Record<DependencyStatus, string> = {
  checking: 'gray',
  found: 'green',
  missing: 'yellow',
  installing: 'cyan',
  installed: 'green',
  failed: 'red',
};

function StatusLine({ dep }: { dep: DepEntry }) {
  const color = STATUS_COLOR[dep.status];
  const icon = STATUS_ICON[dep.status];

  return (
    <Box>
      <Text color={color}>{icon} </Text>
      <Text color={color} bold>
        {dep.name}
      </Text>
      {dep.version ? (
        <Text color="gray"> v{dep.version}</Text>
      ) : null}
      {dep.status === 'missing' ? (
        <Text color="yellow"> — not found</Text>
      ) : null}
      {dep.status === 'installing' ? (
        <Text color="cyan"> — installing…</Text>
      ) : null}
      {dep.status === 'installed' ? (
        <Text color="green"> — just installed</Text>
      ) : null}
      {dep.status === 'failed' ? (
        <Text color="red"> — install failed</Text>
      ) : null}
    </Box>
  );
}

export function DependencyCheck({ onReady }: { onReady: () => void }) {
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;

  const [deps, setDeps] = useState<DepEntry[]>([
    { name: 'Node.js', status: 'checking' },
    { name: 'yt-dlp', status: 'checking' },
    { name: 'ffmpeg', status: 'checking' },
  ]);

  const [installLog, setInstallLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<'checking' | 'needs-install' | 'installing' | 'ready' | 'failed'>('checking');
  const [failMessage, setFailMessage] = useState<string | null>(null);

  // Phase 1: Check all dependencies
  useEffect(() => {
    if (phase !== 'checking') return;

    void (async () => {
      const nodeResult = checkNodeVersion();
      const node: DepEntry = {
        name: 'Node.js',
        status: nodeResult.available ? 'found' : 'missing',
        version: nodeResult.version,
      };

      const ytdlpResult = checkYtDlp();
      let ytdlp: DepEntry;
      if (ytdlpResult.available) {
        ytdlp = { name: 'yt-dlp', status: 'found', version: ytdlpResult.version };
      } else {
        ytdlp = (await prewarmYtDlpBinary())
          ? { name: 'yt-dlp', status: 'installed' }
          : { name: 'yt-dlp', status: 'failed', error: 'Could not download yt-dlp binary.' };
      }

      const ffmpegResult = checkFfmpeg();
      const ffmpeg: DepEntry = ffmpegResult.available
        ? { name: 'ffmpeg', status: 'found', version: ffmpegResult.version }
        : { name: 'ffmpeg', status: 'missing' };
      const nextDeps = [node, ytdlp, ffmpeg];
      setDeps(nextDeps);

      if (!nodeResult.available || ytdlp.status === 'failed') {
        setFailMessage(!nodeResult.available ? 'Node.js 22 or newer is required.' : 'Could not download yt-dlp binary.');
        setPhase('failed');
      } else if (!ffmpegResult.available) {
        if (getFfmpegInstallCommand()) {
          setPhase('needs-install');
        } else {
          setFailMessage(
            'ffmpeg is not installed. Install it manually:\n  sudo apt install ffmpeg  (Debian/Ubuntu)\n  sudo pacman -S ffmpeg    (Arch)\n  sudo dnf install ffmpeg  (Fedora)',
          );
          setPhase('failed');
        }
      } else {
        setPhase('ready');
      }
    })();
  }, [phase]);

  // Auto-proceed when ready
  useEffect(() => {
    if (phase !== 'ready') return;
    const timer = setTimeout(onReady, 800);
    return () => clearTimeout(timer);
  }, [phase, onReady]);

  // Handle user input
  useInput((input, key) => {
    if (phase === 'needs-install' && input.toLowerCase() === 'y') {
      setPhase('installing');
      setDeps((current) => current.map((dep) => (
        dep.name === 'ffmpeg' ? { ...dep, status: 'installing' } : dep
      )));

      void installFfmpeg((line) => {
        setInstallLog((prev) => [...prev.slice(-8), line]);
      }).then((result) => {
        if (result.success) {
          setDeps((current) => current.map((dep) => (
            dep.name === 'ffmpeg' ? { ...dep, status: 'installed' } : dep
          )));
          setPhase('ready');
        } else {
          setDeps((current) => current.map((dep) => (
            dep.name === 'ffmpeg' ? { ...dep, status: 'failed', error: result.error } : dep
          )));
          setPhase('failed');
          setFailMessage(result.error ?? 'ffmpeg installation failed.');
        }
      });
    }

    if (phase === 'failed' && key.return) {
      // Retry
      setDeps([
        { name: 'Node.js', status: 'checking' },
        { name: 'yt-dlp', status: 'checking' },
        { name: 'ffmpeg', status: 'checking' },
      ]);
      setInstallLog([]);
      setFailMessage(null);
      setPhase('checking');
    }
  });

  const title = useMemo(() => {
    if (phase === 'checking') return 'Checking dependencies…';
    if (phase === 'needs-install') return 'Missing dependency';
    if (phase === 'installing') return 'Installing ffmpeg…';
    if (phase === 'ready') return 'All good — launching…';
    return 'Dependency issue';
  }, [phase]);

  const titleColor = useMemo(() => {
    if (phase === 'ready') return 'green';
    if (phase === 'failed') return 'red';
    if (phase === 'needs-install') return 'yellow';
    return 'cyan';
  }, [phase]);

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="gray" paddingX={3}>
        <Box marginBottom={1}>
          {(phase === 'checking' || phase === 'installing') ? (
            <Spinner label={title} />
          ) : (
            <Text color={titleColor} bold>{title}</Text>
          )}
        </Box>

        {deps.map((dep) => (
          <StatusLine key={dep.name} dep={dep} />
        ))}

        {phase === 'needs-install' ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">
              ffmpeg is needed for downloads.
            </Text>
            <Text color="gray">
              Install it now? <Text bold color="white">[Y]</Text>es
            </Text>
          </Box>
        ) : null}

        {phase === 'installing' && installLog.length > 0 ? (
          <Box marginTop={1} flexDirection="column">
            {installLog.slice(-4).map((line, i) => (
              <Text key={i} color="gray" wrap="truncate">{line}</Text>
            ))}
          </Box>
        ) : null}

        {phase === 'failed' && failMessage ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="red">{failMessage}</Text>
            <Box marginTop={1}>
              <Text color="gray">Press Enter to retry.</Text>
            </Box>
          </Box>
        ) : null}

        {phase === 'ready' ? (
          <Box marginTop={1}>
            <Text color="green">✓ Ready</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
