export class InvalidVideoUrlError extends Error {
  constructor() {
    super('Enter a valid public video URL (http or https).');
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

  if (!url.hostname) {
    throw new InvalidVideoUrlError();
  }

  return url.toString();
}
