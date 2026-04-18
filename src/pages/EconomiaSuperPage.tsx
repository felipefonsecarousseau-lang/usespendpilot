import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Wallet, SlidersHorizontal, ReceiptText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SupermarketView from "@/components/economia/SupermarketView";
import OutrosGastosView from "@/components/economia/OutrosGastosView";

type Period = "30" | "90" | "180";
type ViewMode = "supermercado" | "outros";

const EconomiaSuperPage = () => {
  const [period, setPeriod] = useState<Period>("90");
  const [viewMode, setViewMode] = useState<ViewMode>("supermercado");

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString().split("T")[0];
  }, [period]);

  // Fetch supermarket data (only when in supermercado mode)
  const { data, isLoading } = useQuery({
    queryKey: ["economia-super", period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: receipts, error: rErr } = await supabase
        .from("receipts")
        .select("id, store_id, data_compra, valor_total")
        .eq("user_id", user.id)
        .gte("data_compra", cutoffDate);
      if (rErr) throw rErr;
      if (!receipts?.length) return { receipts: [], items: [], stores: [] };

      const receiptIds = receipts.map((r) => r.id);
      const storeIds = [...new Set(receipts.map((r) => r.store_id))];

      const [itemsRes, storesRes] = await Promise.all([
        supabase
          .from("receipt_items")
          .select("receipt_id, nome_produto, nome_normalizado, categoria, quantidade, preco_unitario, preco_total")
          .in("receipt_id", receiptIds),
        supabase
          .from("stores")
          .select("id, nome, cnpj")
          .in("id", storeIds),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (storesRes.error) throw storesRes.error;

      return {
        receipts: receipts || [],
        items: itemsRes.data || [],
        stores: storesRes.data || [],
      };
    },
    enabled: viewMode === "supermercado",
  });

  // CNPJ-based canonical key: collapses multiple store_ids do mesmo CNPJ em uma única entrada
  const storeToCanonical = useMemo(() => {
    const map = new Map<string, string>();
    data?.stores?.forEach((s) => map.set(s.id, s.cnpj || s.id));
    return map;
  }, [data?.stores]);

  const storesMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.stores?.forEach((s) => {
      const key = s.cnpj || s.id;
      if (!map.has(key)) map.set(key, s.nome);
    });
    return map;
  }, [data?.stores]);

  const receiptDateMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.receipts?.forEach((r) => map.set(r.id, r.data_compra));
    return map;
  }, [data?.receipts]);

  const receiptStoreMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.receipts?.forEach((r) => map.set(r.id, r.store_id));
    return map;
  }, [data?.receipts]);

  const enrichedItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((item) => {
      const rawStoreId = receiptStoreMap.get(item.receipt_id) || "";
      const canonicalId = storeToCanonical.get(rawStoreId) || rawStoreId;
      return {
        ...item,
        store_id: canonicalId,
        store_nome: storesMap.get(canonicalId) || "Desconhecido",
        data_compra: receiptDateMap.get(item.receipt_id) || "",
      };
    });
  }, [data?.items, receiptStoreMap, storesMap, receiptDateMap, storeToCanonical]);

  const supermarketEmpty = viewMode === "supermercado" && !isLoading && (!data?.items?.length);

  return (
    <AppLayout>
      <PremiumGate>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Economia Inteligente</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Descubra onde e como economizar com base no seu histórico.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[140px] bg-card border-border">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">3 meses</SelectItem>
                  <SelectItem value="180">6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("supermercado")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                viewMode === "supermercado"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card border border-border"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Supermercado
            </button>
            <button
              onClick={() => setViewMode("outros")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                viewMode === "outros"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card/50 text-muted-foreground hover:text-foreground hover:bg-card border border-border"
              }`}
            >
              <Wallet className="h-4 w-4" />
              Outros gastos
            </button>
          </div>

          {/* Supermercado view */}
          {viewMode === "supermercado" && (
            <>
              {isLoading && (
                <div className="glass-card p-12 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Carregando análises...</p>
                </div>
              )}

              {supermarketEmpty && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-12 flex flex-col items-center gap-4 text-center"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <ReceiptText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Sem dados suficientes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Envie algumas notas fiscais para comparar preços entre supermercados.
                    </p>
                  </div>
                </motion.div>
              )}

              {!isLoading && !supermarketEmpty && (
                <SupermarketView enrichedItems={enrichedItems} period={period} />
              )}
            </>
          )}

          {/* Outros gastos view */}
          {viewMode === "outros" && <OutrosGastosView period={period} />}
        </div>
      </PremiumGate>
    </AppLayout>
  );
};

export default EconomiaSuperPage;
