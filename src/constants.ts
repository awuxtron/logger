export const LOG_LEVELS = <const>{
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
    silly: 6,
}

export const LOG_COLORS = <const>{
    fatal: 'redBright',
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    debug: 'green',
    trace: 'whiteBright',
    silly: 'white',
}

export enum LogLevel {
    FATAL = 'fatal',
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
    TRACE = 'trace',
    SILLY = 'silly',
}

export const DEFAULT_NAMESPACE_DELIMITER = ':'

export const DEFAULT_FILTER_ENV_KEY = 'DEBUG'
