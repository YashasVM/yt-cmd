import React from 'react';
import { Box, Text, useStdout } from 'ink';
import { ProgressBar, Spinner } from '@inkjs/ui';
import type { DownloadProgress, VideoInfo } from '../lib/downloader.js';

function progressMeta(progress: DownloadProgress) {
  return [
    `${Math.round(progress.percent)}%`,
    progress.currentSpeed ? `Speed ${progress.currentSpeed}` : 'Speed --',
    progress.eta ? `ETA ${progress.eta}` : 'ETA --',
  ].join(' | ');
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
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" padding={1}>
        <Text bold>{videoInfo.title}</Text>
        {outputPath ? <Text color="gray">{outputPath}</Text> : null}
        <Box marginTop={1}>
          {binaryStatus ? (
            <Spinner label={binaryStatus} />
          ) : progress ? (
            <Text>{progressMeta(progress)}</Text>
          ) : (
            <Spinner label="Starting download..." />
          )}
        </Box>
        {binaryStatus ? null : (
          <Box marginTop={1}>
            <ProgressBar value={percent} />
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray">
            {progress?.totalSize
              ? `Total size ${progress.totalSize}`
              : 'Waiting for yt-dlp progress events...'}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Ctrl+C to cancel and clean up partial files.</Text>
        </Box>
      </Box>
    </Box>
  );
}
