import AppLayout from "@/components/AppLayout";
import InvoiceScanContent from "@/components/InvoiceScanContent";

const InvoiceScanPage = () => (
  <AppLayout>
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Escanear Nota Fiscal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie uma foto ou arquivo da nota fiscal para leitura automática com IA.
        </p>
      </div>
      <InvoiceScanContent />
    </div>
  </AppLayout>
);

export default InvoiceScanPage;
