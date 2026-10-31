import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Quote,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { renderMarkdown } from '@/lib/markdown'

/**
 * Editor de Markdown com barra de formatação, abas Escrever/Visualizar e modo
 * expandido lado a lado. Mesmo comportamento do editor do Faz AI (atalhos,
 * formatação sobre a seleção, altura acompanhando o texto), com o visual do GB PDI.
 */

export type Format = 'bold' | 'italic' | 'heading' | 'ul' | 'ol' | 'task' | 'code' | 'quote' | 'link'

const TOOLS: { kind: Format; Icon: LucideIcon; title: string }[] = [
  { kind: 'bold', Icon: Bold, title: 'Negrito (Ctrl+B)' },
  { kind: 'italic', Icon: Italic, title: 'Itálico (Ctrl+I)' },
  { kind: 'heading', Icon: Heading2, title: 'Título' },
  { kind: 'ul', Icon: List, title: 'Lista' },
  { kind: 'ol', Icon: ListOrdered, title: 'Lista numerada' },
  { kind: 'task', Icon: ListChecks, title: 'Lista de tarefas' },
  { kind: 'quote', Icon: Quote, title: 'Citação' },
  { kind: 'code', Icon: Code, title: 'Código' },
  { kind: 'link', Icon: Link2, title: 'Link (Ctrl+K)' },
]

/** Aplica a formatação sobre a seleção e devolve o novo texto e a nova seleção. */
function applyFormat(
  value: string,
  start: number,
  end: number,
  kind: Format,
): { value: string; start: number; end: number } {
  const sel = value.slice(start, end)
  const wrap = (before: string, after: string, placeholder: string) => {
    const text = sel || placeholder
    return {
      value: value.slice(0, start) + before + text + after + value.slice(end),
      start: start + before.length,
      end: start + before.length + text.length,
    }
  }
  const prefixLines = (prefix: (i: number) => string) => {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEndIdx = value.indexOf('\n', end)
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx
    const block = value
      .slice(lineStart, lineEnd)
      .split('\n')
      .map((l, i) => prefix(i) + l)
      .join('\n')
    return {
      value: value.slice(0, lineStart) + block + value.slice(lineEnd),
      start: lineStart,
      end: lineStart + block.length,
    }
  }
  switch (kind) {
    case 'bold':
      return wrap('**', '**', 'texto')
    case 'italic':
      return wrap('_', '_', 'texto')
    case 'code':
      return sel.includes('\n') ? wrap('```\n', '\n```', 'código') : wrap('`', '`', 'código')
    case 'link':
      return wrap('[', '](https://)', 'texto')
    case 'heading':
      return prefixLines(() => '## ')
    case 'ul':
      return prefixLines(() => '- ')
    case 'ol':
      return prefixLines((i) => `${i + 1}. `)
    case 'task':
      return prefixLines(() => '- [ ] ')
    case 'quote':
      return prefixLines(() => '> ')
  }
}

interface Props {
  value: string
  onChange(value: string): void
  placeholder?: string
  ariaLabel?: string
  id?: string
  minRows?: number
  autoFocus?: boolean
  /** Ctrl/Cmd+Enter */
  onSubmit?(): void
  /** Esconde o botão de expandir. */
  compact?: boolean
  /** Conteúdo extra à direita da barra (ex.: modelos de texto). */
  extra?: ReactNode
  className?: string
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Markdown suportado',
  ariaLabel,
  id,
  minRows = 6,
  autoFocus,
  onSubmit,
  compact,
  extra,
  className,
}: Props) {
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [expanded, setExpanded] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  // A altura acompanha o conteúdo (até 60% da tela).
  useEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight + 2, window.innerHeight * 0.6)}px`
  }, [value, mode, expanded])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setExpanded(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [expanded])

  const format = (kind: Format) => {
    const el = ref.current
    if (!el) return
    const r = applyFormat(value, el.selectionStart, el.selectionEnd, kind)
    onChange(r.value)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(r.start, r.end)
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key === 'Enter' && onSubmit) {
      e.preventDefault()
      onSubmit()
    } else if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      format('bold')
    } else if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      format('italic')
    } else if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      format('link')
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      const el = e.currentTarget
      const s = el.selectionStart
      onChange(value.slice(0, s) + '  ' + value.slice(el.selectionEnd))
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
    }
  }

  const tab = (on: boolean) =>
    cn(
      'rounded-md px-2 py-1 text-xs font-medium transition-colors',
      on
        ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
    )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800/60">
      {TOOLS.map((tool) => (
        <button
          key={tool.kind}
          type="button"
          title={tool.title}
          aria-label={tool.title}
          disabled={mode === 'preview' && !expanded}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format(tool.kind)}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
        >
          <tool.Icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <span className="flex-1" />
      {extra}
      {!expanded && (
        <div className="flex rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-900/60">
          <button type="button" className={tab(mode === 'write')} onClick={() => setMode('write')}>
            Escrever
          </button>
          <button type="button" className={tab(mode === 'preview')} onClick={() => setMode('preview')}>
            Visualizar
          </button>
        </div>
      )}
      {!compact && (
        <button
          type="button"
          title={expanded ? 'Recolher (Esc)' : 'Expandir editor'}
          aria-label={expanded ? 'Recolher editor' : 'Expandir editor'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setExpanded(!expanded)
            setMode('write')
          }}
          className="ml-1 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  )

  const textarea = (
    <textarea
      ref={ref}
      id={id}
      autoFocus={autoFocus || expanded}
      rows={minRows}
      value={value}
      aria-label={ariaLabel ?? placeholder}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={cn(
        'block w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100',
        expanded && 'h-full',
      )}
    />
  )

  const preview = (
    <div
      className={cn(
        'markdown min-h-24 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200',
        expanded && 'h-full overflow-y-auto border-l border-slate-200 dark:border-slate-700',
      )}
      dangerouslySetInnerHTML={{
        __html: value.trim()
          ? renderMarkdown(value)
          : '<p class="text-slate-400">Nada para visualizar.</p>',
      }}
    />
  )

  const frame =
    'overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-400 dark:border-slate-600 dark:bg-slate-800'

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-50 flex bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Editor expandido"
      >
        <div className={cn(frame, 'flex h-full w-full flex-col shadow-2xl')}>
          {toolbar}
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
            <div className="min-h-0 overflow-y-auto">{textarea}</div>
            <div className="hidden min-h-0 md:block">{preview}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(frame, className)}>
      {toolbar}
      {mode === 'write' ? textarea : preview}
    </div>
  )
}
