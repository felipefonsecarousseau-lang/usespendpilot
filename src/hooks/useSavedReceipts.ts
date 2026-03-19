import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SavedReceipt {
  id: string;
  data_compra: string;
  valor_total: number;
  created_at: string;
  store: { id: string; nome: string; cnpj: string | null } | null;
  item_count: number;
}

export interface ReceiptItemRow {
  id: string;
  receipt_id: string;
  nome_produto: string;
  nome_normalizado: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
}

export function useSavedReceipts() {
  const queryClient = useQueryClient();

  const receiptsQuery = useQuery({
    queryKey: ["saved-receipts"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      const { data: receipts, error } = await supabase
        .from("receipts")
        .select("id, data_compra, valor_total, created_at, store_id")
        .order("data_compra", { ascending: false });

      if (error) throw error;

      // Fetch stores and item counts
      const storeIds = [...new Set(receipts.map((r) => r.store_id))];
      const { data: stores } = await supabase
        .from("stores")
        .select("id, nome, cnpj")
        .in("id", storeIds);

      const storeMap = new Map(stores?.map((s) => [s.id, s]) || []);

      // Get item counts per receipt
      const receiptIds = receipts.map((r) => r.id);
      const { data: items } = await supabase
        .from("receipt_items")
        .select("receipt_id")
        .in("receipt_id", receiptIds);

      const countMap = new Map<string, number>();
      items?.forEach((item) => {
        countMap.set(item.receipt_id, (countMap.get(item.receipt_id) || 0) + 1);
      });

      return receipts.map((r) => ({
        id: r.id,
        data_compra: r.data_compra,
        valor_total: r.valor_total,
        created_at: r.created_at,
        store: storeMap.get(r.store_id) || null,
        item_count: countMap.get(r.id) || 0,
      })) as SavedReceipt[];
    },
  });

  const fetchReceiptItems = async (receiptId: string): Promise<ReceiptItemRow[]> => {
    const { data, error } = await supabase
      .from("receipt_items")
      .select("*")
      .eq("receipt_id", receiptId);
    if (error) throw error;
    return data as ReceiptItemRow[];
  };

  const deleteReceipt = useMutation({
    mutationFn: async (receiptId: string) => {
      // Items are cascade-deleted via FK, but let's delete explicitly for safety
      const { error: itemsError } = await supabase
        .from("receipt_items")
        .delete()
        .eq("receipt_id", receiptId);
      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receiptId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota excluída com sucesso!");
      invalidateAll();
    },
    onError: () => {
      toast.error("Erro ao excluir nota fiscal.");
    },
  });

  const updateReceipt = useMutation({
    mutationFn: async ({
      receiptId,
      storeName,
      dataCompra,
      valorTotal,
      items,
    }: {
      receiptId: string;
      storeName: string;
      dataCompra: string;
      valorTotal: number;
      items: ReceiptItemRow[];
    }) => {
      // Update store name
      const { data: receipt } = await supabase
        .from("receipts")
        .select("store_id")
        .eq("id", receiptId)
        .single();

      if (receipt?.store_id) {
        await supabase
          .from("stores")
          .update({ nome: storeName })
          .eq("id", receipt.store_id);
      }

      // Update receipt
      const { error: receiptError } = await supabase
        .from("receipts")
        .update({ data_compra: dataCompra, valor_total: valorTotal })
        .eq("id", receiptId);
      if (receiptError) throw receiptError;

      // Delete removed items and upsert existing/new
      const existingIds = items.filter((i) => !i.id.startsWith("new-")).map((i) => i.id);
      
      // Delete items not in the list
      const { data: currentItems } = await supabase
        .from("receipt_items")
        .select("id")
        .eq("receipt_id", receiptId);
      
      const toDelete = currentItems?.filter((ci) => !existingIds.includes(ci.id)).map((ci) => ci.id) || [];
      if (toDelete.length > 0) {
        const { error: delError } = await supabase
          .from("receipt_items")
          .delete()
          .in("id", toDelete);
        if (delError) throw delError;
      }

      // Update existing items
      for (const item of items.filter((i) => !i.id.startsWith("new-"))) {
        const { error } = await supabase
          .from("receipt_items")
          .update({
            nome_produto: item.nome_produto,
            nome_normalizado: item.nome_normalizado,
            categoria: item.categoria as "mercado" | "higiene" | "limpeza" | "bebidas" | "padaria" | "hortifruti" | "outros",
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            preco_total: item.preco_total,
          })
          .eq("id", item.id);
        if (error) throw error;
      }

      // Insert new items
      const newItems = items.filter((i) => i.id.startsWith("new-"));
      if (newItems.length > 0) {
        const { error } = await supabase.from("receipt_items").insert(
          newItems.map((i) => ({
            receipt_id: receiptId,
            nome_produto: i.nome_produto,
            nome_normalizado: i.nome_normalizado,
            categoria: i.categoria as "mercado" | "higiene" | "limpeza" | "bebidas" | "padaria" | "hortifruti" | "outros",
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            preco_total: i.preco_total,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Nota atualizada com sucesso!");
      invalidateAll();
    },
    onError: () => {
      toast.error("Erro ao atualizar nota fiscal.");
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["saved-receipts"] });
    queryClient.invalidateQueries({ queryKey: ["gastos-receipt-items"] });
    queryClient.invalidateQueries({ queryKey: ["gastos-receipt-items-prev"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-receipts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-all-receipts"] });
  };

  return { receiptsQuery, fetchReceiptItems, deleteReceipt, updateReceipt };
}
