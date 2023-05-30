import { format } from 'winston'
import { DEFAULT_FILTER_ENV_KEY, DEFAULT_NAMESPACE_DELIMITER } from '../constants'
import { LOGGER_NAMESPACE } from '../symbols'

export interface IsMatchOptions
{
    delimiter?: string
    namespaceDelimiter?: string
    exceptCharacter?: string
}

export interface FilterFormatterOptions extends IsMatchOptions
{
    resolveFilter?: () => string | undefined
    filterEnvKey?: string
    namespaceKey?: PropertyKey
}

export function isMatch(pattern: string, input: string, options: IsMatchOptions = {})
{
    const {delimiter = ',', namespaceDelimiter = DEFAULT_NAMESPACE_DELIMITER, exceptCharacter = '-'} = options

    let isMatched = false
    let hasOnlyExcept = true

    for (let item of pattern.split(delimiter)) {
        let isExcept = false

        if (item.startsWith(exceptCharacter)) {
            isExcept = true
            item = item.slice(1)
        } else {
            hasOnlyExcept = false
        }

        if (item.endsWith(`${ namespaceDelimiter }*`)) {
            item = item.slice(0, -2)
        }

        const regex = new RegExp(`^${item.replace('*', '.*')}(${namespaceDelimiter}.*)?$`)

        if (regex.test(input)) {
            if (isExcept) {
                return false
            }

            isMatched = true
        }
    }

    return hasOnlyExcept ? true : isMatched
}

const formatter = format((info, options: FilterFormatterOptions) => {
    const {
        resolveFilter = () => process.env[filterEnvKey],
        filterEnvKey = DEFAULT_FILTER_ENV_KEY,
        namespaceKey = LOGGER_NAMESPACE,
        ...isMatchOptions
    } = options

    const filter = resolveFilter()

    if (!filter) {
        return info
    }

    return isMatch(filter, info[namespaceKey] ?? '', isMatchOptions) ? info : false
})

export default formatter as (options?: FilterFormatterOptions) => ReturnType<typeof formatter>
