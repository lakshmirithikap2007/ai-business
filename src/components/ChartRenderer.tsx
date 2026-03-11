import { useRef, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Pin, PinOff, Download, Code2 } from "lucide-react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import type { ChartConfig } from "@/lib/types";
import { useData } from "@/contexts/DataContext";

const CHART_COLORS = [
  "hsl(195, 100%, 50%)",
  "hsl(265, 80%, 60%)",
  "hsl(155, 70%, 45%)",
  "hsl(38, 92%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(30, 90%, 60%)",
];

interface Props {
  chart: ChartConfig;
  compact?: boolean;
}

export function ChartRenderer({ chart, compact }: Props) {
  const { pinChart, unpinChart, pinnedCharts } = useData();
  const chartRef = useRef<HTMLDivElement>(null);
  const isPinned = pinnedCharts.some((c) => c.id === chart.id);

  const exportPNG = useCallback(async () => {
    if (!chartRef.current) return;
    const url = await toPng(chartRef.current, { backgroundColor: "#141820" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chart.title.replace(/\s+/g, "_")}.png`;
    a.click();
  }, [chart.title]);

  const exportCSV = useCallback(() => {
    if (!chart.data.length) return;
    const keys = Object.keys(chart.data[0]);
    const csv = [
      keys.join(","),
      ...chart.data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${chart.title.replace(/\s+/g, "_")}.csv`;
    a.click();
  }, [chart]);

  const height = compact ? 220 : 300;

  const renderChart = () => {
    const xKey = chart.xKey || (chart.data.length > 0 ? Object.keys(chart.data[0])[0] : "x");
    const yKeys = chart.yKeys || (chart.data.length > 0 ? Object.keys(chart.data[0]).filter((k) => k !== xKey) : ["y"]);

    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
              <XAxis dataKey={xKey} tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Legend />
              {yKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
              <XAxis dataKey={xKey} tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Legend />
              {yKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chart.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
              <XAxis dataKey={xKey} tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Legend />
              {yKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.15} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie": {
        const nameKey = chart.nameKey || xKey;
        const valueKey = chart.valueKey || yKeys[0];
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie data={chart.data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={height / 3} label>
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
              <XAxis dataKey={xKey} tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <YAxis dataKey={yKeys[0]} tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: 8, color: "hsl(210,20%,92%)" }} />
              <Scatter data={chart.data} fill={CHART_COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "table":
        return (
          <div className="overflow-auto max-h-64 scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {Object.keys(chart.data[0] || {}).map((key) => (
                    <th key={key} className="px-3 py-2 text-left font-mono text-muted-foreground font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.data.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/50">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-3 py-1.5 text-foreground">
                        {String(val ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <p className="text-muted-foreground text-sm">Unsupported chart type: {chart.type}</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      ref={chartRef}
      className="rounded-lg bg-card border border-border p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{chart.title}</h3>
          {chart.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{chart.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {chart.sql && (
            <button
              title="View SQL"
              className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => navigator.clipboard.writeText(chart.sql || "")}
            >
              <Code2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            title="Export PNG"
            onClick={exportPNG}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            title={isPinned ? "Unpin" : "Pin to dashboard"}
            onClick={() => (isPinned ? unpinChart(chart.id) : pinChart(chart))}
            className={`rounded p-1.5 transition-colors ${
              isPinned
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {renderChart()}
    </motion.div>
  );
}
