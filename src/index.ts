import { Logger } from './logger'
import type { LoggerOptions } from './types'

export * as formatters from './formatters'
export * as transports from './transports'
export * as constants from './constants'
export * as symbols from './symbols'

export * from './logger'
export * from './types'

export function createLogger(options: Partial<LoggerOptions> = {})
{
    return Logger.create(options)
}

export default createLogger
