import { createLogger, format, type LogEntry, Logger as Winston, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { DEFAULT_NAMESPACE_DELIMITER, LOG_LEVELS, LogLevel } from './constants'
import cli from './formatters/cli'
import context from './formatters/context'
import error from './formatters/error'
import filter from './formatters/filter'
import interpolation from './formatters/interpolation'
import json from './formatters/json'
import name from './formatters/name'
import { LOGGER_CONTEXT, LOGGER_OPTIONS } from './symbols'
import { TelegramTransport } from './transports'
import type { ILogger, LoggerOptions, LogLevel as LogLevelType } from './types'

export type LoggerOptionsWithParentNames = LoggerOptions & { parentNames: string[] }

export const defaultOptions: LoggerOptionsWithParentNames = {
    silent: false,
    level: LogLevel.INFO,
    nameDelimiter: DEFAULT_NAMESPACE_DELIMITER,
    filter: {},
    formats: [],
    parentNames: [],
    json: {},
    console: {},
    file: {},
    telegram: {},
}

const { combine } = format

export class Logger implements ILogger {
    public winston: Winston
    public options: LoggerOptionsWithParentNames

    protected constructor(instance: Winston, options: LoggerOptionsWithParentNames) {
        this.winston = instance
        this.options = options
    }

    public static create(options: Partial<LoggerOptions> = {}) {
        const loggerOptions = { ...defaultOptions, ...options }

        const transports = [
            this.consoleTransport(loggerOptions),
            this.fileTransport(loggerOptions),
            this.telegramTransport(loggerOptions),
        ]

        const winston = createLogger({
            silent: options.silent,
            level: options.level,
            levels: LOG_LEVELS,
            format: this.getFormats(loggerOptions),
            transports: transports.filter((i) => i != undefined) as any,
        })

        return new Logger(winston, loggerOptions)
    }

    protected static telegramTransport(options: LoggerOptions) {
        const {
            silent = false,
            level = LogLevel.WARN,
            formats = [],
            botToken,
            chatId,
            ...telegramOptions
        } = options.telegram

        if (!botToken || !chatId) {
            return
        }

        return new TelegramTransport({
            silent,
            level,
            botToken,
            chatId,
            format: combine(json(), ...formats),
            ...telegramOptions,
        })
    }

    protected static fileTransport(options: LoggerOptions) {
        const {
            silent = false,
            level = LogLevel.WARN,
            formats = [],
            filename = '%DATE%.log',
            dirname,
            createSymlink = true,
            ...fileOptions
        } = options.file

        if (!dirname) {
            return
        }

        return new DailyRotateFile({
            silent,
            level,
            format: combine(json(options.json), ...formats),
            filename,
            dirname,
            createSymlink,
            ...(fileOptions as any),
        })
    }

    protected static consoleTransport(options: LoggerOptions) {
        const {
            silent = false,
            level = LogLevel.SILLY,
            stderrLevels = [LogLevel.FATAL, LogLevel.ERROR],
            consoleWarnLevels = [LogLevel.WARN],
            formats = [],
            ...consoleOptions
        } = options.console

        return new transports.Console({
            silent,
            level,
            stderrLevels,
            consoleWarnLevels,
            format: combine(...formats, cli(consoleOptions)),
            ...consoleOptions,
        })
    }

    protected static getFormats(options: LoggerOptions) {
        return combine(
            name({ delimiter: options.nameDelimiter }),
            filter({
                ...options.filter,
                namespaceDelimiter: options.nameDelimiter,
            }),
            context(),
            interpolation(),
            error(),
            ...options.formats
        )
    }

    public child(name: string, metadata?: Record<PropertyKey, any>) {
        return new Logger(this.winston.child(metadata ?? {}), {
            ...this.options,
            name,
            parentNames: [...this.options.parentNames, ...(this.options.name ? [this.options.name] : [])],
        })
    }

    public log(level: LogLevel, message: any, ...context: any[]) {
        if (this.options.silent) {
            return
        }

        this.winston.log(this.getLogEntry(level, message, ...context))
    }

    public fatal(message: any, ...args: any[]) {
        return this.log(LogLevel.FATAL, message, ...args)
    }

    public error(message: any, ...args: any[]) {
        return this.log(LogLevel.ERROR, message, ...args)
    }

    public warn(message: any, ...args: any[]) {
        return this.log(LogLevel.WARN, message, ...args)
    }

    public info(message: any, ...args: any[]) {
        return this.log(LogLevel.INFO, message, ...args)
    }

    public debug(message: any, ...args: any[]) {
        return this.log(LogLevel.DEBUG, message, ...args)
    }

    public trace(message: any, ...args: any[]) {
        return this.log(LogLevel.TRACE, message, ...args)
    }

    public silly(message: any, ...args: any[]) {
        return this.log(LogLevel.SILLY, message, ...args)
    }

    public profile(id: string | number): void

    public profile(id: string | number, level?: LogLevelType, message?: any, ...args: any[]): void

    public profile(...args: any[]) {
        const id = args[0]
        const entry = this.getLogEntry(...(args.slice(1) as [any, any]))

        this.winston.profile(id, entry)
    }

    protected getLogEntry(level: LogLevelType, message: any, ...context: any[]): LogEntry {
        return {
            level,
            message,
            [LOGGER_CONTEXT]: context,
            [LOGGER_OPTIONS]: this.options,
        }
    }
}
