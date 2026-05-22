import React from 'react';
import { Box, Text, useInput, useStdout } from 'ink';

export type DoneState =
  | {
      status: 'success';
      title: string;
      filePath?: string;
      outputDirectory: string;
    }
  | {
      status: 'error';
      title?: string;
      message: string;
    };

export function Done({
  result,
  onRetry,
  onReset,
  onQuit,
}: {
  result: DoneState;
  onRetry: () => void;
  onReset: () => void;
  onQuit: () => void;
}) {
  const { stdout } = useStdout();
  const height = stdout?.rows || 24;

  useInput((input, key) => {
    if (input.toLowerCase() === 'q') {
      onQuit();
      return;
    }

    if (result.status === 'error' && input.toLowerCase() === 'r') {
      onRetry();
      return;
    }

    if (result.status === 'success' && key.return) {
      onReset();
    }
  });

  if (result.status === 'success') {
    return (
      <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
        <Box flexDirection="column" padding={1}>
          <Box>
            <Text color="green" bold>✓  </Text>
            <Text color="green">Download complete</Text>
          </Box>
          <Box marginTop={1}>
            <Text bold>{result.title}</Text>
          </Box>
          <Text color="gray">{result.filePath ?? result.outputDirectory}</Text>
          <Box marginTop={1}>
            <Text color="gray">Enter — download another  ·  Q — quit</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box width="100%" height={height - 2} justifyContent="center" alignItems="center">
      <Box flexDirection="column" padding={1}>
        <Box>
          <Text color="red" bold>✗  </Text>
          <Text color="red">Download failed</Text>
        </Box>
        {result.title ? (
          <Box marginTop={1}>
            <Text bold>{result.title}</Text>
          </Box>
        ) : null}
        <Box marginTop={1}>
          <Text>{result.message}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">R — retry  ·  Q — quit</Text>
        </Box>
      </Box>
    </Box>
  );
}
