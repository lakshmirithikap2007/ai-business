import { LayoutDashboard } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { ChartRenderer } from "./ChartRenderer";

export function DashboardView() {
  const { pinnedCharts } = useData();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4 flex items-center gap-2">
        <LayoutDashboard className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Pinned Dashboard</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {pinnedCharts.length} chart{pinnedCharts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {pinnedCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <LayoutDashboard className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground">
              No pinned charts yet. Pin charts from your conversations to build your dashboard.
            </p>
          </div>
        ) : (
          <div className="chart-grid">
            {pinnedCharts.map((chart) => (
              <ChartRenderer key={chart.id} chart={chart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
