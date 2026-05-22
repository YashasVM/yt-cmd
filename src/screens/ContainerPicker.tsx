import React, { useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Select } from '@inkjs/ui';
import { CONTAINER_OPTIONS, type ContainerFormat } from '../constants.js';
import type { VideoInfo } from '../lib/downloader.js';

export function ContainerPicker({
  videoInfo,
  presetLabel,
  onNext,
  onBack,
}: {
  videoInfo: VideoInfo;
  presetLabel: string;
  onNext: (container: ContainerFormat) => void;
  onBack: () => void;
}) {
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;

  const options = useMemo(
    () =>
      CONTAINER_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
      })),
    [],
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
          Quality: <Text color="cyan">{presetLabel}</Text>
        </Text>

        <Box marginTop={1}>
          <Text>Choose file format:</Text>
        </Box>

        <Select
          options={options}
          onChange={(value) => {
            onNext(value as ContainerFormat);
          }}
        />

        <Box marginTop={1}>
          <Text color="gray">↑↓ to navigate, Enter to confirm, B to go back.</Text>
        </Box>
      </Box>
    </Box>
  );
}
