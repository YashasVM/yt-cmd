import React from 'react';
import { Box, Text } from 'ink';
import { ProgressBar, Spinner } from '@inkjs/ui';
import type { DownloadProgress, VideoInfo } from '../lib/downloader.js';

function renderManualBar(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * 30);
  const empty = 30 - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(clamped)}%`;
}

function progressMeta(progress: DownloadProgress) {
  return [progress.currentSpeed ?? '0 MB/s', `ETA ${progress.eta ?? '--s'}`].join(' • ');
}

export function Downloading({
  videoInfo,
  progress,
  outputPath,
  binaryStatus,
}: {
  videoInfo: VideoInfo;
  progress: DownloadProgress | null;
  outputPath?: string;
  binaryStatus?: string | null;
}) {
  const percent = progress?.percent ?? 0;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{videoInfo.title}</Text>
      {outputPath ? <Text color="gray">{outputPath}</Text> : null}
      <Box marginTop={1}>
        {binaryStatus ? (
          <Spinner label={binaryStatus} />
        ) : progress ? (
          <Text>{`${renderManualBar(percent)} • ${progressMeta(progress)}`}</Text>
        ) : (
          <Spinner label="Starting download..." />
        )}
      </Box>
      <Box marginTop={1}>
        <ProgressBar value={percent} />
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          {progress?.totalSize ? `Total size ${progress.totalSize}` : 'Waiting for yt-dlp progress events...'}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press Ctrl+C to cancel and clean up partial files.</Text>
      </Box>
    </Box>
  );
}
