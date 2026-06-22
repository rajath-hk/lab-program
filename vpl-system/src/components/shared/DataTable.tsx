import { ReactNode } from "react";

export interface Column<T> {
  key: keyof T;
  label: string;
}

interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  data: T[];
  actions?: (row: T) => ReactNode; // optional actions column
}

export function DataTable<T extends Record<string, any>>({ columns, data, actions }: DataTableProps<T>) {
  if (!data.length) {
    return <p className="text-center text-muted-foreground py-4">No records found.</p>;
  }

  // If actions provided, add an extra column
  const allColumns = actions ? [...columns, { key: "_actions" as any, label: "Actions" }] : columns;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-gray-50">
          <tr>
            {allColumns.map((col) => (
              <th key={String(col.key)} className="px-4 py-2 text-left font-medium text-gray-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-2 text-gray-700">
                  {String(row[col.key] ?? "")}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-2">
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
