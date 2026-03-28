import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Check, Loader2, AlertTriangle, Trash2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SavedReceiptsList from "@/components/SavedReceiptsList";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

import { normalizeProduct } from "@/lib/product-normalizer";

const UNIDADES = ["un", "kg", "g", "L", "mL", "pct", "cx", "dz"];

interface ParsedItem {
  nome_produto: string;
  nome_normalizado: string;
  valor: number;
  preco_unitario: number;
  quantidade: number;
  categoria: string;
  peso_quantidade: number | null;
  unidade: string | null;
  venda_por_peso: boolean;
  preco_por_kg: number | null;
}

interface ReceiptStoreData {
  nome: string;
  cnpj: string | null;
}

const CATEGORIAS = ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"];

const InvoiceScanPage = () => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeData, setStoreData] = useState<ReceiptStoreData | null>(null);
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
    setStoreData(null);
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
        body: { mode: "parse", image_base64: base64, mime_type: f.type },
      });

      if (error) {
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
        setStoreData(receipt.store || null);
        setDataCompra(receipt.data_compra || "");
        setWarnings(data.warnings || []);

        setItems(
          receipt.items.map((item: any) => {
            const vendaPorPeso = item.venda_por_peso === true;
            const norm = normalizeProduct(
              item.nome_normalizado || item.nome_produto,
              item.quantidade || 1,
              item.preco_total || 0
            );
            return {
              nome_produto: item.nome_produto,
              nome_normalizado: item.nome_normalizado,
              valor: item.preco_total,
              preco_unitario: item.preco_unitario,
              quantidade: item.quantidade,
              categoria: item.categoria,
              // Para produtos por peso: quantidade já é o peso em kg
              peso_quantidade: vendaPorPeso ? item.quantidade : norm.quantity,
              unidade: vendaPorPeso ? "kg" : norm.unit,
              venda_por_peso: vendaPorPeso,
              preco_por_kg: vendaPorPeso ? item.preco_unitario : (item.preco_por_kg ?? null),
            };
          })
        );

        if (data.warnings?.length > 0) {
          toast.warning(`Nota processada com ${data.warnings.length} ajuste(s). Revise os itens antes de salvar.`);
        } else {
          toast.success("Nota lida com sucesso! Revise os itens e salve quando estiver pronto.");
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

  const handleSave = async () => {
    if (items.length === 0) return;

    setSaving(true);
    try {
      const receiptData = {
        store: storeData || { nome: storeName, cnpj: null },
        data_compra: dataCompra || new Date().toISOString().split("T")[0],
        valor_total: items.reduce((s, i) => s + i.valor, 0),
        items: items.map((item) => ({
          nome_produto: item.nome_produto,
          nome_normalizado: item.nome_normalizado,
          categoria: item.categoria,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          preco_total: item.valor,
          venda_por_peso: item.venda_por_peso,
          preco_por_kg: item.preco_por_kg,
        })),
      };

      const { data, error } = await supabase.functions.invoke("process-receipt", {
        body: { mode: "save", receipt_data: receiptData },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao salvar nota fiscal.");
        return;
      }

      setReceiptSaved(true);
      toast.success("Nota fiscal salva com sucesso!");

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["gastos-receipt-items"] });
      queryClient.invalidateQueries({ queryKey: ["gastos-receipt-items-prev"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-all-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["saved-receipts"] });
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Erro ao salvar nota fiscal. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantidade" || field === "preco_unitario") {
        const qty = field === "quantidade" ? Number(value) : updated[index].quantidade;
        const unitPrice = field === "preco_unitario" ? Number(value) : updated[index].preco_unitario;
        updated[index].valor = Math.round(qty * unitPrice * 100) / 100;
        // Para produtos por peso: preco_unitario é o preço/kg
        if (updated[index].venda_por_peso) {
          updated[index].preco_por_kg = field === "preco_unitario" ? Number(value) : unitPrice;
        }
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
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
            {/* Status badge */}
            {!receiptSaved && (
              <div className="glass-card p-3 border-primary/20 bg-primary/5 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs text-muted-foreground">
                  Nota <span className="font-medium text-foreground">não salva</span> — revise os itens e clique em salvar quando estiver pronto.
                </p>
              </div>
            )}

            {receiptSaved && (
              <div className="glass-card p-3 border-green-500/20 bg-green-500/5 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">
                  Nota <span className="font-medium text-green-600">salva com sucesso</span>.
                </p>
              </div>
            )}

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
              <div className="glass-card p-4 border-accent/30 bg-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-accent-foreground">
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
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground">
                            {item.venda_por_peso ? "Peso (kg)" : "Quantidade"}
                          </label>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => updateItem(i, "quantidade", Number(e.target.value))}
                            placeholder={item.venda_por_peso ? "Ex: 0.570" : "Qtd"}
                            className="text-sm"
                            min={item.venda_por_peso ? 0.001 : 1}
                            step={item.venda_por_peso ? 0.001 : 1}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground">
                            {item.venda_por_peso ? "Preço/kg (R$)" : "Preço unit. (R$)"}
                          </label>
                          <Input
                            type="number"
                            value={item.preco_unitario}
                            onChange={(e) => updateItem(i, "preco_unitario", Number(e.target.value))}
                            placeholder={item.venda_por_peso ? "Ex: 4.99" : "Preço unit."}
                            className="text-sm"
                            min={0}
                            step={0.01}
                          />
                        </div>
                      </div>
                      {item.venda_por_peso && (
                        <div className="text-xs text-muted-foreground bg-primary/5 rounded px-2 py-1">
                          Total calculado: {item.quantidade.toFixed(3)} kg × R$ {item.preco_unitario.toFixed(2).replace(".", ",")} = R$ {item.valor.toFixed(2).replace(".", ",")}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-muted-foreground">Peso/Volume</label>
                          <Input
                            type="number"
                            value={item.peso_quantidade ?? ""}
                            onChange={(e) => updateItem(i, "peso_quantidade", e.target.value ? Number(e.target.value) : null)}
                            placeholder="Ex: 5"
                            className="text-sm"
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] text-muted-foreground">Unidade</label>
                          <select
                            value={item.unidade || ""}
                            onChange={(e) => updateItem(i, "unidade", e.target.value || null)}
                            className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                          >
                            <option value="">—</option>
                            {UNIDADES.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
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
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {item.categoria}
                          </span>
                          {item.venda_por_peso ? (
                            <>
                              <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-0.5 rounded">
                                por kg
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.quantidade.toFixed(3).replace(".", ",")} kg × {formatCurrency(item.preco_unitario)}/kg
                              </span>
                            </>
                          ) : (
                            <>
                              {item.quantidade > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  {item.quantidade}× {formatCurrency(item.preco_unitario)}
                                </span>
                              )}
                              {item.peso_quantidade && item.unidade && (
                                <span className="text-xs text-muted-foreground">
                                  {item.peso_quantidade}{item.unidade}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-sm font-mono">{formatCurrency(item.valor)}</span>
                          {item.venda_por_peso && item.preco_por_kg && (
                            <p className="text-[10px] text-muted-foreground">{formatCurrency(item.preco_por_kg)}/kg</p>
                          )}
                        </div>
                        {!receiptSaved && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingIndex(i)}>
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </>
                        )}
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
              {!receiptSaved ? (
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? "Salvando..." : "Salvar nota"}
                </Button>
              ) : (
                <Button className="flex-1" onClick={resetState}>
                  <Check className="h-4 w-4 mr-2" />
                  Concluído
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Saved receipts section */}
        <SavedReceiptsList />
      </div>
    </AppLayout>
  );
};

export default InvoiceScanPage;
