import { EOL } from 'node:os'
import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import chalk from 'chalk'
import { format as fecha } from 'fecha'
import { format } from 'winston'
import { format as formatNumber } from '@khangdt22/utils'
import mergeErrorCause from 'merge-error-cause'
import cleanStack from 'clean-stack'
import terminalSize from 'term-size'
import { LOG_COLORS, LOG_LEVELS } from '../constants'
import { LOGGER_ERRORS, LOGGER_NAMESPACE, LOGGER_PAYLOAD, LOGGER_TIME } from '../symbols'

export interface CliFormatterOptions {
    showTime?: boolean
    showName?: boolean
    showPayload?: boolean
    timeFormat?: string
    formatters?: {
        time?: (time: Date) => string
        level?: (level: string) => string
        name?: (name: string) => string
        message?: (message: string) => string
        error?: (error: Error) => string
        payload?: (payload: any[]) => string
    }
}

export const longestLevelLength = Math.max(...Object.keys(LOG_LEVELS).map((l) => l.length))

export const terminalWidth = terminalSize().columns

export function getPaddingForLevel(level: string) {
    return ' '.repeat(longestLevelLength - level.length + 1)
}

export function indent(input: string, size = 2) {
    return input.split(EOL).map((i) => ' '.repeat(size) + i).join(EOL)
}

export function formatTime(time: Date, format: string) {
    return chalk.dim(`[${fecha(time, format)}]`)
}

export function formatLevel(level: string) {
    return chalk.bold[LOG_COLORS[level]](level.toUpperCase()) + getPaddingForLevel(level)
}

export function formatName(name: string) {
    return chalk.dim.magenta(`(${name})`)
}

export function formatMessage(message: string) {
    return chalk.whiteBright(message)
}

export function errorBadge(message: string) {
    return chalk.bgRed.whiteBright(' ' + message.replace(/:$/, '') + ' ')
}

export function formatError(error: Error, badge = true) {
    error = mergeErrorCause(error)
    error.stack = cleanStack((error.stack || '').replace(error.message, ''))

    const errType = error.name + (error['code'] ? ` (${error['code']})` : '') + (error.message ? ':' : '')
    const errStack = error.stack.split(EOL).slice(1).map((i) => chalk.dim(i)).join(EOL)
    const prefix = badge ? errorBadge(errType) : formatMessage(errType)
    const ignorePayload = new Set(['code', 'name', 'message', 'stack', 'cause'])
    const payload = Object.keys(error).filter((k) => !ignorePayload.has(k)).map((k) => [k, error[k]])

    let payloadMessage = ''

    if (payload.length > 0) {
        payloadMessage = EOL + indent(formatPayload(Object.fromEntries(payload)), 4)
    }

    return `${prefix} ${formatMessage(error.message)}${EOL}${errStack}${payloadMessage}`
}

export function formatPayload(payload: any[]) {
    const options: InspectOptions = {
        depth: Number.POSITIVE_INFINITY,
        colors: true,
        maxArrayLength: Number.POSITIVE_INFINITY,
        maxStringLength: Number.POSITIVE_INFINITY,
        breakLength: Math.max(terminalWidth, 80),
    }

    return inspect(payload, options)
}

const formatter = format((info, opts: CliFormatterOptions = {}) => {
    const { showTime = true, showName = true, showPayload = true, timeFormat = 'HH:mm:ss.SSS', formatters = {} } = opts

    const { time = (time) => formatTime(time, timeFormat), level = formatLevel, name = formatName } = formatters
    const { message: msg = formatMessage, error = formatError, payload = formatPayload } = formatters

    const message = showTime ? [time(info[LOGGER_TIME])] : []

    message.push(level(info['level']))
    message.push(...(showName && info[LOGGER_NAMESPACE] ? [name(info[LOGGER_NAMESPACE])] : []))
    message.push(...(info['message'] ? [msg(info['message'])] : []))

    if (info['durationMs']) {
        message.push(' ', chalk.magenta.dim(formatNumber(info['durationMs']) + 'ms'))
    }

    if (info[LOGGER_ERRORS].length > 0) {
        const showBadge = info[LOGGER_ERRORS].length > 1 || info['message'].length > 0 || !!info['durationMs']
        const errorMessage: string[] = info[LOGGER_ERRORS].map((e) => error(e, showBadge))

        if (showBadge) {
            errorMessage.unshift('')
        }

        message.push(errorMessage.join(EOL))
    }

    if (showPayload && info[LOGGER_PAYLOAD].length > 0) {
        message.push(EOL + info[LOGGER_PAYLOAD].map((p) => indent(payload(p))).join(EOL))
    }

    return Object.assign(info, { [Symbol.for('message')]: message.join(' ') })
})

export default formatter as (options?: CliFormatterOptions) => ReturnType<typeof formatter>
