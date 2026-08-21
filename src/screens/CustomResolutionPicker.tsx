import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { TextInput } from '@inkjs/ui';
import type { VideoInfo } from '../lib/downloader.js';

const MIN_HEIGHT = 144;
const MAX_HEIGHT = 4320;

export function CustomResolutionPicker({
  videoInfo,
  onNext,
  onBack,
}: {
  videoInfo: VideoInfo;
  onNext: (height: number) => void;
  onBack: () => void;
}) {
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;
  const [error, setError] = useState<string | null>(null);

  useInput((input) => {
    if (input.toLowerCase() === 'b') {
      onBack();
    }
  });

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan" paddingX={3}>
        <Text bold>{videoInfo.title}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text bold>Maximum resolution</Text>
          <Text color="gray">Enter a height from {MIN_HEIGHT} to {MAX_HEIGHT} (for example, 1440).</Text>
        </Box>
        <Box marginTop={1}>
          <TextInput
            placeholder="1080"
            onSubmit={(value) => {
              const selectedHeight = Number.parseInt(value.trim(), 10);
              if (!Number.isInteger(selectedHeight) || selectedHeight < MIN_HEIGHT || selectedHeight > MAX_HEIGHT) {
                setError(`Enter a whole number from ${MIN_HEIGHT} to ${MAX_HEIGHT}.`);
                return;
              }

              onNext(selectedHeight);
            }}
          />
        </Box>
        {error ? <Text color="red">{error}</Text> : null}
        <Box marginTop={1}>
          <Text color="gray">Enter to continue, B to go back.</Text>
        </Box>
      </Box>
    </Box>
  );
}
