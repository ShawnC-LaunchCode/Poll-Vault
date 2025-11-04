import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ line: number; message: string }>;
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importCsv: (csvText: string) => Promise<ImportResult>;
  downloadTemplate: () => void;
}

export function ImportModal({ open, onOpenChange, importCsv, downloadTemplate }: ImportModalProps) {
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    if (!csvText.trim()) {
      return;
    }

    setIsImporting(true);
    try {
      const importResult = await importCsv(csvText);
      setResult(importResult);
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setCsvText("");
    setResult(null);
    onOpenChange(false);
  };

  const totalProcessed = result ? result.imported + result.updated + result.skipped : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="import-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Recipients from CSV
          </DialogTitle>
          <DialogDescription id="import-description">
            Upload recipients in bulk by pasting CSV data. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">Need the CSV format?</span>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Download Template
              </Button>
            </AlertDescription>
          </Alert>

          {/* CSV Input */}
          <div className="space-y-2">
            <label htmlFor="csv-input" className="text-sm font-medium">
              Paste CSV Data
            </label>
            <Textarea
              id="csv-input"
              rows={12}
              placeholder="name,email,tags&#10;John Doe,john@example.com,customer&#10;Jane Smith,jane@example.com,beta,vip"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="font-mono text-sm"
              disabled={isImporting}
              aria-label="CSV data input"
            />
            <p className="text-xs text-muted-foreground">
              Format: name,email,tags (tags are comma-separated)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvText.trim() || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Upload className="w-4 h-4" />
                  </motion.div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-3 p-4 bg-muted/30 rounded-lg border"
                role="status"
                aria-live="polite"
                aria-label="Import results"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 10,
                      delay: 0.2
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </motion.div>
                  <h3 className="font-semibold">Import Complete</h3>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">New</p>
                    <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Updated</p>
                    <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Skipped</p>
                    <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    {result.imported + result.updated > 0 ? (
                      <span className="text-green-700">
                        🎉 {result.imported + result.updated} recipient{result.imported + result.updated !== 1 ? 's' : ''} processed successfully
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        No changes made
                      </span>
                    )}
                  </p>
                </div>

                {/* Errors */}
                {result.errors && result.errors.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-red-600 flex items-center gap-2 hover:text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      {result.errors.length} Error{result.errors.length !== 1 ? 's' : ''} Found
                    </summary>
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3 }}
                      className="mt-2 space-y-1 text-sm"
                    >
                      {result.errors.map((error, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="pl-6 text-red-600"
                        >
                          Line {error.line}: {error.message}
                        </motion.li>
                      ))}
                    </motion.ul>
                  </details>
                )}

                <Button
                  onClick={handleClose}
                  className="w-full mt-2"
                  variant="outline"
                >
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
