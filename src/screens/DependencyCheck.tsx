import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const updateDep = useCallback((name: string, patch: Partial<DepEntry>) => {
    setDeps((prev) =>
      prev.map((d) => (d.name === name ? { ...d, ...patch } : d)),
    );
  }, []);

  // Phase 1: Check all dependencies
  useEffect(() => {
    if (phase !== 'checking') return;

    void (async () => {
      // Node.js — always available
      const nodeResult = checkNodeVersion();
      updateDep('Node.js', {
        status: nodeResult.available ? 'found' : 'missing',
        version: nodeResult.version,
      });

      // yt-dlp
      const ytdlpResult = checkYtDlp();
      if (ytdlpResult.available) {
        updateDep('yt-dlp', { status: 'found', version: ytdlpResult.version });
      } else {
        // The app already auto-downloads yt-dlp via binary.ts, so mark as installing
        updateDep('yt-dlp', { status: 'installing' });
        try {
          await prewarmYtDlpBinary();
          updateDep('yt-dlp', { status: 'installed' });
        } catch {
          updateDep('yt-dlp', { status: 'failed', error: 'Could not download yt-dlp binary.' });
        }
      }

      // ffmpeg
      const ffmpegResult = checkFfmpeg();
      if (ffmpegResult.available) {
        updateDep('ffmpeg', { status: 'found', version: ffmpegResult.version });
      } else {
        updateDep('ffmpeg', { status: 'missing' });
      }

      // Decide next phase
      setDeps((current) => {
        const hasFailed = current.some((d) => d.status === 'failed');
        const ffmpegMissing = current.find((d) => d.name === 'ffmpeg')?.status === 'missing';

        if (hasFailed) {
          setPhase('failed');
          setFailMessage('A required dependency could not be installed.');
        } else if (ffmpegMissing) {
          const canAutoInstall = getFfmpegInstallCommand() !== null;
          if (canAutoInstall) {
            setPhase('needs-install');
          } else {
            setPhase('failed');
            setFailMessage(
              'ffmpeg is not installed. Install it manually:\n  sudo apt install ffmpeg  (Debian/Ubuntu)\n  sudo pacman -S ffmpeg    (Arch)\n  sudo dnf install ffmpeg  (Fedora)',
            );
          }
        } else {
          setPhase('ready');
        }

        return current;
      });
    })();
  }, [phase, updateDep]);

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
      updateDep('ffmpeg', { status: 'installing' });

      void installFfmpeg((line) => {
        setInstallLog((prev) => [...prev.slice(-8), line]);
      }).then((result) => {
        if (result.success) {
          updateDep('ffmpeg', { status: 'installed' });
          setPhase('ready');
        } else {
          updateDep('ffmpeg', { status: 'failed', error: result.error });
          setPhase('failed');
          setFailMessage(result.error ?? 'ffmpeg installation failed.');
        }
      });
    }

    if (phase === 'needs-install' && input.toLowerCase() === 'n') {
      // Let them continue without ffmpeg — some presets don't need it
      setPhase('ready');
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
              ffmpeg is needed for most formats.
            </Text>
            <Text color="gray">
              Install it now? <Text bold color="white">[Y]</Text>es / <Text bold color="white">[N]</Text>o (continue without)
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
