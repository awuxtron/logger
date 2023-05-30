import { serializeError } from 'serialize-error'
import { format } from 'winston'
import { LOGGER_ERROR, LOGGER_PAYLOAD, LOGGER_RAW_ERROR } from '../symbols'

function isValid(payload: any[])
{
    return payload[0] instanceof Error && payload.slice(1).every((i) => !(i instanceof Error))
}

const formatter = format((info) => {
    if (isValid(info[LOGGER_PAYLOAD])) {
        info[LOGGER_RAW_ERROR] = info[LOGGER_PAYLOAD].shift()

        const {name, message, stack, code, cause, ...payload} = serializeError(info[LOGGER_RAW_ERROR])

        info[LOGGER_ERROR] = {type: name, stack}

        if (message.length > 0) {
            info[LOGGER_ERROR].error = message
        }

        if (code) {
            info[LOGGER_ERROR].code = code
        }

        if (cause) {
            info[LOGGER_ERROR].cause = cause
        }

        if (Object.keys(payload).length > 0) {
            info[LOGGER_ERROR].payload = payload
        }
    }

    return info
})

export default formatter as () => ReturnType<typeof formatter>
