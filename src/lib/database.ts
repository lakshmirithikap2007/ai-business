import initSqlJs, { Database } from "sql.js";
import Papa from "papaparse";
import type { TableInfo, ColumnInfo } from "./types";

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
  });
  db = new SQL.Database();
  return db;
}

export function getDatabase(): Database | null {
  return db;
}

function sanitizeColumnName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&")
    .toLowerCase();
}

function sanitizeTableName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[0-9]/, "_$&")
    .toLowerCase();
}

function inferSqlType(values: string[]): string {
  const sample = values.filter((v) => v !== "" && v != null).slice(0, 50);
  if (sample.length === 0) return "TEXT";
  const allNumbers = sample.every((v) => !isNaN(Number(v)));
  if (allNumbers) {
    const hasDecimal = sample.some((v) => v.includes("."));
    return hasDecimal ? "REAL" : "INTEGER";
  }
  return "TEXT";
}

export async function loadCSV(
  file: File
): Promise<{ tableName: string; info: TableInfo }> {
  const database = await initDatabase();

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawHeaders = results.meta.fields || [];
          const tableName = sanitizeTableName(file.name);
          const colMap = rawHeaders.map((h) => ({
            original: h,
            sanitized: sanitizeColumnName(h),
          }));

          const rows = results.data as Record<string, string>[];
          const columnTypes = colMap.map((col) => {
            const values = rows.map((r) => r[col.original]);
            return inferSqlType(values);
          });

          // Drop table if exists
          database.run(`DROP TABLE IF EXISTS "${tableName}"`);

          const colDefs = colMap
            .map((col, i) => `"${col.sanitized}" ${columnTypes[i]}`)
            .join(", ");
          database.run(`CREATE TABLE "${tableName}" (${colDefs})`);

          // Insert rows
          const placeholders = colMap.map(() => "?").join(", ");
          const insertSQL = `INSERT INTO "${tableName}" VALUES (${placeholders})`;
          const stmt = database.prepare(insertSQL);

          for (const row of rows) {
            const values = colMap.map((col, i) => {
              const val = row[col.original];
              if (val === "" || val == null) return null;
              if (columnTypes[i] === "INTEGER") return parseInt(val, 10);
              if (columnTypes[i] === "REAL") return parseFloat(val);
              return val;
            });
            stmt.run(values);
          }
          stmt.free();

          const columns: ColumnInfo[] = colMap.map((col, i) => ({
            name: col.sanitized,
            type: columnTypes[i],
            sampleValues: rows
              .slice(0, 5)
              .map((r) => String(r[col.original] ?? "")),
          }));

          const info: TableInfo = {
            name: tableName,
            columns,
            rowCount: rows.length,
          };

          resolve({ tableName, info });
        } catch (e) {
          reject(e);
        }
      },
      error: reject,
    });
  });
}

export function executeQuery(sql: string): Record<string, unknown>[] {
  const database = getDatabase();
  if (!database) throw new Error("Database not initialized");

  try {
    const results = database.exec(sql);
    if (results.length === 0) return [];

    const { columns, values } = results[0];
    return values.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  } catch (e) {
    throw new Error(`SQL Error: ${(e as Error).message}`);
  }
}

export function getAllTables(): TableInfo[] {
  const database = getDatabase();
  if (!database) return [];

  const tables = database.exec(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  if (tables.length === 0) return [];

  return tables[0].values.map((row) => {
    const name = String(row[0]);
    const pragma = database.exec(`PRAGMA table_info("${name}")`);
    const columns: ColumnInfo[] =
      pragma.length > 0
        ? pragma[0].values.map((p) => {
            const colName = String(p[1]);
            const sampleResult = database.exec(
              `SELECT "${colName}" FROM "${name}" LIMIT 5`
            );
            return {
              name: colName,
              type: String(p[2]),
              sampleValues:
                sampleResult.length > 0
                  ? sampleResult[0].values.map((v) => String(v[0] ?? ""))
                  : [],
            };
          })
        : [];

    const countResult = database.exec(`SELECT COUNT(*) FROM "${name}"`);
    const rowCount =
      countResult.length > 0 ? Number(countResult[0].values[0][0]) : 0;

    return { name, columns, rowCount };
  });
}

export function getSchemaDescription(): string {
  const tables = getAllTables();
  if (tables.length === 0) return "No tables loaded.";

  return tables
    .map((t) => {
      const cols = t.columns
        .map((c) => `  - ${c.name} (${c.type}) [samples: ${c.sampleValues.slice(0, 3).join(", ")}]`)
        .join("\n");
      return `Table: "${t.name}" (${t.rowCount} rows)\n${cols}`;
    })
    .join("\n\n");
}
