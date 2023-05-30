import { formatWithOptions } from 'node:util'
import type { InspectOptions } from 'util'
import { format } from 'winston'
import { LOGGER_INTERPOLATION } from '../symbols'
import type { TransformableInfo } from '../types'

export interface InterpolationFormatterOptions extends InspectOptions
{
    resolveInterpolationParams?: (info: TransformableInfo) => any[]
}

export function countSpecifiers(input: string)
{
    return (input.match(/%[sdifjoOc]/g) ?? []).length
}

const formatter = format((info, opts: InterpolationFormatterOptions = {}) => {
    const {resolveInterpolationParams = (i) => i[LOGGER_INTERPOLATION] ?? []} = opts
    const interpolationParams = resolveInterpolationParams(info)

    if (interpolationParams.length > 0) {
        info['message'] = formatWithOptions(opts, info['message'], ...interpolationParams)
    }

    return info
})

export default formatter as (options?: InterpolationFormatterOptions) => ReturnType<typeof formatter>
