type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const currentLevel: LogLevel =
	import.meta.env.MODE === "production" ? "warn" : "debug";

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatArgs(message: string, data?: unknown): unknown[] {
	return data !== undefined ? [message, data] : [message];
}

export const logger = {
	debug(message: string, data?: unknown) {
		if (shouldLog("debug")) console.debug(...formatArgs(message, data));
	},

	info(message: string, data?: unknown) {
		if (shouldLog("info")) console.info(...formatArgs(message, data));
	},

	warn(message: string, data?: unknown) {
		if (shouldLog("warn")) console.warn(...formatArgs(message, data));
	},

	error(message: string, data?: unknown) {
		if (shouldLog("error")) console.error(...formatArgs(message, data));
	},
};
