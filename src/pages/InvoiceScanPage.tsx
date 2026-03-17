import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Check, Loader2, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

interface ParsedItem {
  nome_produto: string;
  nome_normalizado: string;
  valor: number;
  preco_unitario: number;
  quantidade: number;
  categoria: string;
}

const CATEGORIAS = ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"];

const InvoiceScanPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [storeName, setStoreName] = useState("");
  const [dataCompra, setDataCompra] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasPartialError, setHasPartialError] = useState(false);
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const resetState = () => {
    setItems([]);
    setFile(null);
    setStoreName("");
    setDataCompra("");
    setWarnings([]);
    setHasPartialError(false);
    setReceiptSaved(false);
    setEditingIndex(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Tipo de arquivo não permitido. Envie JPG, PNG, WebP ou PDF.");
      e.target.value = "";
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. O tamanho máximo é 10MB.");
      e.target.value = "";
      return;
    }

    setFile(f);
    setProcessing(true);
    setHasPartialError(false);
    setWarnings([]);

    try {
      const base64 = await fileToBase64(f);

      const { data, error } = await supabase.functions.invoke("process-receipt", {
        body: { image_base64: base64 },
      });

      if (error) {
        // Check for specific HTTP errors
        const errorMsg = data?.error || error.message || "Erro ao processar nota fiscal.";
        if (data?.partial) {
          setHasPartialError(true);
          toast.warning("Nota parcialmente interpretada. Revise os itens antes de salvar.");
        } else {
          toast.error(errorMsg);
          resetState();
          return;
        }
      }

      if (data?.success && data.data) {
        const receipt = data.data;
        setStoreName(receipt.store?.nome || "");
        setDataCompra(receipt.data_compra || "");
        setWarnings(data.warnings || []);
        setReceiptSaved(true);

        setItems(
          receipt.items.map((item: any) => ({
            nome_produto: item.nome_produto,
            nome_normalizado: item.nome_normalizado,
            valor: item.preco_total,
            preco_unitario: item.preco_unitario,
            quantidade: item.quantidade,
            categoria: item.categoria,
          }))
        );

        if (data.warnings?.length > 0) {
          toast.warning(`Nota processada com ${data.warnings.length} ajuste(s). Revise os itens.`);
        } else {
          toast.success("Nota fiscal processada e salva com sucesso!");
        }
      }
    } catch (err) {
      console.error("OCR error:", err);
      toast.error("Erro ao processar nota fiscal. Tente novamente.");
      resetState();
    } finally {
      setProcessing(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalc total when qty or unit price changes
      if (field === "quantidade" || field === "preco_unitario") {
        const qty = field === "quantidade" ? Number(value) : updated[index].quantidade;
        const unit = field === "preco_unitario" ? Number(value) : updated[index].preco_unitario;
        updated[index].valor = Math.round(qty * unit * 100) / 100;
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (receiptSaved) {
      toast.success("Nota fiscal já foi salva!");
    } else {
      toast.success(`${items.length} itens processados!`);
    }
    resetState();
  };

  const formatCurrency = (val: number) => {
    const [intPart, decPart] = val.toFixed(2).split(".");
    return (
      <span className="currency-display">
        R$ {intPart}<span className="opacity-50">,{decPart}</span>
      </span>
    );
  };

  const total = items.reduce((s, i) => s + i.valor, 0);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escanear Nota Fiscal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envie uma foto ou arquivo da nota fiscal para leitura automática com IA.
          </p>
        </div>

        {!file && !processing && items.length === 0 && (
          <motion.label
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex flex-col items-center justify-center gap-4 p-12 cursor-pointer hover:border-primary/30 transition-colors"
          >
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Enviar nota fiscal</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP ou PDF até 10MB</p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </motion.label>
        )}

        {processing && (
          <div className="glass-card p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Processando nota fiscal com IA...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
          </div>
        )}

        {items.length > 0 && !processing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Store info */}
            {storeName && (
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">Estabelecimento</p>
                <p className="font-medium">{storeName}</p>
                {dataCompra && <p className="text-xs text-muted-foreground mt-1">Data: {dataCompra}</p>}
              </div>
            )}

            {/* Warnings */}
            {(warnings.length > 0 || hasPartialError) && (
              <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm font-medium text-yellow-600">
                    {hasPartialError ? "Nota parcialmente interpretada" : "Ajustes aplicados"}
                  </p>
                </div>
                {hasPartialError && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Não conseguimos interpretar completamente a nota. Revise os itens antes de salvar.
                  </p>
                )}
                {warnings.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Items list */}
            <div className="glass-card divide-y divide-border">
              {items.map((item, i) => (
                <div key={i} className="p-4 space-y-2">
                  {editingIndex === i ? (
                    <div className="space-y-2">
                      <Input
                        value={item.nome_normalizado}
                        onChange={(e) => updateItem(i, "nome_normalizado", e.target.value)}
                        placeholder="Nome do produto"
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateItem(i, "quantidade", Number(e.target.value))}
                          placeholder="Qtd"
                          className="text-sm w-20"
                          min={1}
                          step={1}
                        />
                        <Input
                          type="number"
                          value={item.preco_unitario}
                          onChange={(e) => updateItem(i, "preco_unitario", Number(e.target.value))}
                          placeholder="Preço unit."
                          className="text-sm flex-1"
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={item.categoria}
                          onChange={(e) => updateItem(i, "categoria", e.target.value)}
                          className="text-xs bg-secondary border-border rounded px-2 py-1 text-muted-foreground flex-1"
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <Button size="sm" variant="ghost" onClick={() => setEditingIndex(null)}>
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.nome_normalizado}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {item.categoria}
                          </span>
                          {item.quantidade > 1 && (
                            <span className="text-xs text-muted-foreground">
                              {item.quantidade}× {formatCurrency(item.preco_unitario)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{formatCurrency(item.valor)}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingIndex(i)}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="glass-card p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total ({items.length} itens)</span>
              <span className="text-lg font-bold">{formatCurrency(total)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={resetState}>
                {receiptSaved ? "Nova nota" : "Descartar"}
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                {receiptSaved ? "Concluído" : "Confirmar"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default InvoiceScanPage;
