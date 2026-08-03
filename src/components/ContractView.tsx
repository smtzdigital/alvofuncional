import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import {
  fillContract,
  toContractHtml,
  CONTRACT_EDITOR_CSS,
  type ContractStudent,
  type ContractPlan,
  type ContractDates,
} from "@/lib/contract";

interface Props {
  template: string;
  aluno: ContractStudent;
  plano: ContractPlan;
  datas?: ContractDates;
  title?: string;
}

export function ContractView({ template, aluno, plano, datas, title }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const filled = fillContract(toContractHtml(template), { aluno, plano, datas });

  const printIt = () => {
    if (!ref.current) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Contrato</title>
      <style>${CONTRACT_EDITOR_CSS} body{padding:24px}</style>
      </head><body><div class="contract-doc">${ref.current.innerHTML}</div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const downloadPdf = async () => {
    if (!ref.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    const filename = `contrato-${(aluno.full_name ?? "aluno").replace(/\s+/g, "-").toLowerCase()}.pdf`;
    html2pdf().set({
      margin: [15, 15, 15, 15],
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], before: ".page-break" },
    } as never).from(ref.current).save();

  };

  return (
    <div className="space-y-3">
      <style>{CONTRACT_EDITOR_CSS}</style>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={printIt}><Printer size={14} className="mr-1" /> Imprimir</Button>
        <Button size="sm" onClick={downloadPdf} className="bg-gradient-primary text-primary-foreground"><Download size={14} className="mr-1" /> Baixar PDF</Button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-white p-6">
        <div ref={ref} className="contract-doc">
          {title && <h1>{title}</h1>}
          <div dangerouslySetInnerHTML={{ __html: filled }} />
        </div>
      </div>
    </div>
  );
}

