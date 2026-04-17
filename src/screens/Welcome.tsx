import React, { useEffect, useMemo, useState } from 'react';
import figlet from 'figlet';
import { Box, Text, useStdout } from 'ink';
import { Spinner, TextInput } from '@inkjs/ui';
import { link } from '../constants.js';
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

  const artWidth = useMemo(() => Math.max(...art.split('\n').map(line => line.length)), [art]);

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
        <Box 
          marginTop={2} 
          borderStyle="round" 
          borderColor="gray" 
          paddingX={2} 
          paddingY={1}
          flexDirection="column"
          width={artWidth}
        >
          <Box marginBottom={1}>
            <Text color="cyan" bold>► </Text>
            <Text bold>Paste YouTube URL</Text>
          </Box>
          <Box paddingLeft={2}>
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
                try {
                  const safeUrl = normalizeAndValidateVideoUrl(submittedValue);
                  setError(null);
                  onNext(safeUrl);
                } catch (error) {
                  if (error instanceof InvalidVideoUrlError) {
                    setError(error.message);
                    return;
                  }

                  setError('Enter a valid http(s) YouTube URL.');
                  return;
                }
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
          <Box marginTop={1}>
            <Spinner label={loadingLabel ?? 'Reading video info...'} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
