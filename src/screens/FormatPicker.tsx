import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
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
  const [selectedId, setSelectedId] = useState(presets[0]?.id ?? '');

  const options = useMemo(
    () =>
      presets.map((preset) => ({
        label: preset.label,
        value: preset.id,
      })),
    [presets],
  );

  const selectedPreset =
    presets.find((preset) => preset.id === selectedId) ?? presets[0];

  useInput((input, key) => {
    if (key.return && selectedPreset) {
      onNext(selectedPreset);
    }

    if (input.toLowerCase() === 'b') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{videoInfo.title}</Text>
      <Text color="gray">
        {videoInfo.uploader ? `${videoInfo.uploader} • ` : ''}
        {formatDuration(videoInfo.duration) ?? 'Unknown duration'}
      </Text>
      <Box marginTop={1}>
        <Text>Select a format:</Text>
      </Box>
      <Select
        options={options}
        defaultValue={selectedId}
        visibleOptionCount={5}
        onChange={setSelectedId}
      />
      {selectedPreset ? (
        <Box marginTop={1}>
          <Text color="gray">{selectedPreset.description}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text color="gray">Use arrow keys, Enter to download, B to go back.</Text>
      </Box>
    </Box>
  );
}
