import { serializeError } from 'serialize-error'
import { format } from 'winston'
import { LOGGER_ERROR, LOGGER_NAMESPACE, LOGGER_PAYLOAD, LOGGER_TIME } from '../symbols'

export interface JsonFormatterOptions
{
    replacer?: (key: string, value: any) => any,
    keys?: {
        level?: string,
        timestamp?: string,
        message?: string,
        name?: string,
        payload?: string,
        error?: {
            type?: string
            code?: string
            error?: string
            stack?: string
            cause?: string
        }
    }
}

const formatter = format((info, opts: JsonFormatterOptions = {}) => {
    const {keys = {}, replacer} = opts
    const {level = 'level', timestamp = 'timestamp', message = 'message', name = 'name', payload = 'payload'} = keys

    const result = {
        [level]: info['level'],
        [timestamp]: info[LOGGER_TIME].getTime(),
    }

    if (info[LOGGER_NAMESPACE]) {
        result[name] = info[LOGGER_NAMESPACE]
    }

    if (info['message'].length > 0) {
        result[message] = info['message']
    }

    if (info[LOGGER_ERROR]) {
        const {type = 'type', code = 'code', error = 'error', stack = 'stack', cause = 'cause'} = keys.error ?? {}

        result[type] = info[LOGGER_ERROR].type

        if (info[LOGGER_ERROR].code) {
            result[code] = info[LOGGER_ERROR].code
        }

        if (info[LOGGER_ERROR].error) {
            result[error] = info[LOGGER_ERROR].error
        }

        result[stack] = info[LOGGER_ERROR].stack

        if (info[LOGGER_ERROR].cause) {
            result[cause] = info[LOGGER_ERROR].cause
        }
    }

    if (info[LOGGER_PAYLOAD] && info[LOGGER_PAYLOAD].length > 0) {
        result[payload] = info[LOGGER_PAYLOAD].map(i => {
            return i instanceof Error ? serializeError(i) : i
        })
    }

    if (info[LOGGER_ERROR]?.payload && Object.keys(info[LOGGER_ERROR].payload).length > 0) {
        if (!result[payload]) {
            result[payload] = []
        }

        result[payload].push(info[LOGGER_ERROR].payload)
    }

    info[Symbol.for('message')] = JSON.stringify(result, replacer)

    return info
})

export default formatter as (options?: JsonFormatterOptions) => ReturnType<typeof formatter>
