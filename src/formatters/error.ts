import { format } from 'winston'
import isErrorInstance from 'is-error-instance'
import { LOGGER_ERRORS, LOGGER_PAYLOAD } from '../symbols'

const formatter = format((info) => {
    if (!info[LOGGER_ERRORS]) {
        info[LOGGER_ERRORS] = []
    }

    const indexes: number[] = []

    for (const [i, item] of info[LOGGER_PAYLOAD].entries()) {
        if (isErrorInstance(item)) {
            info[LOGGER_ERRORS].push(item)
            indexes.push(i)
        }
    }

    info[LOGGER_PAYLOAD] = info[LOGGER_PAYLOAD].filter((_, i) => !indexes.includes(i))

    return info
})

export default formatter as () => ReturnType<typeof formatter>
