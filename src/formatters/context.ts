import { format } from 'winston'
import { LOGGER_CONTEXT, LOGGER_INTERPOLATION, LOGGER_PAYLOAD, LOGGER_TIME } from '../symbols'
import { countSpecifiers } from './interpolation'

const formatter = format((info) => {
    info[LOGGER_TIME] = new Date()

    if (!info[LOGGER_PAYLOAD]) {
        info[LOGGER_PAYLOAD] = []
    }

    // if the message not is a string, move it to payload.
    if (typeof info['message'] !== 'string') {
        info[LOGGER_PAYLOAD].push(info['message'])
        info['message'] = ''
    }

    // if the message is a printf-like style, we will extract the interpolation part from contexts and set the payload
    // by remains data.
    const specifiersCount = countSpecifiers(info['message'])

    info[LOGGER_INTERPOLATION] = info[LOGGER_CONTEXT]?.slice(0, specifiersCount) ?? []
    info[LOGGER_PAYLOAD].push(...info[LOGGER_CONTEXT]?.slice(specifiersCount) ?? [])

    return info
})

export default formatter as () => ReturnType<typeof formatter>
