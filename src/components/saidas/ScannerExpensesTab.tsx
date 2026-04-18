import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import InvoiceScanContent from "@/components/InvoiceScanContent";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardData } from "@/lib/invalidateFinancialData";

interface ReceiptWithStore {
  id: string;
  valor_total: number;
  data_compra: string;
  store_nome: string | null;
  item_count: number;
}

const formatCurrency = (val: number) => (
  <span className="currency-display">
    R$ {val.toFixed(2).split(".")[0]}
    <span className="opacity-50">,{val.toFixed(2).split(".")[1]}</span>
  </span>
);

const ScannerExpensesTab = () => {
  const [scanOpen, setScanOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["saidas-receipts-all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("receipts")
        .select("id, valor_total, data_compra, store_id")
        .eq("user_id", user.id)
        .order("data_compra", { ascending: false });
      if (error) throw error;

      const storeIds = [...new Set(data.map((r) => r.store_id).filter(Boolean))];
      const storeMap = new Map<string, string>();
      if (storeIds.length > 0) {
        const { data: stores } = await supabase.from("stores").select("id, nome").in("id", storeIds);
        stores?.forEach((s) => storeMap.set(s.id, s.nome));
      }

      // Count items per receipt
      const receiptIds = data.map((r) => r.id);
      let itemCounts = new Map<string, number>();
      if (receiptIds.length > 0) {
        const { data: items } = await supabase.from("receipt_items").select("receipt_id").in("receipt_id", receiptIds);
        items?.forEach((it) => itemCounts.set(it.receipt_id, (itemCounts.get(it.receipt_id) || 0) + 1));
      }

      return data.map((r) => ({
        id: r.id,
        valor_total: r.valor_total,
        data_compra: r.data_compra,
        store_nome: r.store_id ? (storeMap.get(r.store_id) ?? null) : null,
        item_count: itemCounts.get(r.id) || 0,
      })) as ReceiptWithStore[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      // Delete items first then receipt
      await supabase.from("receipt_items").delete().eq("receipt_id", receiptId);
      const { error } = await supabase.from("receipts").delete().eq("id", receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas-receipts-all"] });
      invalidateDashboardData(queryClient);
      toast.success("Nota fiscal excluída.");
    },
    onError: () => toast.error("Erro ao excluir nota fiscal."),
  });

  const total = receipts.reduce((s, r) => s + r.valor_total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notas Fiscais</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setScanOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Escanear
        </Button>
      </div>

      {total > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total escaneado</p>
          <p className="text-2xl font-bold font-mono text-foreground">
            R$ {total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{receipts.length} nota{receipts.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm glass-card">
          Nenhuma nota fiscal escaneada. Toque em "Escanear" para começar.
        </div>
      ) : (
        <div className="glass-card divide-y divide-border">
          {receipts.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center justify-between p-4 gap-4 group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-full bg-primary/10 p-1.5 shrink-0">
                  <ScanLine className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.store_nome ?? "Nota fiscal"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.data_compra + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {r.item_count > 0 && (
                      <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {r.item_count} ite{r.item_count !== 1 ? "ns" : "m"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono shrink-0">{formatCurrency(r.valor_total)}</span>
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Scan dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Escanear Nota Fiscal</DialogTitle></DialogHeader>
          <InvoiceScanContent showSavedList={false} onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["saidas-receipts-all"] });
            setScanOpen(false);
          }} />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota fiscal</AlertDialogTitle>
            <AlertDialogDescription>Essa ação removerá a nota fiscal e todos os seus itens. Deseja continuar?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ScannerExpensesTab;
