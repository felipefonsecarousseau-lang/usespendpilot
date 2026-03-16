import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

interface ParsedItem {
  descricao: string;
  valor: number;
  categoria: string;
}

const InvoiceScanPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [items, setItems] = useState<ParsedItem[]>([]);

  const categorias = ["Supermercado", "Restaurante", "Farmácia", "Vestuário", "Eletrônicos", "Outros"];

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    simulateOCR();
  };

  const simulateOCR = () => {
    setProcessing(true);
    setTimeout(() => {
      setItems([
        { descricao: "Arroz Integral 5kg", valor: 28.90, categoria: "Supermercado" },
        { descricao: "Azeite Extra Virgem", valor: 42.50, categoria: "Supermercado" },
        { descricao: "Detergente Limpol", valor: 3.49, categoria: "Supermercado" },
        { descricao: "Café Pilão 500g", valor: 18.90, categoria: "Supermercado" },
        { descricao: "Leite Integral 1L", valor: 6.99, categoria: "Supermercado" },
      ]);
      setProcessing(false);
      toast.success("Nota fiscal processada!");
    }, 2000);
  };

  const handleConfirm = () => {
    toast.success(`${items.length} itens adicionados aos gastos!`);
    setItems([]);
    setFile(null);
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
            Envie uma foto ou arquivo da nota fiscal para leitura automática.
          </p>
        </div>

        {!file && (
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
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou PDF até 10MB</p>
            </div>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </motion.label>
        )}

        {processing && (
          <div className="glass-card p-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Processando nota fiscal...</p>
          </div>
        )}

        {items.length > 0 && !processing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="glass-card divide-y divide-border">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.descricao}</p>
                    <select
                      value={item.categoria}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[i].categoria = e.target.value;
                        setItems(newItems);
                      }}
                      className="mt-1 text-xs bg-secondary border-border rounded px-2 py-1 text-muted-foreground"
                    >
                      {categorias.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm font-mono">{formatCurrency(item.valor)}</div>
                </div>
              ))}
            </div>

            <div className="glass-card p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-lg font-bold">{formatCurrency(total)}</span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setItems([]); setFile(null); }}>
                Descartar
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default InvoiceScanPage;
