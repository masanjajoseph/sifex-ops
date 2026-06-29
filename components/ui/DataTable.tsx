'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  VisibilityState,
} from '@tanstack/react-table';
import { useState, useMemo, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Columns,
  CheckSquare,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: TData) => void;
  onSelectedRowsChange?: (rows: TData[]) => void;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  bulkActions?: React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  onSelectedRowsChange,
  enableRowSelection = false,
  enableColumnVisibility = false,
  emptyIcon,
  emptyTitle = 'No data',
  emptyDescription = 'No records found',
  emptyAction,
  bulkActions,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const [pageSizeLocal, setPageSizeLocal] = useState(pageSize);

  const selectionColumn = useMemo<ColumnDef<TData>>(
    () => ({
      id: 'select',
      header: ({ table }) => (
        <button
          onClick={table.getToggleAllRowsSelectedHandler()}
          className="flex items-center"
          aria-label={table.getIsAllRowsSelected() ? 'Deselect all' : 'Select all'}
        >
          {table.getIsAllRowsSelected() ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
        </button>
      ),
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            row.toggleSelected();
          }}
          className="flex items-center"
          aria-label={row.getIsSelected() ? 'Deselect row' : 'Select row'}
        >
          {row.getIsSelected() ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : (
            <Square className="h-4 w-4 text-gray-400" />
          )}
        </button>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    }),
    []
  );

  const allColumns = useMemo(() => {
    if (!enableRowSelection) return columns;
    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection, selectionColumn]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: (updater) => {
      setRowSelection((prev) => {
        const newValue = typeof updater === 'function' ? updater(prev) : updater;
        if (onSelectedRowsChange) {
          const selectedRows = Object.keys(newValue)
            .filter((key) => newValue[key])
            .map((key) => data[parseInt(key)]);
          onSelectedRowsChange(selectedRows);
        }
        return newValue;
      });
    },
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    enableRowSelection: enableRowSelection,
  });

  useEffect(() => { table.setPageSize(pageSizeLocal); }, [table, pageSizeLocal]);

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  if (isLoading) {
    return <LoadingState message="Loading data..." />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedCount > 0 && bulkActions && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-900/50 dark:bg-blue-950/50">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selectedCount} selected
          </span>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      {/* Column visibility toggle */}
      {enableColumnVisibility && (
        <div className="relative">
          <button
            onClick={() => setColumnVisibilityOpen(!columnVisibilityOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600"
            aria-label="Toggle column visibility"
          >
            <Columns className="h-4 w-4" />
            Columns
          </button>
          {columnVisibilityOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              {table.getAllLeafColumns().map((column) => {
                if (column.id === 'select') return null;
                return (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {column.id.charAt(0).toUpperCase() + column.id.slice(1)}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          'flex items-center gap-2',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-gray-400">
                            {header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50',
                  row.getIsSelected() && 'bg-blue-50 dark:bg-blue-950/30'
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => {
                  const isSelectCell = cell.column.id === 'select';
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-900 dark:text-gray-100',
                        isSelectCell && 'w-10'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{data.length} total rows</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <label htmlFor="page-size" className="sr-only">Rows per page</label>
            <select
              id="page-size"
              value={pageSizeLocal}
              onChange={(e) => setPageSizeLocal(Number(e.target.value))}
              className="rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="hidden sm:inline">per page</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-gray-200 px-2 py-1 text-sm disabled:opacity-30 dark:border-gray-700"
              aria-label="First page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <ChevronLeft className="h-3.5 w-3.5 -ml-1" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-gray-200 px-2.5 py-1 text-sm disabled:opacity-30 dark:border-gray-700"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {table.getPageOptions().map((page) => {
              const currentPage = table.getState().pagination.pageIndex;
              if (
                page === 0 ||
                page === table.getPageCount() - 1 ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => table.setPageIndex(page)}
                    className={cn(
                      'rounded px-2.5 py-1 text-sm font-medium',
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                    )}
                  >
                    {page + 1}
                  </button>
                );
              }
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-1 text-gray-400">
                    ...
                  </span>
                );
              }
              return null;
            })}
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-gray-200 px-2.5 py-1 text-sm disabled:opacity-30 dark:border-gray-700"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="rounded border border-gray-200 px-2 py-1 text-sm disabled:opacity-30 dark:border-gray-700"
              aria-label="Last page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <ChevronRight className="h-3.5 w-3.5 -ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
