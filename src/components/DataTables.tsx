import { Database, Table2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { FileUpload } from "./FileUpload";

export function DataTables() {
  const { tables } = useData();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Data Sources</h2>
        </div>
        <FileUpload />
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin space-y-3">
        {tables.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No data loaded yet. Upload a CSV to get started.
          </p>
        ) : (
          tables.map((table) => (
            <div
              key={table.name}
              className="rounded-lg bg-secondary/50 border border-border p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Table2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium font-mono text-foreground">
                  {table.name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {table.rowCount} rows
                </span>
              </div>
              <div className="space-y-1">
                {table.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="font-mono text-muted-foreground">
                      {col.name}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
