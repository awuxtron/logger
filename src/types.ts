import type { Format, TransformableInfo as BaseTransformableInfo } from 'logform'
import type { DailyRotateFileTransportOptions } from 'winston-daily-rotate-file'
import { ConsoleTransportOptions } from 'winston/lib/winston/transports'
import { LOG_LEVELS, LogLevel as LogLevelEnum } from './constants'
import type { CliFormatterOptions, FilterFormatterOptions, JsonFormatterOptions } from './formatters'
import type { TelegramTransportOptions } from './transports'

export interface TransformableInfo extends BaseTransformableInfo {
    //
}

export type LogHandler = (message: any, ...args: any[]) => void

export type ILogger = Record<LogLevelEnum, LogHandler>

export type LogLevel = keyof typeof LOG_LEVELS | LogLevelEnum

export interface LoggerTransportOptions {
    silent: boolean
    level: LogLevel
    formats: Format[]
}

export interface LoggerOptions {
    silent: boolean
    level: LogLevel
    name?: string
    nameDelimiter: string
    filter: Omit<FilterFormatterOptions, 'namespaceDelimiter'>
    formats: Format[]
    json: JsonFormatterOptions
    console: Partial<LoggerTransportOptions & CliFormatterOptions & ConsoleTransportOptions>
    file: Partial<LoggerTransportOptions & DailyRotateFileTransportOptions>
    telegram: Partial<LoggerTransportOptions & TelegramTransportOptions>
}
