const enum LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

let currentLevel = LogLevel.INFO;

export function setLogLevel(level: number): void {
  currentLevel = level;
}

export function log(msg: string): void {
  if (currentLevel <= LogLevel.INFO) print(`[INFO] ${msg}`);
}

export function warn(msg: string): void {
  if (currentLevel <= LogLevel.WARN) print(`[WARN] ${msg}`);
}
