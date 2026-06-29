type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
  error?: { message: string; stack?: string };
}

const isDev = process.env.NODE_ENV === "development";

function formatEntry(entry: LogEntry): string {
  const base = `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.context ? `[${entry.context}]` : ""} ${entry.message}`;
  return entry.data ? `${base} ${JSON.stringify(entry.data)}` : base;
}

function log(level: LogLevel, message: string, data?: unknown, context?: string) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
  };

  if (data instanceof Error) {
    entry.error = { message: data.message, stack: data.stack };
    entry.data = undefined;
  }

  if (isDev) {
    const formatted = formatEntry(entry);
    if (level === "error") console.error(formatted);
    else if (level === "warn") console.warn(formatted);
    else console.log(formatted);
  } else {
    const jsonLine = JSON.stringify(entry) + "\n";
    // Edge-compatible: use console.log when process.stdout unavailable
    if (typeof process !== "undefined" && process.stdout) {
      process.stdout.write(jsonLine);
    } else {
      console.log(jsonLine);
    }
  }
}

export const logger = {
  debug: (message: string, data?: unknown, context?: string) =>
    isDev && log("debug", message, data, context),
  info: (message: string, data?: unknown, context?: string) =>
    log("info", message, data, context),
  warn: (message: string, data?: unknown, context?: string) =>
    log("warn", message, data, context),
  error: (message: string, error?: unknown, context?: string) =>
    log("error", message, error, context),
  child: (context: string) => ({
    debug: (msg: string, data?: unknown) => isDev && log("debug", msg, data, context),
    info: (msg: string, data?: unknown) => log("info", msg, data, context),
    warn: (msg: string, data?: unknown) => log("warn", msg, data, context),
    error: (msg: string, err?: unknown) => log("error", msg, err, context),
  }),
};
