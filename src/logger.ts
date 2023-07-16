import { createLogger, format, type LogEntry, Logger as Winston, type Profiler, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { uniqueId } from '@khangdt22/utils'
import isErrorInstance from 'is-error-instance'
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
import { gracefulExit, registerTransportExitHandler, WANT_EXIT } from './utils'
import { UnhandledRejectionError } from './errors'

export type LoggerOptionsWithParentNames = LoggerOptions & { parentNames: string[] }

export const defaultOptions: LoggerOptionsWithParentNames = {
    silent: false,
    level: LogLevel.INFO,
    nameDelimiter: DEFAULT_NAMESPACE_DELIMITER,
    filter: {},
    formats: [],
    handleExceptions: true,
    handleRejections: true,
    parentNames: [],
    console: {},
    file: {},
    telegram: {},
}

const { combine } = format

export class Logger implements ILogger {
    public readonly winston: Winston
    public readonly options: LoggerOptionsWithParentNames

    protected readonly timers = new Map<string | number, Profiler>()

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
            transports: transports.filter((i): i is NonNullable<typeof i> => i != undefined),
        })

        const logger = new Logger(winston, loggerOptions)

        if (loggerOptions.handleExceptions) {
            process.on('uncaughtException', (error: any) => {
                if (error !== WANT_EXIT) {
                    registerTransportExitHandler(logger)
                    logger.log(LogLevel.FATAL, error)
                }

                gracefulExit(isErrorInstance(error) && error['exitCode'] ? error['exitCode'] : 1)
            })
        }

        if (loggerOptions.handleRejections) {
            process.on('unhandledRejection', (reason, promise) => {
                if (isErrorInstance(reason)) {
                    throw reason
                }

                throw new UnhandledRejectionError(reason, promise)
            })
        }

        return logger
    }

    protected static telegramTransport({ telegram }: LoggerOptions) {
        const { silent = false, level = LogLevel.WARN, formats = [], botToken, chatId } = telegram

        if (!botToken || !chatId) {
            return
        }

        return new TelegramTransport({
            ...telegram,
            silent,
            level,
            botToken,
            chatId,
            format: combine(...formats),
        })
    }

    protected static fileTransport({ file }: LoggerOptions) {
        const { silent = false, level = LogLevel.WARN, formats = [] } = file
        const { filename = '%DATE%.log', dirname, createSymlink = true } = file

        if (!dirname) {
            return
        }

        return new DailyRotateFile({
            ...file,
            silent,
            level,
            format: combine(...formats, json()),
            filename: filename as any,
            dirname,
            createSymlink,
        })
    }

    protected static consoleTransport({ console: consoleOptions }: LoggerOptions) {
        const { silent = false, formats = [] } = consoleOptions
        const { stderrLevels = [LogLevel.FATAL, LogLevel.ERROR], consoleWarnLevels = [LogLevel.WARN] } = consoleOptions

        return new transports.Console({
            ...consoleOptions,
            silent,
            stderrLevels,
            consoleWarnLevels,
            format: combine(...formats, cli(consoleOptions)),
        })
    }

    protected static getFormats(options: LoggerOptions) {
        return combine(
            name({ delimiter: options.nameDelimiter }),
            filter(options.filter),
            context(),
            interpolation(),
            error(),
            ...options.formats
        )
    }

    public child(name: string, metadata?: Record<PropertyKey, any>) {
        const instance = this.winston.child(metadata ?? {})
        const parentNames = [...this.options.parentNames, ...(this.options.name ? [this.options.name] : [])]

        return new Logger(instance, { ...this.options, name, parentNames })
    }

    public log(level: LogLevelType, message: any, ...context: any[]) {
        if (this.options.silent) {
            return true
        }

        this.winston.log(this.getLogEntry(level, message, ...context))

        return true
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

    public exit(code?: number, level?: LogLevelType, message?: any, ...args: any[]): never
    public exit(code = 0, ...args: any[]): never {
        if (args.length > 0) {
            registerTransportExitHandler(this)
            this.log(...(args as [any, any]))
        }

        if (this.options.handleExceptions) {
            throw (WANT_EXIT as any)
        }

        return gracefulExit(code) as never
    }

    public forceExit(code?: number, level?: LogLevelType, message?: any, ...args: any[]): never
    public forceExit(code = 0, ...args: any[]): never {
        if (args.length > 0) {
            this.log(...(args as [any, any]))
        }

        return process.exit(code)
    }

    public startTimer(id?: string) {
        if (!id) {
            id = `timer-${uniqueId()}`
        }

        this.timers.set(id, this.winston.startTimer())

        return id
    }

    public done(id: string, level: LogLevelType, message: string, ...args: any[]) {
        const timer = this.timers.get(id)

        if (!timer) {
            return
        }

        return timer.done(this.getLogEntry(level, message, ...args))
    }

    public profile(id: string | number): void

    public profile(id: string | number, level?: LogLevelType, message?: string, ...args: any[]) {
        if (level) {
            this.winston.profile(id, this.getLogEntry(level, message, ...args))

            return
        }

        this.winston.profile(id)
    }

    protected getLogEntry(level: LogLevelType, message: any, ...context: any[]): LogEntry {
        return { level, message, [LOGGER_CONTEXT]: context, [LOGGER_OPTIONS]: this.options }
    }
}
