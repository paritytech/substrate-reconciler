import {
	createLogger,
	format,
	Logger,
	LoggerOptions,
	transports,
} from 'winston';

const myFormat = format.printf(({ level, message, label, timestamp }) => {
	return `${timestamp as string} [${label as string}] ${level}: ${message}`;
});

const consoleTransport = new transports.Console();

/**
 * Create the global logger.
 *
 * If you need to changle the log level or the transports, simply
 * add them to where this function is called.
 *
 * @param level log level verbosity filter
 * @param transports overrides for log transports, defaults to console (stdout).
 * @returns a winston logger.
 */
function getLogger(
	level: 'info' | 'debug' = 'info',
	transports: LoggerOptions['transports'] = [consoleTransport]
): Logger {
	return createLogger({
		level,
		format: format.combine(
			format.label({ label: 'reconciler' }),
			format.timestamp({
				format: 'YYYY-MM-DD HH:mm:ss',
			}),
			format.errors({ stack: true }),
			format.colorize({ all: false }),
			myFormat
		),
		transports,
	});
}

export const log = getLogger();