import type { InspectOptions } from 'node:util'
import { formatWithOptions } from 'node:util'
import { format } from 'winston'
import { LOGGER_INTERPOLATION } from '../symbols'
import type { TransformableInfo } from '../types'

export interface InterpolationFormatterOptions extends InspectOptions {
    interpolationParamsResolver?: (info: TransformableInfo) => any[]
}

export function countSpecifiers(input: string) {
    return (input.match(/%[Ocdfijos]/g) ?? []).length
}

const formatter = format((info, opts: InterpolationFormatterOptions = {}) => {
    const { interpolationParamsResolver = (i) => i[LOGGER_INTERPOLATION] ?? [] } = opts
    const interpolationParams = interpolationParamsResolver(info)

    if (interpolationParams.length > 0) {
        info['message'] = formatWithOptions(opts, info['message'], ...interpolationParams)
    }

    return info
})

export default formatter as (options?: InterpolationFormatterOptions) => ReturnType<typeof formatter>
