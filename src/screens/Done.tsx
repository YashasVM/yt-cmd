import React from 'react';
import { Box, Text, useInput } from 'ink';

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
      <Box flexDirection="column" padding={1}>
        <Text color="green">Download complete.</Text>
        <Text bold>{result.title}</Text>
        <Text color="gray">{result.filePath ?? result.outputDirectory}</Text>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to download another video, or Q to quit.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="red">Download failed.</Text>
      {result.title ? <Text bold>{result.title}</Text> : null}
      <Box marginTop={1}>
        <Text>{result.message}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press R to retry or Q to quit.</Text>
      </Box>
    </Box>
  );
}
