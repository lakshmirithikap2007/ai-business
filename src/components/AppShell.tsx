import { MessageSquare, LayoutDashboard, Database, Sparkles } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { DataTables } from "./DataTables";
import { ChatInterface } from "./ChatInterface";
import { DashboardView } from "./DashboardView";

export function AppShell() {
  const { activeView, setActiveView, pinnedCharts, tables } = useData();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-card">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold gradient-text">InsightAI</h1>
              <p className="text-[10px] text-muted-foreground">Conversational BI</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 border-b border-border">
          <NavButton
            icon={<MessageSquare className="h-4 w-4" />}
            label="Chat"
            active={activeView === "chat"}
            onClick={() => setActiveView("chat")}
          />
          <NavButton
            icon={<LayoutDashboard className="h-4 w-4" />}
            label="Dashboard"
            badge={pinnedCharts.length || undefined}
            active={activeView === "dashboard"}
            onClick={() => setActiveView("dashboard")}
          />
          <NavButton
            icon={<Database className="h-4 w-4" />}
            label="Data"
            badge={tables.length || undefined}
            active={activeView === "data"}
            onClick={() => setActiveView("data")}
          />
        </nav>

        {/* Data tables sidebar (always visible) */}
        <div className="flex-1 overflow-hidden">
          <DataTables />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === "chat" && <ChatInterface />}
        {activeView === "dashboard" && <DashboardView />}
        {activeView === "data" && (
          <div className="flex-1 overflow-auto p-6">
            <DataTableFull />
          </div>
        )}
      </main>
    </div>
  );
}

function NavButton({
  icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
          {badge}
        </span>
      )}
    </button>
  );
}

function DataTableFull() {
  const { tables, runQuery } = useData();

  if (tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Upload CSV files to view your data here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tables.map((table) => {
        let data: Record<string, unknown>[] = [];
        try {
          data = runQuery(`SELECT * FROM "${table.name}" LIMIT 100`);
        } catch (error) {
          console.error(`Error querying table ${table.name}:`, error);
        }


        return (
          <div key={table.name} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-medium text-foreground">{table.name}</span>
              <span className="text-xs text-muted-foreground">({table.rowCount} rows)</span>
            </div>
            <div className="overflow-auto max-h-96 scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    {table.columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-3 py-2 text-left font-mono text-muted-foreground font-medium whitespace-nowrap"
                      >
                        {col.name}
                        <span className="ml-1 text-[10px] opacity-50">({col.type})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/30">
                      {table.columns.map((col) => (
                        <td key={col.name} className="px-3 py-1.5 text-foreground whitespace-nowrap">
                          {String(row[col.name] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
