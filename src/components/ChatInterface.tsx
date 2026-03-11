import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useData } from "@/contexts/DataContext";
import { ChartRenderer } from "./ChartRenderer";
import { parseAIResponse, getSystemPrompt } from "@/lib/ai-parser";
import { executeQuery, getSchemaDescription } from "@/lib/database";
import type { ChatMessage, ChartConfig } from "@/lib/types";
import { toast } from "sonner";


export function ChatInterface() {
  const { tables, messages, addMessage, updateLastMessage, getSchema } = useData();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const schema = getSchema();
      if (!schema || schema === "No tables loaded.") return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      addMessage(userMsg);
      setInput("");

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };
      addMessage(assistantMsg);
      setIsStreaming(true);

      try {
        const systemPrompt = getSystemPrompt(schema);
        const conversationHistory = messages
          .filter((m) => !m.isLoading)
          .slice(-10)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        // Use a simple fetch to a mock AI endpoint — in production, use Lovable AI edge function
        const fullContent = await callAI(systemPrompt, [
          ...conversationHistory,
          { role: "user", content: text },
        ]);

        // Parse charts from response
        const { explanation, charts } = parseAIResponse(fullContent);

        // Try to execute SQL and get real data
        const resolvedCharts: ChartConfig[] = [];
        for (const chart of charts) {
          if (chart.sql) {
            try {
              const data = executeQuery(chart.sql);
              if (data.length > 0) {
                resolvedCharts.push({ ...chart, data });
              } else {
                resolvedCharts.push(chart);
              }
            } catch {
              resolvedCharts.push(chart);
            }
          } else {
            resolvedCharts.push(chart);
          }
        }

        updateLastMessage({
          content: explanation,
          charts: resolvedCharts,
          isLoading: false,
        });
      } catch (e) {
        updateLastMessage({
          content: `Sorry, something went wrong: ${(e as Error).message}`,
          isLoading: false,
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, addMessage, updateLastMessage, getSchema]
  );

  const toggleVoice = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening...", { id: "voice-status" });
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
          toast.success("Voice captured!", { id: "voice-status" });
        } else if (interimTranscript) {
          // Provide some visual feedback that we're hearing them
          toast.info(`Hearing: ${interimTranscript.slice(0, 30)}...`, { id: "voice-status", duration: 1000 });
        }
      };


      recognition.onerror = (event: any) => {
        setIsListening(false);
        toast.dismiss("voice-status");
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please check your browser permissions.");
        } else if (event.error === 'no-speech') {
          toast.error("No speech detected. Please try again.");
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        toast.dismiss("voice-status");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      toast.error("Could not start speech recognition.");
      setIsListening(false);
    }
  }, [isListening]);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasData = tables.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <Sparkles className="h-10 w-10 text-primary mb-4 animate-pulse-glow" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {hasData ? "Ask anything about your data" : "Upload data to get started"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {hasData
                ? 'Try: "Show me the top 10 items by revenue" or "What is the distribution of categories?"'
                : "Drop a CSV file in the sidebar to begin exploring your data with AI."}
            </p>
            {hasData && (
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "Give me an overview of this dataset",
                  "What are the key trends?",
                  "Show distribution of values",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing your data...</span>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {msg.charts && msg.charts.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {msg.charts.map((chart) => (
                          <ChartRenderer key={chart.id} chart={chart} compact />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2 rounded-lg bg-secondary border border-border px-3 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasData
                ? "Ask about your data..."
                : "Upload a CSV first..."
            }
            disabled={!hasData || isStreaming}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={toggleVoice}
            disabled={!hasData}
            className={`rounded-md p-2 transition-colors ${
              isListening
                ? "bg-destructive text-destructive-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || !hasData || isStreaming}
            className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple AI caller — replace with Lovable AI edge function in production
async function callAI(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  // For the prototype, we'll use a built-in analysis approach
  // This generates meaningful responses based on the actual data
  const lastUserMsg = messages[messages.length - 1]?.content || "";
  
  // Try to generate charts from actual SQL queries
  const schema = getSchemaDescription();
  
  // Simple keyword-based query generation for offline mode
  return generateLocalResponse(lastUserMsg, schema);
}

function generateLocalResponse(query: string, schema: string): string {
  const lowerQuery = query.toLowerCase();
  
  // Parse table names from schema
  const tableMatches = schema.match(/Table: "(\w+)"/g);
  const tableNames = tableMatches ? tableMatches.map(m => m.match(/"(\w+)"/)?.[1] || "") : [];
  
  if (tableNames.length === 0) {
    return "No data tables found. Please upload a CSV file first.";
  }

  const tableName = tableNames[0];
  
  // Get columns from schema for this table
  const tableSection = schema.split(`Table: "${tableName}"`)[1]?.split("Table:")[0] || "";
  const colMatches = tableSection.match(/- (\w+) \((\w+)\)/g);
  const columns = colMatches ? colMatches.map(m => {
    const match = m.match(/- (\w+) \((\w+)\)/);
    return { name: match?.[1] || "", type: match?.[2] || "TEXT" };
  }) : [];

  const numericCols = columns.filter(c => c.type === "INTEGER" || c.type === "REAL");
  const textCols = columns.filter(c => c.type === "TEXT");

  const charts: any[] = [];

  if (lowerQuery.includes("overview") || lowerQuery.includes("insight") || lowerQuery.includes("summary")) {
    // Generate overview charts
    if (numericCols.length > 0 && textCols.length > 0) {
      try {
        const sql1 = `SELECT "${textCols[0].name}", SUM("${numericCols[0].name}") as total FROM "${tableName}" GROUP BY "${textCols[0].name}" ORDER BY total DESC LIMIT 10`;
        const data1 = executeQuery(sql1);
        if (data1.length > 0) {
          charts.push({
            type: "bar",
            title: `Top ${textCols[0].name} by ${numericCols[0].name}`,
            description: `Breakdown of ${numericCols[0].name} across ${textCols[0].name}`,
            sql: sql1,
            data: data1,
            xKey: textCols[0].name,
            yKeys: ["total"],
          });
        }
      } catch {}

      if (textCols.length > 0) {
        try {
          const sql2 = `SELECT "${textCols[0].name}", COUNT(*) as count FROM "${tableName}" GROUP BY "${textCols[0].name}" ORDER BY count DESC LIMIT 8`;
          const data2 = executeQuery(sql2);
          if (data2.length > 0) {
            charts.push({
              type: "pie",
              title: `Distribution of ${textCols[0].name}`,
              description: `How records are distributed across ${textCols[0].name}`,
              sql: sql2,
              data: data2,
              nameKey: textCols[0].name,
              valueKey: "count",
            });
          }
        } catch {}
      }
    }

    // Summary stats
    if (numericCols.length > 0) {
      try {
        const aggCols = numericCols.slice(0, 3).map(c => 
          `ROUND(AVG("${c.name}"), 2) as "avg_${c.name}", ROUND(SUM("${c.name}"), 2) as "sum_${c.name}"`
        ).join(", ");
        const sql3 = `SELECT COUNT(*) as total_records, ${aggCols} FROM "${tableName}"`;
        const data3 = executeQuery(sql3);
        if (data3.length > 0) {
          charts.push({
            type: "table",
            title: "Summary Statistics",
            description: "Key aggregated metrics",
            sql: sql3,
            data: data3,
          });
        }
      } catch {}
    }
  } else if (lowerQuery.includes("distribution") || lowerQuery.includes("breakdown")) {
    const targetCol = textCols[0] || columns[0];
    if (targetCol) {
      try {
        const sql = `SELECT "${targetCol.name}", COUNT(*) as count FROM "${tableName}" GROUP BY "${targetCol.name}" ORDER BY count DESC LIMIT 12`;
        const data = executeQuery(sql);
        if (data.length > 0) {
          charts.push({
            type: data.length <= 6 ? "pie" : "bar",
            title: `Distribution of ${targetCol.name}`,
            sql,
            data,
            xKey: targetCol.name,
            yKeys: ["count"],
            nameKey: targetCol.name,
            valueKey: "count",
          });
        }
      } catch {}
    }
  } else if (lowerQuery.includes("trend") || lowerQuery.includes("over time") || lowerQuery.includes("time series")) {
    // Look for date-like columns
    const dateCols = columns.filter(c => 
      c.name.toLowerCase().includes("date") || 
      c.name.toLowerCase().includes("time") || 
      c.name.toLowerCase().includes("year") || 
      c.name.toLowerCase().includes("month")
    );
    if (dateCols.length > 0 && numericCols.length > 0) {
      try {
        const sql = `SELECT "${dateCols[0].name}", SUM("${numericCols[0].name}") as total FROM "${tableName}" GROUP BY "${dateCols[0].name}" ORDER BY "${dateCols[0].name}"`;
        const data = executeQuery(sql);
        if (data.length > 0) {
          charts.push({
            type: "line",
            title: `${numericCols[0].name} over ${dateCols[0].name}`,
            sql,
            data,
            xKey: dateCols[0].name,
            yKeys: ["total"],
          });
        }
      } catch {}
    }
  } else {
    // Generic: try to find relevant columns based on keywords
    const relevantCol = columns.find(c => lowerQuery.includes(c.name.toLowerCase()));
    if (relevantCol && numericCols.length > 0) {
      try {
        const valueCol = relevantCol.type === "TEXT" ? numericCols[0] : relevantCol;
        const groupCol = relevantCol.type === "TEXT" ? relevantCol : textCols[0];
        if (groupCol) {
          const sql = `SELECT "${groupCol.name}", SUM("${valueCol.name}") as total FROM "${tableName}" GROUP BY "${groupCol.name}" ORDER BY total DESC LIMIT 10`;
          const data = executeQuery(sql);
          if (data.length > 0) {
            charts.push({
              type: "bar",
              title: `${valueCol.name} by ${groupCol.name}`,
              sql,
              data,
              xKey: groupCol.name,
              yKeys: ["total"],
            });
          }
        }
      } catch {}
    }
    
    // Fallback: show top records
    if (charts.length === 0) {
      try {
        const sql = `SELECT * FROM "${tableName}" LIMIT 20`;
        const data = executeQuery(sql);
        if (data.length > 0) {
          charts.push({
            type: "table",
            title: `Sample data from ${tableName}`,
            description: "Showing first 20 records",
            sql,
            data,
          });
        }
      } catch {}
    }
  }

  // Build response
  const chartsJson = charts.map(c => ({
    ...c,
    id: crypto.randomUUID(),
    pinned: false,
  }));

  let response = `Here's what I found in your **${tableName}** data:\n\n`;
  
  if (chartsJson.length === 0) {
    response += "I couldn't generate a specific visualization for that query. Try asking about distributions, trends, or an overview of your data.";
  }

  for (const chart of chartsJson) {
    response += `\n\`\`\`json\n${JSON.stringify(chart, null, 2)}\n\`\`\`\n`;
  }

  return response;
}
