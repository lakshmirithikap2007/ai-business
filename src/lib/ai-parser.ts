import type { ChartConfig } from "./types";

/**
 * Parses AI response text to extract chart configurations.
 * The AI is instructed to return JSON blocks wrapped in ```json ... ```
 */
export function parseAIResponse(text: string): {
  explanation: string;
  charts: ChartConfig[];
} {
  const charts: ChartConfig[] = [];
  let explanation = text;

  // Extract JSON blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());

      if (Array.isArray(parsed)) {
        parsed.forEach((chart: Partial<ChartConfig>) => {
          if (chart.type && chart.data) {
            charts.push({
              id: crypto.randomUUID(),
              type: chart.type as ChartConfig["type"],
              title: chart.title || "Chart",
              description: chart.description,
              data: chart.data,
              xKey: chart.xKey,
              yKeys: chart.yKeys,
              nameKey: chart.nameKey,
              valueKey: chart.valueKey,
              colors: chart.colors,
              sql: chart.sql,
              pinned: false,
            });
          }
        });
      } else if (parsed.type && parsed.data) {
        charts.push({
          id: crypto.randomUUID(),
          type: parsed.type,
          title: parsed.title || "Chart",
          description: parsed.description,
          data: parsed.data,
          xKey: parsed.xKey,
          yKeys: parsed.yKeys,
          nameKey: parsed.nameKey,
          valueKey: parsed.valueKey,
          colors: parsed.colors,
          sql: parsed.sql,
          pinned: false,
        });
      }
    } catch {
      // not valid JSON, skip
    }
  }

  // Remove JSON blocks from explanation
  explanation = explanation.replace(/```json[\s\S]*?```/g, "").trim();

  return { explanation, charts };
}

export function getSystemPrompt(schema: string): string {
  return `You are an expert data analyst and BI dashboard assistant. You help non-technical users understand their data through SQL queries and visualizations.

## Available Database Schema
${schema}

## Your Task
When the user asks a question about their data:
1. Write the appropriate SQL query for SQLite
2. Execute it mentally based on the schema
3. Return the results as chart configurations

## Response Format
Always provide:
1. A brief, clear explanation of what the data shows (2-3 sentences max)
2. One or more chart configurations as JSON blocks

Each chart JSON block must follow this exact format inside \`\`\`json ... \`\`\` fences:

{
  "type": "bar" | "line" | "pie" | "area" | "scatter" | "table" | "radar" | "composed",
  "title": "Chart Title",
  "description": "What this chart shows",
  "sql": "SELECT ... FROM ...",
  "data": [{"label": "A", "value": 100}, ...],
  "xKey": "label",
  "yKeys": ["value"],
  "nameKey": "label",
  "valueKey": "value"
}

## Chart Type Selection Rules
- Time-series data → "line" or "area"
- Comparisons across categories → "bar"
- Parts of a whole / proportions → "pie"
- Correlations between two numeric variables → "scatter"
- Multi-dimensional comparisons → "radar"
- Mixed data types (e.g., bar and line together) → "composed"
- Detailed row-level data → "table"
- Trends with volume → "area"

## Forecasting
If the user asks to "predict", "forecast", or "look at the future":
1. Add a property "isForecast": true to the chart configuration
2. In the "data" array, include both historical and predicted points. 
3. For predicted points, you can append " (Forecast)" to the label or xKey value.

## Important Rules
- ALWAYS include the actual data in the "data" array — never leave it empty
- Use the actual column names from the schema
- If you cannot answer the query with the available data, say so clearly
- Never fabricate or hallucinate data
- For the "sql" field, include the actual SQL you would run
- Keep explanations concise and business-friendly
- If the user's request is ambiguous, ask for clarification`;
}
