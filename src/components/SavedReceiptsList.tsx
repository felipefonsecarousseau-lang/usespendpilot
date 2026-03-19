import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Loader2, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditReceiptModal from "@/components/EditReceiptModal";
import { useSavedReceipts, type SavedReceipt, type ReceiptItemRow } from "@/hooks/useSavedReceipts";

export default function SavedReceiptsList() {
  const { receiptsQuery, fetchReceiptItems, deleteReceipt, updateReceipt } = useSavedReceipts();
  const [expanded, setExpanded] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editReceipt, setEditReceipt] = useState<SavedReceipt | null>(null);
  const [editItems, setEditItems] = useState<ReceiptItemRow[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const receipts = receiptsQuery.data || [];

  const handleEdit = async (receipt: SavedReceipt) => {
    setEditReceipt(receipt);
    setEditOpen(true);
    setLoadingItems(true);
    try {
      const items = await fetchReceiptItems(receipt.id);
      setEditItems(items);
    } catch {
      setEditItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSave = (data: Parameters<typeof updateReceipt.mutate>[0]) => {
    updateReceipt.mutate(data, {
      onSuccess: () => {
        setEditOpen(false);
        setEditReceipt(null);
      },
    });
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteReceipt.mutate(deleteTarget, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  if (receiptsQuery.isLoading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando notas...</span>
      </div>
    );
  }

  if (receipts.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Notas já enviadas</h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {receipts.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="glass-card divide-y divide-border">
          {receipts.map((receipt) => (
            <div key={receipt.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {receipt.store?.nome || "Estabelecimento desconhecido"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">{receipt.data_compra}</span>
                  <span className="text-xs text-muted-foreground">{receipt.item_count} itens</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono whitespace-nowrap">
                  R$ {receipt.valor_total.toFixed(2)}
                </span>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(receipt)}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setDeleteTarget(receipt.id)}
                  disabled={deleteReceipt.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Todos os itens desta nota serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteReceipt.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit modal */}
      {editReceipt && (
        <EditReceiptModal
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditReceipt(null); }}
          receiptId={editReceipt.id}
          storeName={editReceipt.store?.nome || ""}
          dataCompra={editReceipt.data_compra}
          valorTotal={editReceipt.valor_total}
          items={editItems}
          loading={loadingItems}
          onSave={handleSave}
          saving={updateReceipt.isPending}
        />
      )}
    </motion.div>
  );
}
