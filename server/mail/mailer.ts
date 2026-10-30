import nodemailer, { type Transporter } from 'nodemailer'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html: string
}

/**
 * SMTP from env: SMTP_HOST, SMTP_PORT (587 = STARTTLS, 465 = TLS), SMTP_USER,
 * SMTP_PASSWORD, SMTP_FROM (e.g. `GB PDI <no-reply@…>`). Without SMTP_HOST the
 * mailer is disabled: in dev the message is printed to the console instead.
 */
export class Mailer {
  private transport: Transporter | null
  private from: string
  private logInstead: boolean

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const host = env.SMTP_HOST
    const port = Number(env.SMTP_PORT ?? 587)
    this.from = env.SMTP_FROM ?? env.SMTP_USER ?? 'GB PDI <no-reply@localhost>'
    this.logInstead = !host && env.NODE_ENV !== 'production'
    this.transport =
      host && env.SMTP_PASSWORD
        ? nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            requireTLS: port !== 465,
            auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
          })
        : null
  }

  get enabled(): boolean {
    return this.transport !== null || this.logInstead
  }

  async send(msg: MailMessage): Promise<void> {
    if (this.transport) {
      await this.transport.sendMail({ from: this.from, ...msg })
      return
    }
    if (this.logInstead) {
      console.log(`[mail:dev] para ${msg.to} — ${msg.subject}\n${msg.text}\n`)
      return
    }
    throw new Error('SMTP não configurado')
  }

  /** Checks the SMTP connection and credentials (logged at boot). */
  async verify(): Promise<string> {
    if (!this.transport) return this.logInstead ? 'console (dev)' : 'desativado'
    await this.transport.verify()
    return 'ok'
  }
}
