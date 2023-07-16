import type { Format } from 'logform'
import { DEFAULT_FILTER_ENV_KEY, LOG_LEVELS } from '../constants'
import type { LogLevel, TransformableInfo } from '../types'
import { LOGGER_NAMESPACE } from '../symbols'

export interface FilterFormatterOptions {
    enable?: boolean
    level?: LogLevel
    defaultFilter?: string
    filterResolver?: () => string
    filterEnvKey?: string
}

export class LogFilterFormat implements Format {
    public readonly level: LogLevel
    public readonly filter: string
    public readonly includes: RegExp[] = []
    public readonly excludes: RegExp[] = []

    public constructor(public readonly options: FilterFormatterOptions = {}) {
        const resolver = () => process.env[filterEnvKey] ?? defaultFilter
        const { defaultFilter = '-*', filterEnvKey = DEFAULT_FILTER_ENV_KEY, filterResolver = resolver } = options
        const { enable = true, level = 'debug' } = options

        this.level = level
        this.filter = enable ? filterResolver() : '*'

        const { includes, excludes } = LogFilterFormat.parseFilter(this.filter)

        this.includes = includes
        this.excludes = excludes
    }

    public static parseFilter(filter: string) {
        const includes: RegExp[] = []
        const excludes: RegExp[] = []

        for (let item of filter.split(/[\s,]+/)) {
            if (!item) {
                continue
            }

            item = item.replaceAll('*', '.*?')

            if (item.startsWith('-')) {
                excludes.push(new RegExp(`^${item.slice(1)}$`))
            } else {
                includes.push(new RegExp(`^${item}$`))
            }
        }

        return { includes, excludes }
    }

    public transform(info: TransformableInfo) {
        if (LOG_LEVELS[info.level] < LOG_LEVELS[this.level]) {
            return info
        }

        return this.isEnabled(info[LOGGER_NAMESPACE]) ? info : false
    }

    public isEnabled(name?: string) {
        if (this.filter === '*') {
            return true
        }

        if (this.filter === '-*' || !name) {
            return false
        }

        if (this.excludes.some((i) => i.test(name))) {
            return false
        }

        return this.includes.some((i) => i.test(name))
    }
}

export default function filter(options: FilterFormatterOptions = {}) {
    return new LogFilterFormat(options)
}
