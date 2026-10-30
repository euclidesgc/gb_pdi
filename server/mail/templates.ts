import type { MailMessage } from './mailer'

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )

/** Plain, client-safe HTML: one paragraph block plus an optional button. */
function layout(paragraphs: string[], action?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join('')
  const button = action
    ? `<p style="margin:24px 0"><a href="${esc(action.url)}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${esc(action.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;color:#64748b">Se o botão não funcionar, copie este link:<br><span style="word-break:break-all">${esc(action.url)}</span></p>`
    : ''
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:24px;font-weight:800;margin:0 0 24px;color:#4338ca"><span style="color:#c026d3">GB</span> PDI</p>
${body}${button}
<p style="margin:32px 0 0;font-size:12px;color:#94a3b8">Você recebeu este e-mail porque há uma conta no GB PDI com este endereço.</p>
</div></body></html>`
}

export function resetSenhaEmail(to: string, nome: string, url: string, horas: number): MailMessage {
  return {
    to,
    subject: 'Redefinir sua senha do GB PDI',
    text: `Olá, ${nome}!\n\nRecebemos um pedido para redefinir a senha da sua conta. Use o link abaixo (válido por ${horas} hora${horas > 1 ? 's' : ''}):\n\n${url}\n\nSe não foi você, ignore este e-mail: sua senha continua a mesma.`,
    html: layout(
      [
        `Olá, ${esc(nome)}!`,
        `Recebemos um pedido para redefinir a senha da sua conta. O link vale por ${horas} hora${horas > 1 ? 's' : ''}.`,
        'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
      ],
      { label: 'Redefinir senha', url },
    ),
  }
}

export function verificarEmail(to: string, nome: string, url: string): MailMessage {
  return {
    to,
    subject: 'Confirme seu e-mail no GB PDI',
    text: `Olá, ${nome}!\n\nConfirme seu e-mail para garantir que você consiga recuperar sua conta:\n\n${url}\n\nSe você não criou esta conta, ignore este e-mail.`,
    html: layout(
      [
        `Olá, ${esc(nome)}!`,
        'Confirme seu e-mail para garantir que você consiga recuperar sua conta se esquecer a senha.',
        'Se você não criou esta conta, ignore este e-mail.',
      ],
      { label: 'Confirmar e-mail', url },
    ),
  }
}

export function senhaAlteradaEmail(to: string, nome: string, url: string): MailMessage {
  return {
    to,
    subject: 'Sua senha do GB PDI foi alterada',
    text: `Olá, ${nome}!\n\nA senha da sua conta acabou de ser alterada e as outras sessões foram encerradas.\n\nSe não foi você, redefina a senha agora: ${url}`,
    html: layout(
      [
        `Olá, ${esc(nome)}!`,
        'A senha da sua conta acabou de ser alterada e as outras sessões foram encerradas.',
        'Se não foi você, redefina a senha agora:',
      ],
      { label: 'Redefinir senha', url },
    ),
  }
}
