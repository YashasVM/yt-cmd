import React, { useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Select } from '@inkjs/ui';
import type { FormatPreset } from '../constants.js';
import type { VideoInfo } from '../lib/downloader.js';

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) {
    return undefined;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function FormatPicker({
  videoInfo,
  presets,
  onNext,
  onBack,
}: {
  videoInfo: VideoInfo;
  presets: FormatPreset[];
  onNext: (preset: FormatPreset) => void;
  onBack: () => void;
}) {
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;

  const options = useMemo(
    () =>
      presets.map((preset) => ({
        label: `${preset.icon}  ${preset.label}`,
        value: preset.id,
      })),
    [presets],
  );

  useInput((input) => {
    if (input.toLowerCase() === 'b') {
      onBack();
    }
  });

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" padding={1}>
        <Text bold>{videoInfo.title}</Text>
        <Text color="gray">
          {videoInfo.uploader ? `${videoInfo.uploader}  ·  ` : ''}
          {formatDuration(videoInfo.duration) ?? 'Unknown duration'}
        </Text>

        <Box marginTop={1}>
          <Text>Select quality:</Text>
        </Box>

        <Select
          options={options}
          visibleOptionCount={6}
          onChange={(selectedId) => {
            const preset = presets.find((p) => p.id === selectedId);
            if (preset) {
              onNext(preset);
            }
          }}
        />

        <Box marginTop={1}>
          <Text color="gray">↑↓ to navigate, Enter to select, B to go back.</Text>
        </Box>
      </Box>
    </Box>
  );
}
