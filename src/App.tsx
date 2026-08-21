import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import {
  createResolutionPreset,
  FORMAT_PRESETS,
  getDefaultDownloadDirectory,
  type ContainerFormat,
  type FormatPreset,
} from './constants.js';
import {
  downloadVideo,
  DownloadCancelledError,
  fetchVideoInfo,
  MissingFfmpegError,
  type DownloadProgress,
  type DownloadTask,
  type VideoInfo,
} from './lib/downloader.js';
import { prewarmYtDlpBinary } from './lib/binary.js';
import { InvalidVideoUrlError } from './lib/url.js';
import { DependencyCheck } from './screens/DependencyCheck.js';
import { ContainerPicker } from './screens/ContainerPicker.js';
import { CustomResolutionPicker } from './screens/CustomResolutionPicker.js';
import { Done, type DoneState } from './screens/Done.js';
import { Downloading } from './screens/Downloading.js';
import { FormatPicker } from './screens/FormatPicker.js';
import { Welcome } from './screens/Welcome.js';

type Screen =
  | 'dependency-check'
  | 'welcome'
  | 'format-picker'
  | 'resolution-picker'
  | 'container-picker'
  | 'downloading'
  | 'done';

function humanizeError(error: unknown) {
  if (error instanceof MissingFfmpegError) {
    return error.message;
  }

  if (error instanceof InvalidVideoUrlError) {
    return error.message;
  }

  if (error instanceof DownloadCancelledError) {
    return error.message;
  }

  if (error instanceof Error) {
    if (/403|forbidden/i.test(error.message)) {
      return 'YouTube refused the video stream (HTTP 403). The download was retried with alternate clients but still failed — check your connection or try again in a few minutes.';
    }

    if (/ENOTFOUND|EAI_AGAIN|timed out|network/i.test(error.message)) {
      return 'Network error. Check your connection and try again.';
    }

    if (/ffmpeg/i.test(error.message)) {
      return 'ffmpeg is required but not found. Re-launch the app to install it.';
    }

    return error.message;
  }

  return 'Something went wrong.';
}

