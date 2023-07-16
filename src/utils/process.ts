import { emptyPromise } from '@khangdt22/utils'
import type { Logger } from '../logger'

export type ExitHandler = (exitCode: number) => Promise<any> | any

export const WANT_EXIT = Symbol('want-exit')

const tasks = new Set<[handler: ExitHandler, minWaitTime: number]>()

export function addExitHandler(handler: ExitHandler, minWaitTime = 3000) {
    tasks.add([handler, minWaitTime])

    return () => {
        tasks.delete([handler, minWaitTime])
    }
}

let isExiting = false

export function gracefulExit(exitCode = 0, minWaitTime = 3000) {
    if (isExiting) {
        return
    }

    isExiting = true

    function done() {
        isExiting = false
        process.exit(exitCode)
    }

    if (tasks.size === 0) {
        return done()
    }

    const promises: Array<Promise<any>> = []

    for (const [handler, wait] of tasks) {
        promises.push(handler(exitCode))
        minWaitTime = Math.max(minWaitTime, wait)
    }

    const timeout = setTimeout(done, minWaitTime)

    Promise.all(promises).finally(() => {
        clearTimeout(timeout)
        done()
    })
}

export function registerTransportExitHandler(logger: Logger) {
    const promises: Array<Promise<any>> = []

    for (const transport of logger.winston.transports) {
        const { resolve, promise } = emptyPromise()

        transport.once('finish', resolve)
        transport.once('error', resolve)

        promises.push(promise)
    }

    return addExitHandler(async () => Promise.all(promises))
}
