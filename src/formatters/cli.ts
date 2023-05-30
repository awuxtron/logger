import chalk from 'chalk'
import { format as fecha } from 'fecha'
import { EOL } from 'os'
import { serializeError } from 'serialize-error'
import { inspect, type InspectOptions } from 'util'
import { format } from 'winston'
import { LOG_COLORS, LOG_LEVELS } from '../constants'
import { LOGGER_NAMESPACE, LOGGER_PAYLOAD, LOGGER_RAW_ERROR, LOGGER_TIME } from '../symbols'

export interface FormatPayloadOptions extends InspectOptions
{
    delimiter?: string
    showErrorStack?: boolean
}

export interface CliFormatterOptions
{
    singleLine?: boolean
    timeFormat?: string
    inspectOptions?: FormatPayloadOptions
    formatters?: {
        time?: (time: Date) => string
        level?: (level: string) => string
        name?: (name: string) => string
        message?: (message: string) => string
        payload?: (payload: any[]) => string
    }
}

export const longestLevelLength = Math.max(...Object.keys(LOG_LEVELS).map((l) => l.length))

export function getPaddingForLevel(level: string)
{
    return new Array(longestLevelLength - level.length + 1).join(' ')
}

export function indent(input: string, size: number = 2)
{
    return input.split(EOL).map((i) => new Array(size + 1).join(' ') + i).join(EOL)
}

export function formatTime(time: Date, format: string)
{
    return chalk.dim(`[${ fecha(time, format) }]`)
}

export function formatLevel(level: string)
{
    return chalk.bold[LOG_COLORS[level]](level.toUpperCase()) + getPaddingForLevel(level) + ' '
}

export function formatName(name: string)
{
    return chalk.dim.magenta(`(${ name })`) + ' '
}

export function formatMessage(message: string)
{
    return chalk.whiteBright(message)
}

export function formatError(error: Error, compact: boolean = false)
{
    const {name, message, stack, code, ...contexts} = serializeError(error)

    let result = ''

    result += chalk.bgRed.whiteBright(` ${ name }${ code ? ` (${ code })` : '' } `)
    result += message ? (' ' + chalk.whiteBright(message)) : ''

    if (!compact) {
        if (stack) {
            result += EOL + chalk.dim(stack.split(EOL).slice(1).join(EOL))
        }

        if (Object.keys(contexts).length > 0) {
            result += EOL + indent(inspect(contexts, {colors: true, compact: false}))
        }
    }

    return result
}

export function formatPayload(payload: any[], options: FormatPayloadOptions = {})
{
    const formatted = payload.map((i) => {
        if (i instanceof Error) {
            return formatError(i, !(options.showErrorStack ?? true))
        }

        return indent(inspect(i, options))
    })

    return formatted.join(options.delimiter ?? EOL)
}

const formatter = format((info, opts: CliFormatterOptions = {}) => {
    const {timeFormat = 'HH:mm:ss.SSS', formatters = {}, singleLine = false, ...options} = opts
    const inspectOptions: InspectOptions = {colors: true, compact: singleLine, ...(options.inspectOptions ?? {})}

    const {
        time = (time) => formatTime(time, timeFormat),
        level = formatLevel,
        name = formatName,
        message: msg = formatMessage,
        payload = (payload: any[]) => formatPayload(
            payload,
            {delimiter: singleLine ? ' ' : EOL, showErrorStack: !singleLine, ...inspectOptions},
        ),
    } = formatters

    const message = [
        time(info[LOGGER_TIME]), level(info['level']),
    ]

    if (info[LOGGER_NAMESPACE]) {
        message.push(name(info[LOGGER_NAMESPACE]))
    }

    if (info['message'].length > 0) {
        message.push(msg(info['message']))
    }

    if (info[LOGGER_RAW_ERROR]) {
        if (info[LOGGER_PAYLOAD]) {
            info[LOGGER_PAYLOAD] = []
        }

        info[LOGGER_PAYLOAD].unshift(info[LOGGER_RAW_ERROR])
    }

    if (info[LOGGER_PAYLOAD] && info[LOGGER_PAYLOAD].length > 0) {
        message.push((!singleLine ? EOL : '') + payload(info[LOGGER_PAYLOAD]))
    }

    if (info['durationMs']) {
        message.push(' ' + chalk.magenta(info['durationMs'] + 'ms'))
    }

    info[Symbol.for('message')] = message.join(' ')

    return info
})

export default formatter as (options?: CliFormatterOptions) => ReturnType<typeof formatter>
