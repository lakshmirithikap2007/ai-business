export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  sampleValues: string[];
}

export interface ChartConfig {
  id: string;
  type: "bar" | "line" | "pie" | "area" | "scatter" | "table";
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  sql?: string;
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartConfig[];
  timestamp: Date;
  isLoading?: boolean;
}

export interface DataStore {
  tables: TableInfo[];
  isReady: boolean;
}
