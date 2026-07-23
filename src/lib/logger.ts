// Structured, leveled logging for Server Actions. Emits a single JSON line per
// event so Vercel's log drains (and any future log aggregator) can parse and
// filter by level/action/event instead of grepping free-text console output.
//
// Deliberately minimal — no external logging package. Only metadata is
// logged (action name, event, error message/name, IP), never PII like a
// submitter's name, email, or message body.

type LogLevel = 'info' | 'warn' | 'error';

type LogFields = {
  action: string;
  event: string;
  ip?: string;
  error?: unknown;
  [key: string]: unknown;
};

function serializeError(err: unknown): { message: string; name?: string } {
  if (err instanceof Error) return { message: err.message, name: err.name };
  return { message: String(err) };
}

function log(level: LogLevel, fields: LogFields): void {
  const { error, ...rest } = fields;
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    ...rest,
    ...(error !== undefined ? { error: serializeError(error) } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info:  (fields: LogFields) => log('info', fields),
  warn:  (fields: LogFields) => log('warn', fields),
  error: (fields: LogFields) => log('error', fields),
};
