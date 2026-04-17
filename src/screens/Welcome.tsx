import React, { useEffect, useMemo, useState } from 'react';
import figlet from 'figlet';
import { Box, Text, useStdout } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import { link } from '../constants.js';

export function isValidYouTubeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtu.be'
    );
  } catch {
    return false;
  }
}

export function Welcome({
  initialUrl,
  isLoading,
  loadingLabel,
  onNext,
}: {
  initialUrl: string;
  isLoading: boolean;
  loadingLabel?: string;
  onNext: (url: string) => void;
}) {
  const [value, setValue] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;

  useEffect(() => {
    setValue(initialUrl);
  }, [initialUrl]);

  const art = useMemo(
    () =>
      figlet.textSync('yt-dlp made easy', {
        font: 'Slant',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }),
    [],
  );

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" padding={1}>
        <Box flexDirection="column">
          <Text color="cyan">{art}</Text>
          <Box flexDirection="column" alignItems="flex-end">
            <Text color="gray">— By @yashas.vm</Text>
            <Text>{link('github.com/YashasVM', 'https://github.com/YashasVM')}</Text>
          </Box>
        </Box>
        <Box marginTop={1} flexDirection="column">
          <Text>Paste YouTube URL:</Text>
          <TextInput
            defaultValue={value}
            isDisabled={isLoading}
            placeholder="https://youtu.be/..."
            onChange={(nextValue) => {
              setValue(nextValue);
              if (error) {
                setError(null);
              }
            }}
            onSubmit={(submittedValue) => {
              const trimmed = submittedValue.trim();
              if (!isValidYouTubeUrl(trimmed)) {
                setError('Enter a valid youtube.com or youtu.be URL.');
                return;
              }

              setError(null);
              onNext(trimmed);
            }}
          />
        </Box>
        {error ? (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        ) : null}
        {isLoading ? (
          <Box marginTop={1}>
            <Spinner label={loadingLabel ?? 'Reading video info...'} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
