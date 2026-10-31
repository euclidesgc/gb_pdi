import type { DataTableColumn } from "@/components/ui/DataTable";

/** The record's id as the first column: monospace, truncated, full value on hover. */
export function idColumn<T extends { id: string }>(): DataTableColumn<T> {
  return {
    id: "id",
    header: "Id",
    cell: (row) => (
      <span
        className="block max-w-[10rem] truncate font-mono text-xs text-slate-500 dark:text-slate-400"
        title={row.id}
      >
        {row.id}
      </span>
    ),
    sortValue: (row) => row.id,
    width: "11rem",
  };
}
