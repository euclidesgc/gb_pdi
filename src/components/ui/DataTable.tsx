import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Card } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

export type SortDirection = "asc" | "desc";
export type SortType = "text" | "number" | "date";
export type SortValue = string | number | Date | null | undefined;

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<T> {
  /** Stable key for the column; also identifies it in the sort state. */
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Value used to sort the column. Required for the column to be sortable. */
  sortValue?: (row: T) => SortValue;
  /** How `sortValue` is compared. Defaults to `text` (localeCompare pt-BR). */
  sortType?: SortType;
  /** Set to false to keep a column with `sortValue` from being sorted by click. */
  sortable?: boolean;
  /** Sorts the table by this column when it first renders. */
  defaultSort?: SortDirection;
  align?: "left" | "center" | "right";
  /** Any CSS width (e.g. `'6rem'`, `120`). */
  width?: CSSProperties["width"];
  /** Extra classes for both the header and the cells (e.g. responsive visibility). */
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: ReactNode;
  /** Shows only the first `limit` rows (after sorting) and a hint to refine the search. */
  limit?: number;
  /** Content of a trailing "Ações" column; omitted when not given. */
  actions?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
}

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;
const JUSTIFY = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

function toComparable(v: SortValue, type: SortType): string | number | null {
  if (v === null || v === undefined || v === "") return null;
  if (type === "text") return String(v);
  const n = type === "date" ? new Date(v).getTime() : Number(v);
  return Number.isNaN(n) ? null : n;
}

function compare(
  a: SortValue,
  b: SortValue,
  type: SortType,
  dir: SortDirection,
): number {
  const x = toComparable(a, type);
  const y = toComparable(b, type);
  // Empty values always go last, whatever the direction.
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  const r =
    typeof x === "string"
      ? collator.compare(x, y as string)
      : x - (y as number);
  return dir === "asc" ? r : -r;
}

const isSortable = <T,>(c: DataTableColumn<T>) =>
  c.sortable !== false && !!c.sortValue;

/** Next state when a header is clicked: ascending → descending → unsorted. */
function nextSort(cur: SortState | null, columnId: string): SortState | null {
  if (cur?.columnId !== columnId) return { columnId, direction: "asc" };
  return cur.direction === "asc" ? { columnId, direction: "desc" } : null;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = "Nenhum registro.",
  limit,
  actions,
  rowClassName,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(() => {
    const c = columns.find((col) => col.defaultSort && isSortable(col));
    return c ? { columnId: c.id, direction: c.defaultSort! } : null;
  });

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.columnId);
    if (!sort || !col?.sortValue) return rows;
    const get = col.sortValue;
    const type = col.sortType ?? "text";
    // Array#sort is stable, so ties keep the order the rows came in.
    return [...rows].sort((a, b) =>
      compare(get(a), get(b), type, sort.direction),
    );
  }, [rows, columns, sort]);

  const visible = limit ? sorted.slice(0, limit) : sorted;
  const colSpan = columns.length + (actions ? 1 : 0);

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
          <tr>
            {columns.map((c) => {
              const align = c.align ?? "left";
              const dir = sort?.columnId === c.id ? sort.direction : null;
              return (
                <th
                  key={c.id}
                  style={{ width: c.width }}
                  className={cn("px-4 py-3", ALIGN[align], c.className)}
                  aria-sort={
                    dir
                      ? dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {isSortable(c) ? (
                    <button
                      type="button"
                      onClick={() => setSort((cur) => nextSort(cur, c.id))}
                      className={cn(
                        "group inline-flex w-full items-center gap-1 uppercase hover:text-slate-800 dark:hover:text-slate-100",
                        JUSTIFY[align],
                        dir && "text-slate-800 dark:text-slate-100",
                      )}
                    >
                      {c.header}
                      <SortIcon direction={dir} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
            {actions && <th className="w-24 px-4 py-3 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-10 text-center text-slate-400"
              >
                Carregando…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="px-4 py-10 text-center text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            visible.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40",
                  rowClassName?.(row),
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    className={cn(
                      "px-4 py-3 text-slate-700 dark:text-slate-200",
                      ALIGN[c.align ?? "left"],
                      c.className,
                    )}
                  >
                    {c.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {actions(row)}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {limit !== undefined && rows.length > limit && (
        <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-400 dark:border-slate-800">
          Mostrando {limit} de {rows.length}. Refine a busca para ver mais.
        </div>
      )}
    </Card>
  );
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc")
    return <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  if (direction === "desc")
    return <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  return (
    <ChevronsUpDown
      className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-80"
      aria-hidden
    />
  );
}
