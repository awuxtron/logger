import { format } from 'winston'
import { serialize } from 'error-serializer'
import { LOGGER_ERRORS, LOGGER_NAMESPACE, LOGGER_PAYLOAD, LOGGER_TIME } from '../symbols'

const formatter = format((info) => {
    const result = {
        level: info['level'],
        time: info[LOGGER_TIME].toLocaleString(),
    }

    if (info[LOGGER_NAMESPACE]) {
        result['name'] = info[LOGGER_NAMESPACE]
    }

    if (info['message']?.length) {
        result['message'] = info['message']
    }

    if (info[LOGGER_ERRORS]?.length) {
        result['errors'] = info[LOGGER_ERRORS].map((error) => serialize(error))
    }

    if (info[LOGGER_PAYLOAD]?.length) {
        result['payload'] = info[LOGGER_PAYLOAD]
    }

    info[Symbol.for('message')] = JSON.stringify(result)

    return info
})

export default formatter as () => ReturnType<typeof formatter>
