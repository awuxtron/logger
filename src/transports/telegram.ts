import type { InspectOptions } from 'node:util'
import { inspect } from 'node:util'
import Bottleneck from 'bottleneck'
import { format as formatTime } from 'fecha'
import fetch from 'node-fetch'
import { html as fmt } from 'telegram-format'
import Transport, { type TransportStreamOptions } from 'winston-transport'
import mergeErrorCause from 'merge-error-cause'
import { chunkString } from '@khangdt22/utils'
import cleanStack from 'clean-stack'
import type { TransformableInfo } from '../types'
import { LOGGER_ERRORS, LOGGER_NAMESPACE, LOGGER_PAYLOAD, LOGGER_TIME } from '../symbols'

export type TelegramParseMode = 'MarkdownV2' | 'Markdown' | 'HTML'

export interface TelegramSendMessageOptions {
    messageThreadId?: number
    entities?: any[]
    disableWebPagePreview?: boolean
    disableNotification?: boolean
    protectContent?: boolean
    replyToMessageId?: boolean
    allowSendingWithoutReply?: boolean
    reply_markup?: any
}

export interface TelegramTransportOptions extends TransportStreamOptions {
    botToken: string
    chatId: string | number
    timeFormat?: string
    formatMessage?: (info: TransformableInfo) => string
    parseMode?: TelegramParseMode
    sendMessageOptions?: TelegramSendMessageOptions
}

export default class TelegramTransport extends Transport {
    protected botToken: string
    protected chatId: string | number
    protected timeFormat: string
    protected parseMode: TelegramParseMode
    protected sendMessageOptions: TelegramSendMessageOptions
    protected formatMessage: (info: TransformableInfo) => string
    protected limiter: Bottleneck

    public constructor(options: TelegramTransportOptions) {
        super(options)

        this.botToken = options.botToken
        this.chatId = options.chatId
        this.timeFormat = options.timeFormat ?? 'YYYY-MM-DD HH:mm:ss'
        this.parseMode = options.parseMode ?? 'HTML'
        this.sendMessageOptions = options.sendMessageOptions ?? {}
        this.formatMessage = options.formatMessage ?? ((info) => this._formatMessage(info))

        this.limiter = new Bottleneck({
            reservoir: 20,
            reservoirRefreshInterval: 60 * 1000,
            reservoirIncreaseAmount: 20,
            minTime: 30 / 1000,
            maxConcurrent: 1,
        })
    }

    public override log(info: TransformableInfo, next) {
        const sender = this.send(this.formatMessage(info))

        sender.catch((error) => {
            this.emit('error', error)
        })

        next(null)
    }

    protected async send(message: string) {
        for (const msg of chunkString(message, 4096)) {
            await this.limiter.schedule(() => this._send(msg))
        }

        this.emit('logged')
    }

    protected async _send(message: string) {
        const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`

        const data = {
            chat_id: this.chatId,
            parse_mode: this.parseMode,
            text: message,
            disableWebPagePreview: true,
            ...this.sendMessageOptions,
        }

        const request = fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        request.then(async (response) => {
            const result = await response.json()

            if (response.ok) {
                return
            }

            return this.emit('error', { result, request, response })
        })

        request.catch((error) => {
            this.emit('error', { error, request })
        })

        await request
    }

    protected _formatMessage(info: TransformableInfo) {
        const message: string[] = [
            `• Level: ${fmt.bold(info.level.toUpperCase())}`,
            `• Time: ${fmt.bold(formatTime(new Date(info[LOGGER_TIME]), this.timeFormat))}`,
        ]

        if (info[LOGGER_NAMESPACE]) {
            message.push(`• Name: ${fmt.bold(info[LOGGER_NAMESPACE])}`)
        }

        if (info['message']?.length) {
            message.push(`• Message: ${fmt.monospace(info['message'])}`)
        }

        if (info[LOGGER_ERRORS]?.length) {
            for (let error of info[LOGGER_ERRORS]) {
                error = mergeErrorCause(error)
                error.stack = cleanStack(error.stack)

                message.push('• Error:')
                message.push(fmt.monospaceBlock(this.inspect(error)))
            }
        }

        if (info[LOGGER_PAYLOAD]?.length) {
            message.push('• Payload:')

            message.push(
                fmt.monospaceBlock(this.inspect(info[LOGGER_PAYLOAD], {
                    compact: true,
                    breakLength: Number.POSITIVE_INFINITY,
                }))
            )
        }

        return message.join('\n')
    }

    protected inspect(value: any, options: InspectOptions = {}) {
        return inspect(value, {
            ...options,
            maxArrayLength: Number.POSITIVE_INFINITY,
            maxStringLength: Number.POSITIVE_INFINITY,
        })
    }
}
