import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import { InvalidVideoUrlError, normalizeAndValidateVideoUrl } from '../lib/url.js';

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
  const latestValue = useRef(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [shimmer, setShimmer] = useState(0);
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;
  const panelWidth = Math.min(58, Math.max(36, (stdout?.columns || 62) - 4));

  useEffect(() => {
    setValue(initialUrl);
    latestValue.current = initialUrl;
  }, [initialUrl]);

  useEffect(() => {
    const timer = setInterval(() => setShimmer(current => (current + 1) % 6), 180);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" paddingX={2} width={panelWidth}>
        <Box flexDirection="column" alignItems="center" marginBottom={1}>
          <Box>
            {'HOLEN.'.split('').map((letter, index) => (
              <Text key={index} color="white" bold dimColor={index === shimmer}>
                {letter}
              </Text>
            ))}
          </Box>
          <Text color="gray">A calm place for your downloads</Text>
        </Box>
        <Box
          borderStyle="round"
          borderColor="gray"
          paddingX={3}
          paddingY={1}
          flexDirection="column"
        >
          <Box marginBottom={1}>
            <Text color="green" bold>●  </Text>
            <Text bold>Paste a video URL</Text>
          </Box>
          <Box paddingLeft={3}>
            <TextInput
              key={initialUrl}
              defaultValue={value}
              isDisabled={isLoading}
              placeholder="https://youtu.be/... or instagram.com/..."
              onChange={(nextValue) => {
                latestValue.current = nextValue;
                setValue(nextValue);
                if (error) {
                  setError(null);
                }
              }}
              onSubmit={() => {
                // Ink can deliver a pasted final character and Enter in the
                // same render; wait for its onChange effect before reading it.
                setTimeout(() => {
                  try {
                    const safeUrl = normalizeAndValidateVideoUrl(latestValue.current);
                    setError(null);
                    onNext(safeUrl);
                  } catch (error) {
                    if (error instanceof InvalidVideoUrlError) {
                      setError(error.message);
                      return;
                    }

                    setError('Enter a valid public video URL (http or https).');
                  }
                }, 0);
              }}
            />
          </Box>
        </Box>
        {error ? (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        ) : null}
        {isLoading ? (
          <Box marginTop={1} paddingLeft={1}>
            <Spinner label={loadingLabel ?? 'Reading video info...'} />
          </Box>
        ) : null}
        <Box marginTop={1} justifyContent="center">
          <Text color="gray">Run anytime with </Text>
          <Text color="magenta" bold>npx holen-dl</Text>
        </Box>
      </Box>
    </Box>
  );
}
