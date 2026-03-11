import React, { createContext, useContext, useState, useCallback } from "react";
import type { TableInfo, ChartConfig, ChatMessage } from "@/lib/types";
import { loadCSV, getAllTables, executeQuery, getSchemaDescription } from "@/lib/database";

interface DataContextType {
  tables: TableInfo[];
  isLoading: boolean;
  messages: ChatMessage[];
  pinnedCharts: ChartConfig[];
  activeView: "chat" | "dashboard" | "data";
  uploadFiles: (files: File[]) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (update: Partial<ChatMessage>) => void;
  pinChart: (chart: ChartConfig) => void;
  unpinChart: (chartId: string) => void;
  setActiveView: (view: "chat" | "dashboard" | "data") => void;
  runQuery: (sql: string) => Record<string, unknown>[];
  getSchema: () => string;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedCharts, setPinnedCharts] = useState<ChartConfig[]>([]);
  const [activeView, setActiveView] = useState<"chat" | "dashboard" | "data">("chat");

  const uploadFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    console.log("Starting upload of", files.length, "files");
    try {
      for (const file of files) {
        console.log("Processing file:", file.name);
        await loadCSV(file);
      }
      const allTables = getAllTables();
      console.log("Tables updated:", allTables.length);
      setTables(allTables);
    } catch (error) {
      console.error("Error in uploadFiles:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastMessage = useCallback((update: Partial<ChatMessage>) => {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last) {
        copy[copy.length - 1] = { ...last, ...update };
      }
      return copy;
    });
  }, []);

  const pinChart = useCallback((chart: ChartConfig) => {
    setPinnedCharts((prev) => {
      if (prev.find((c) => c.id === chart.id)) return prev;
      return [...prev, { ...chart, pinned: true }];
    });
  }, []);

  const unpinChart = useCallback((chartId: string) => {
    setPinnedCharts((prev) => prev.filter((c) => c.id !== chartId));
  }, []);

  const runQuery = useCallback((sql: string) => {
    return executeQuery(sql);
  }, []);

  const getSchema = useCallback(() => {
    return getSchemaDescription();
  }, []);

  return (
    <DataContext.Provider
      value={{
        tables,
        isLoading,
        messages,
        pinnedCharts,
        activeView,
        uploadFiles,
        addMessage,
        updateLastMessage,
        pinChart,
        unpinChart,
        setActiveView,
        runQuery,
        getSchema,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
