import Bottleneck from 'bottleneck'
import { format as formatTime } from 'fecha'
import fetch from 'node-fetch'
import { html as fmt } from 'telegram-format'
import { inspect } from 'util'
import Transport, { type TransportStreamOptions } from 'winston-transport'
import type { TransformableInfo } from '../types'

export type TelegramParseMode = 'MarkdownV2' | 'Markdown' | 'HTML'

export interface TelegramSendMessageOptions
{
    messageThreadId?: number
    entities?: any[]
    disableWebPagePreview?: boolean
    disableNotification?: boolean
    protectContent?: boolean
    replyToMessageId?: boolean
    allowSendingWithoutReply?: boolean
    reply_markup?: any
}

export interface TelegramTransportOptions extends TransportStreamOptions
{
    botToken: string
    chatId: string | number
    timeFormat?: string
    formatMessage?: (info: TransformableInfo) => string
    parseMode?: TelegramParseMode
    sendMessageOptions?: TelegramSendMessageOptions
}

function capitalize(input: string)
{
    return input.charAt(0).toUpperCase() + input.slice(1)
}

export default class TelegramTransport extends Transport
{
    protected botToken: string
    protected chatId: string | number
    protected timeFormat: string
    protected parseMode: TelegramParseMode
    protected sendMessageOptions: TelegramSendMessageOptions
    protected formatMessage: (info: TransformableInfo) => string
    protected limiter: Bottleneck

    public constructor(options: TelegramTransportOptions)
    {
        super(options)

        this.botToken = options.botToken
        this.chatId = options.chatId
        this.timeFormat = options.timeFormat ?? 'YYYY-MM-DD HH:mm:ss'
        this.parseMode = options.parseMode ?? 'HTML'
        this.sendMessageOptions = options.sendMessageOptions ?? {}
        this.formatMessage = options.formatMessage ?? ((info) => this._formatMessage(info))

        this.limiter = new Bottleneck({
            minTime: 3000,
            maxConcurrent: 1,
        })
    }

    public log(info: TransformableInfo, next)
    {
        const sender = this.limiter.schedule(() => this.send(this.formatMessage(info)))

        sender.catch(error => {
            this.emit('error', error)
        })

        next(null)
    }

    protected async send(message: string)
    {
        const url = `https://api.telegram.org/bot${ this.botToken }/sendMessage`

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
                return this.emit('logged')
            }

            this.emit('error', {result, request, response})
        })

        request.catch((error) => {
            this.emit('error', {error, request})
        })
    }

    protected _formatMessage(info: TransformableInfo)
    {
        const data = Object.entries(JSON.parse(info[Symbol.for('message')])).map(([key, value]: [string, any]) => {
            if (key == 'level') {
                value = value.toUpperCase()
            }

            if (key == 'timestamp') {
                key = 'time'
                value = formatTime(new Date(value), this.timeFormat)
            }

            if (key == 'payload') {
                return `• Payload:\n` + fmt.monospaceBlock(inspect(value, {compact: true, breakLength: Infinity}))
            }

            if (key == 'stack') {
                return `• Stack:\n` + fmt.monospaceBlock(value)
            }

            return `• ${ capitalize(key) }: ${ key == 'message' || key == 'error' ? fmt.monospace(value) : fmt.bold(
                value) }`
        })

        return data.join('\n')
    }
}
