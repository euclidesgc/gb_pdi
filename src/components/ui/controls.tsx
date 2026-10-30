import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import * as RSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  ghost:
    'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
  danger:
    'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950',
}

export function Button({
  variant = 'secondary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, 'min-h-20', props.className)} />
}

/**
 * Sentinel value for a "none/empty" option. Radix Select items cannot have an
 * empty string value, so nullable selects use this instead of `''`.
 */
export const SELECT_NONE = '__none__'

/**
 * Styled dropdown on Radix Select (shadcn/ui pattern), replacing the native
 * `<select>`. Use `<SelectItem value="…">` for options. `value` must always
 * match an item (use SELECT_NONE for an explicit "none" option).
 */
export function Select({
  value,
  onValueChange,
  placeholder,
  disabled,
  className,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <RSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <RSelect.Trigger
        className={cn(
          inputBase,
          'flex items-center justify-between gap-2 data-[placeholder]:text-slate-400 disabled:opacity-50',
          className,
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon asChild>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-60 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          style={{ width: 'var(--radix-select-trigger-width)' }}
        >
          <RSelect.Viewport className="p-1">{children}</RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}

export function SelectItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RSelect.Item
      value={value}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 outline-none select-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-indigo-700 dark:text-slate-200 dark:data-[highlighted]:bg-indigo-500/15 dark:data-[highlighted]:text-indigo-300"
    >
      <RSelect.ItemText>{children}</RSelect.ItemText>
      <RSelect.ItemIndicator>
        <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
      </RSelect.ItemIndicator>
    </RSelect.Item>
  )
}

/** Segmented 0–N selector used for self-assessment levels. */
export function LevelSelect({
  value,
  onChange,
  max = 5,
  accent = 'indigo',
}: {
  value: number
  onChange: (n: number) => void
  max?: number
  accent?: 'indigo' | 'emerald'
}) {
  const activeCls =
    accent === 'emerald'
      ? 'bg-emerald-500 text-white'
      : 'bg-indigo-500 text-white'
  return (
    <div className="inline-flex gap-1">
      {Array.from({ length: max + 1 }, (_, n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            'h-8 w-8 rounded-lg text-sm font-semibold transition-colors',
            n === value
              ? activeCls
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      {children}
    </div>
  )
}