export function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('dependency-check');
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [format, setFormat] = useState<FormatPreset | null>(null);
  const [container, setContainer] = useState<ContainerFormat>('mp4');
  const [result, setResult] = useState<DoneState | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [outputPath, setOutputPath] = useState<string | undefined>();
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [binaryStatus, setBinaryStatus] = useState<string | null>(null);
  const [metadataAttempt, setMetadataAttempt] = useState(0);
  const [downloadAttempt, setDownloadAttempt] = useState(0);
  const activeDownloadRef = useRef<DownloadTask | null>(null);
  const metadataRequestIdRef = useRef(0);

  // Global Ctrl+C handler
  useInput((input, key) => {
    if (input.toLowerCase() === 'c' && key.ctrl) {
      const activeDownload = activeDownloadRef.current;
      if (activeDownload) {
        void activeDownload.cancel().finally(() => exit());
        return;
      }
      exit();
    }
  });

  // SIGINT handler
  useEffect(() => {
    const onSigint = () => {
      const activeDownload = activeDownloadRef.current;
      if (activeDownload) {
        void activeDownload.cancel().finally(() => exit());
        return;
      }

      exit();
    };

    process.on('SIGINT', onSigint);
    return () => {
      process.off('SIGINT', onSigint);
    };
  }, [exit]);

  // Metadata fetching effect
  useEffect(() => {
    if (!isLoadingMetadata || !url) {
      return;
    }

    let cancelled = false;
    const requestId = ++metadataRequestIdRef.current;

    void (async () => {
      try {
        setBinaryStatus(null);
        const info = await fetchVideoInfo(url, setBinaryStatus);
        if (cancelled || requestId !== metadataRequestIdRef.current) {
          return;
        }

        setVideoInfo(info);
        setScreen('format-picker');
      } catch (error) {
        if (cancelled || requestId !== metadataRequestIdRef.current) {
          return;
        }

        setResult({
          status: 'error',
          title: undefined,
          message: humanizeError(error),
        });
        setScreen('done');
      } finally {
        if (!cancelled && requestId === metadataRequestIdRef.current) {
          setIsLoadingMetadata(false);
          setBinaryStatus(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoadingMetadata, metadataAttempt, url]);

  // Download effect
  useEffect(() => {
    if (screen !== 'downloading' || !url || !videoInfo || !format) {
      return;
    }

    let finished = false;
    setProgress(null);
    setOutputPath(undefined);
    setBinaryStatus(null);

    const task = downloadVideo(
      {
        url,
        preset: format,
        videoInfo,
        container,
        outputDirectory: getDefaultDownloadDirectory(),
      },
      {
        onBinaryStatus: setBinaryStatus,
        onProgress: setProgress,
        onOutputPath: setOutputPath,
      },
    );

    activeDownloadRef.current = task;

    void task.promise
      .then((downloadResult) => {
        finished = true;
        setResult({
          status: 'success',
          title: downloadResult.title,
          filePath: downloadResult.filePath,
          outputDirectory: downloadResult.outputDirectory,
        });
        setScreen('done');
      })
      .catch((error) => {
        if (error instanceof DownloadCancelledError) {
          finished = true;
          return;
        }

        finished = true;
        setResult({
          status: 'error',
          title: videoInfo.title,
          message: humanizeError(error),
        });
        setScreen('done');
      })
      .finally(() => {
        activeDownloadRef.current = null;
        setBinaryStatus(null);
      });

    return () => {
      if (!finished && activeDownloadRef.current === task) {
        void task.cancel();
        activeDownloadRef.current = null;
      }
    };
  }, [container, downloadAttempt, format, screen, url, videoInfo]);

  // ── Screen transition helpers ──

  const startMetadataLookup = (nextUrl: string) => {
    setUrl(nextUrl);
    setVideoInfo(null);
    setFormat(null);
    setContainer('mp4');
    setResult(null);
    setProgress(null);
    setOutputPath(undefined);
    setIsLoadingMetadata(true);
    setMetadataAttempt((attempt) => attempt + 1);
  };

  const startDownload = () => {
    setResult(null);
    setProgress(null);
    setOutputPath(undefined);
    setScreen('downloading');
    setDownloadAttempt((attempt) => attempt + 1);
  };

  const retry = () => {
    setResult(null);
    if (format && videoInfo) {
      setScreen('downloading');
      setDownloadAttempt((attempt) => attempt + 1);
      return;
    }

    if (url) {
      setScreen('welcome');
      setIsLoadingMetadata(true);
      setMetadataAttempt((attempt) => attempt + 1);
    } else {
      setScreen('welcome');
    }
  };

  const reset = () => {
    setScreen('welcome');
    setUrl('');
    setVideoInfo(null);
    setFormat(null);
    setContainer('mp4');
    setResult(null);
    setProgress(null);
    setOutputPath(undefined);
    setIsLoadingMetadata(false);
    setBinaryStatus(null);
  };

  // ── Screen rendering ──

  if (screen === 'dependency-check') {
      return (
        <DependencyCheck
          onReady={() => {
            setScreen('welcome');
            // Prewarm and refresh the yt-dlp binary in the background.
            void prewarmYtDlpBinary(setBinaryStatus);
          }}
        />
      );
  }

  if (screen === 'welcome') {
    return (
      <Welcome
        initialUrl={url}
        isLoading={isLoadingMetadata}
        loadingLabel={binaryStatus ?? 'Reading video info...'}
        onNext={startMetadataLookup}
      />
    );
  }

  if (screen === 'format-picker' && videoInfo) {
    return (
      <FormatPicker
        videoInfo={videoInfo}
        presets={FORMAT_PRESETS}
        onNext={(preset) => {
          if (preset.id === 'custom') {
            setScreen('resolution-picker');
            return;
          }

          setFormat(preset);
          setContainer('mp4');
          if (preset.type === 'video') {
            setScreen('container-picker');
          } else {
            startDownload();
          }
        }}
        onBack={() => {
          setScreen('welcome');
          setFormat(null);
        }}
      />
    );
  }

  if (screen === 'resolution-picker' && videoInfo) {
    return (
      <CustomResolutionPicker
        videoInfo={videoInfo}
        onNext={(height) => {
          setFormat(createResolutionPreset(height));
          setContainer('mp4');
          setScreen('container-picker');
        }}
        onBack={() => setScreen('format-picker')}
      />
    );
  }

  if (screen === 'container-picker' && videoInfo && format) {
    return (
      <ContainerPicker
        videoInfo={videoInfo}
        presetLabel={format.label}
        onNext={(nextContainer) => {
          setContainer(nextContainer);
          startDownload();
        }}
        onBack={() => setScreen('format-picker')}
      />
    );
  }


  if (screen === 'downloading' && videoInfo) {
    return (
      <Downloading
        videoInfo={videoInfo}
        progress={progress}
        outputPath={outputPath}
        binaryStatus={binaryStatus}
        presetLabel={format?.label}
      />
    );
  }

  if (screen === 'done' && result) {
    return <Done result={result} onRetry={retry} onReset={reset} onQuit={exit} />;
  }

  return (
    <Box padding={1}>
      <Text color="red">Unexpected state.</Text>
    </Box>
  );
}
