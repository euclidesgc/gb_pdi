import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Option } from '@/components/ui/Combobox'

interface MultiComboboxProps {
  options: Option[]
  selected: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  maxResults?: number
  className?: string
}

/**
 * Searchable multi-select (checkbox list) on Radix Popover + cmdk. Clicking the
 * trigger opens the list so the available options are visible without typing.
 */
export function MultiCombobox({
  options,
  selected,
  onChange,
  placeholder = 'Selecione…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Nada encontrado.',
  maxResults = 50,
  className,
}: MultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
    return base.slice(0, maxResults)
  }, [options, search, maxResults])
  const hiddenCount = options.length - results.length

  const summary = useMemo(() => {
    if (selected.length === 0) return null
    if (selected.length === 1) return options.find((o) => o.id === selected[0])?.label ?? '1 selecionado'
    return `${selected.length} selecionados`
  }, [selected, options])

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch('')
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700',
            summary ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500',
            className,
          )}
        >
          <span className="truncate">{summary ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </Popover.Trigger>

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
              {results.map((o) => {
                const on = selectedSet.has(o.id)
                return (
                  <Command.Item
                    key={o.id}
                    value={o.id}
                    onSelect={() => toggle(o.id)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 dark:text-slate-200 dark:data-[selected=true]:bg-indigo-500/15 dark:data-[selected=true]:text-indigo-300"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        on
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-300 dark:border-slate-600',
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </Command.Item>
                )
              })}
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
