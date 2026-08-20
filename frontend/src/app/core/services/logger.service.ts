import { Injectable } from "@angular/core";

import { environment } from "../../../environments/environment";

/** Port of frontend-react/src/lib/logger.ts. */
export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

@Injectable({ providedIn: "root" })
export class LoggerService {
	/** Was `import.meta.env.MODE === "production"`. */
	private readonly currentLevel: LogLevel = environment.production
		? "warn"
		: "debug";

	debug(message: string, data?: unknown): void {
		if (this.shouldLog("debug")) console.debug(...format(message, data));
	}

	info(message: string, data?: unknown): void {
		if (this.shouldLog("info")) console.info(...format(message, data));
	}

	warn(message: string, data?: unknown): void {
		if (this.shouldLog("warn")) console.warn(...format(message, data));
	}

	error(message: string, data?: unknown): void {
		if (this.shouldLog("error")) console.error(...format(message, data));
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
	}
}

function format(message: string, data?: unknown): unknown[] {
	return data !== undefined ? [message, data] : [message];
}
