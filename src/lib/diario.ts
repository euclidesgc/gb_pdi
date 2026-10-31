import { daysUntil, todayIso } from '@/lib/pdiStats'

/** ISO date (yyyy-mm-dd) for yesterday, local time. */
export function ontemIso(): string {
  const d = new Date(`${todayIso()}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

/** "Hoje", "Ontem", o dia da semana (até 6 dias atrás) ou "12 de março". */
export function diaRelativo(iso: string): string {
  const dias = -daysUntil(iso)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  if (dias > 1 && dias < 7) {
    const nome = SEMANA[d.getDay()]
    return nome.charAt(0).toUpperCase() + nome.slice(1)
  }
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: dias > 300 ? 'numeric' : undefined })
}

/** Modelos para começar uma entrada do diário. */
export const MODELOS_DIARIO: { nome: string; dica: string; texto: string }[] = [
  {
    nome: 'Vitória (o quê → como → impacto)',
    dica: 'Ótimo para o brag document',
    texto:
      '**Entrega:** \n**O que eu fiz:** \n**Impacto:** (antes → depois, quem se beneficiou)\n**Evidência:** [link](https://)',
  },
  {
    nome: 'Aprendizado',
    dica: 'Curso, leitura ou prática',
    texto: '**Estudei:** \n**Principal aprendizado:** \n**Onde vou aplicar:** ',
  },
  {
    nome: 'Bloqueio ou desafio',
    dica: 'O que travou e o próximo passo',
    texto: '**Desafio:** \n**O que tentei:** \n**Preciso de ajuda com:** \n**Próximo passo:** ',
  },
  {
    nome: 'Feedback recebido',
    dica: 'Guarde elogios e pontos de melhoria',
    texto: '> "" — (quem, contexto)\n\n**O que vou fazer com isso:** ',
  },
  {
    nome: 'Resumo da semana',
    dica: 'Uma revisão rápida de sexta-feira',
    texto: '## Semana\n- [x] \n- [ ] \n\n**Destaque:** \n**Para a próxima semana:** ',
  },
]
