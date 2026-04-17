const ALLOWED_VIDEO_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

export class InvalidVideoUrlError extends Error {
  constructor() {
    super('Enter a valid http(s) YouTube URL.');
    this.name = 'InvalidVideoUrlError';
  }
}

export function normalizeAndValidateVideoUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new InvalidVideoUrlError();
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidVideoUrlError();
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new InvalidVideoUrlError();
  }

  if (url.username || url.password) {
    throw new InvalidVideoUrlError();
  }

  if (!ALLOWED_VIDEO_HOSTS.has(url.hostname.toLowerCase())) {
    throw new InvalidVideoUrlError();
  }

  return url.toString();
}
