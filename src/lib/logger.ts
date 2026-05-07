const isDev = process.env.NODE_ENV === "development";

type LogLevel = "info" | "warn" | "error" | "debug";

function log(level: LogLevel, prefix: string, message: string, data?: Record<string, unknown>) {
  const entry = data
    ? `[${prefix}] ${message} ${JSON.stringify(data)}`
    : `[${prefix}] ${message}`;

  switch (level) {
    case "error":
      console.error(entry);
      break;
    case "warn":
      console.warn(entry);
      break;
    case "debug":
      if (isDev) console.log(entry);
      break;
    default:
      console.info(entry);
  }
}

export const logger = {
  info: (prefix: string, message: string, data?: Record<string, unknown>) =>
    log("info", prefix, message, data),
  warn: (prefix: string, message: string, data?: Record<string, unknown>) =>
    log("warn", prefix, message, data),
  error: (prefix: string, message: string, data?: Record<string, unknown>) =>
    log("error", prefix, message, data),
  debug: (prefix: string, message: string, data?: Record<string, unknown>) =>
    log("debug", prefix, message, data),
};
