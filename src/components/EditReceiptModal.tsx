import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Plus, Save } from "lucide-react";
import type { ReceiptItemRow } from "@/hooks/useSavedReceipts";

const CATEGORIAS = ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"];

interface EditReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receiptId: string;
  storeName: string;
  dataCompra: string;
  valorTotal: number;
  items: ReceiptItemRow[];
  loading: boolean;
  onSave: (data: {
    receiptId: string;
    storeName: string;
    dataCompra: string;
    valorTotal: number;
    items: ReceiptItemRow[];
  }) => void;
  saving: boolean;
}

export default function EditReceiptModal({
  open,
  onClose,
  receiptId,
  storeName: initialStore,
  dataCompra: initialDate,
  items: initialItems,
  loading,
  onSave,
  saving,
}: EditReceiptModalProps) {
  const [store, setStore] = useState(initialStore);
  const [date, setDate] = useState(initialDate);
  const [editItems, setEditItems] = useState<ReceiptItemRow[]>([]);

  useEffect(() => {
    setStore(initialStore);
    setDate(initialDate);
    setEditItems(initialItems.map((i) => ({ ...i })));
  }, [initialStore, initialDate, initialItems]);

  const updateItem = (index: number, field: keyof ReceiptItemRow, value: any) => {
    setEditItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "quantidade" || field === "preco_unitario") {
        const qty = field === "quantidade" ? Number(value) : updated[index].quantidade;
        const unit = field === "preco_unitario" ? Number(value) : updated[index].preco_unitario;
        updated[index].preco_total = Math.round(qty * unit * 100) / 100;
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setEditItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        receipt_id: receiptId,
        nome_produto: "",
        nome_normalizado: "",
        categoria: "outros",
        quantidade: 1,
        preco_unitario: 0,
        preco_total: 0,
      },
    ]);
  };

  const total = editItems.reduce((s, i) => s + i.preco_total, 0);

  const handleSave = () => {
    onSave({
      receiptId,
      storeName: store,
      dataCompra: date,
      valorTotal: Math.round(total * 100) / 100,
      items: editItems,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Nota Fiscal</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Estabelecimento</Label>
                <Input value={store} onChange={(e) => setStore(e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data da compra</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Itens ({editItems.length})</Label>
                <Button size="sm" variant="outline" onClick={addItem} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {editItems.map((item, i) => (
                  <div key={item.id} className="rounded-lg border border-border p-3 space-y-2 bg-secondary/30">
                    <div className="flex items-start gap-2">
                      <Input
                        value={item.nome_normalizado}
                        onChange={(e) => updateItem(i, "nome_normalizado", e.target.value)}
                        placeholder="Nome do produto"
                        className="text-sm flex-1"
                      />
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0" onClick={() => removeItem(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateItem(i, "quantidade", Number(e.target.value))}
                          className="text-sm"
                          min={1}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Preço unit.</Label>
                        <Input
                          type="number"
                          value={item.preco_unitario}
                          onChange={(e) => updateItem(i, "preco_unitario", Number(e.target.value))}
                          className="text-sm"
                          min={0}
                          step={0.01}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Categoria</Label>
                        <select
                          value={item.categoria}
                          onChange={(e) => updateItem(i, "categoria", e.target.value)}
                          className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {CATEGORIAS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      Total: R$ {item.preco_total.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium">Total da nota</span>
              <span className="text-lg font-bold">R$ {total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || editItems.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
