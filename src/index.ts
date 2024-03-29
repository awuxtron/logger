import { Logger } from './logger'
import type { UserLoggerOptions } from './types'

export * as errors from './errors'
export * as formatters from './formatters'
export * as transports from './transports'
export * as utils from './utils'
export * as constants from './constants'
export * as symbols from './symbols'

export * from './logger'
export * from './types'

export function createLogger(options: UserLoggerOptions = {}) {
    return Logger.create(options)
}

export default createLogger
