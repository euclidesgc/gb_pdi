import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ComboboxOption {
  id: string
  label: string
}

/** Shared option shape used by Combobox / MultiCombobox and their callers. */
export type Option = ComboboxOption

interface ComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  clearable?: boolean
  /** Cap the rendered list so very large option sets (1000+) stay snappy. */
  maxResults?: number
  className?: string
}

/**
 * Searchable single-select built on Radix Popover + cmdk (shadcn/ui pattern).
 * Unlike a bare search box, clicking the trigger OPENS the list so the user can
 * see the available options without having to guess what to type.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Nada encontrado.',
  clearable = true,
  maxResults = 50,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const current = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value])
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
    return base.slice(0, maxResults)
  }, [options, search, maxResults])
  const hiddenCount = options.length - results.length

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch('')
      }}
    >
      <div className={cn('flex items-center gap-2', className)}>
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700',
              current ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500',
            )}
          >
            <span className="truncate">{current ? current.label : placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </Popover.Trigger>
        {clearable && current && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Limpar seleção"
            className="shrink-0 text-slate-400 transition-colors hover:text-rose-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
          className="z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <Command shouldFilter={false} className="w-full">
            <div className="border-b border-slate-100 px-3 dark:border-slate-800">
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
              />
            </div>
            <Command.List className="max-h-60 overflow-y-auto p-1">
              <Command.Empty className="py-6 text-center text-sm text-slate-400">
                {emptyText}
              </Command.Empty>
              {results.map((o) => (
                <Command.Item
                  key={o.id}
                  value={o.id}
                  onSelect={() => {
                    onChange(o.id)
                    setOpen(false)
                    setSearch('')
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-slate-200 dark:data-[selected=true]:bg-indigo-500/15 dark:data-[selected=true]:text-indigo-300"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300',
                      o.id === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </Command.Item>
              ))}
              {hiddenCount > 0 && (
                <p className="px-2 py-1.5 text-xs text-slate-400">
                  Refine a busca para ver mais… ({hiddenCount} ocultos)
                </p>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
