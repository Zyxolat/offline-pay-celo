type LogLevel = 'INFO' | 'WARN' | 'ERROR';

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

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
