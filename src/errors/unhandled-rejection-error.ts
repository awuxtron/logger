export class UnhandledRejectionError extends Error {
    public constructor(public readonly reason: any, public readonly promise: Promise<any>) {
        super('Unhandled rejection: ' + reason)
        this.name = 'UnhandledRejectionError'
    }
}
