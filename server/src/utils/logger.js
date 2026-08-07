// Minimal structured logger — no external dependency (Phase 19: "do not
// introduce unnecessary frameworks"). Every line is a single JSON object on
// stdout/stderr, so it is trivially greppable/ingestible by any log
// collector without pulling in pino/winston for a project this size.
//
// Never pass secrets (passwords, tokens, API keys, private keys) into
// `meta` — callers are responsible for that, same as they already are for
// existing console.log/console.error call sites this replaces.

function write(stream, level, message, meta) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  }
  stream.write(JSON.stringify(line) + '\n')
}

export const logger = {
  info: (message, meta) => write(process.stdout, 'info', message, meta),
  warn: (message, meta) => write(process.stdout, 'warn', message, meta),
  error: (message, meta) => write(process.stderr, 'error', message, meta),
}
