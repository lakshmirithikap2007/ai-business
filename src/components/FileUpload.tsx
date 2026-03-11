import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";

export function FileUpload() {
  const { uploadFiles, tables } = useData();
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith(".csv")
      );
      if (files.length > 0) {
        setPendingFiles((prev) => [...prev, ...files]);
      }
    },
    []
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).filter((f) =>
        f.name.endsWith(".csv")
      );
      if (files.length > 0) {
        setPendingFiles((prev) => [...prev, ...files]);
      }
    },
    []
  );

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    try {
      await uploadFiles(pendingFiles);
      setPendingFiles([]);
      toast.success(`${pendingFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${(error as Error).message}`);
    }
  };

  const hasData = tables.length > 0;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5 glow-border"
            : "border-border hover:border-muted-foreground/40"
        }`}
      >
        <input
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {hasData ? "Upload more CSV files" : "Drop CSV files here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Multiple files supported — each becomes a queryable table
        </p>
      </div>

      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {pendingFiles.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-md bg-secondary px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={handleUpload}
              className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Upload {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
