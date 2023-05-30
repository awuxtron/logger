import { format } from 'winston'
import { DEFAULT_NAMESPACE_DELIMITER } from '../constants'
import { LOGGER_NAMESPACE, LOGGER_OPTIONS } from '../symbols'
import type { LoggerOptions, TransformableInfo } from '../types'

export interface NameFormatterOptions
{
    key?: string
    delimiter?: string
    resolveOptions?: (info: TransformableInfo) => LoggerOptions
}

const formatter = format((info, opts: NameFormatterOptions = {}) => {
    const {
        key = LOGGER_NAMESPACE,
        delimiter = DEFAULT_NAMESPACE_DELIMITER,
        resolveOptions = (i) => i[LOGGER_OPTIONS],
    } = opts

    const loggerOptions = resolveOptions(info)

    const ns = [
        ...(loggerOptions?.parentNames ?? []),
        ...(loggerOptions?.name ? [loggerOptions.name] : []),
    ]

    info[key] = ns.join(delimiter)

    return info
})

export default formatter as (options?: NameFormatterOptions) => ReturnType<typeof formatter>
