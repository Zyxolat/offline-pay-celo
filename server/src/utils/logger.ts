type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export type NormalizedError = {
  message: string;
  stack: string | undefined;
};

function formatMeta(meta?: Record<string, unknown>) {
  return meta && Object.keys(meta).length > 0 ? meta : undefined;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(formatMeta(meta) ? { meta: formatMeta(meta) } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === 'ERROR') {
    console.error(line);
    return;
  }

  if (level === 'WARN') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function normalizeError(error: unknown): NormalizedError {
  return {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

export function serializeError(error: unknown): NormalizedError {
  return normalizeError(error);
}
