import { Combobox, type Option } from '@/components/ui/Combobox'

interface CompetenciaPickerProps {
  options: Option[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
}

/**
 * Searchable single-select over a large option set (e.g. 1300+ competencies).
 * Thin wrapper over the shared Combobox: clicking opens the list so the user
 * can browse the options instead of guessing what to type.
 */
export function CompetenciaPicker({ options, value, onChange, placeholder }: CompetenciaPickerProps) {
  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? 'Selecionar competência…'}
      searchPlaceholder="Buscar competência…"
      emptyText="Nenhuma competência encontrada."
    />
  )
}
