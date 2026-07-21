"use client";

import React, { useState } from "react";
import { CheckSquare, Square, ShieldCheck, AlertCircle, FileText, CheckCircle2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  note?: string;
}

const CHECKLISTS_BY_DISTRIBUTOR: Record<string, ChecklistItem[]> = {
  "EDP": [
    { id: "procuracao", label: "Procuração com Firma Reconhecida ou Assinatura Digital", required: true },
    { id: "rg_cpf", label: "Documento de Identidade do Titular (RG/CPF ou CNH)", required: true },
    { id: "fatura", label: "Última Fatura de Energia Atualizada", required: true },
    { id: "formulario", label: "Formulário de Solicitação de Acesso EDP preenchido e assinado", required: true },
    { id: "memorial", label: "Memorial Descritivo Técnico assinado pelo responsável técnico", required: true },
    { id: "unifilar", label: "Diagrama Unifilar e Multifilar em escala", required: true },
    { id: "art", label: "ART / TRT Paga com comprovante de quitação", required: true },
    { id: "inversor_cert", label: "Certificado do Inversor (Inmetro / ANEEL 140/2022)", required: true }
  ],
  "Light": [
    { id: "procuracao", label: "Procuração Simples com Cópia do RG", required: true },
    { id: "rg_cpf", label: "Identificação Oficial com Foto", required: true },
    { id: "fatura", label: "Conta de Energia da Unidade Consumidora", required: true },
    { id: "formulario", label: "Formulário de Acesso GD Light assinado", required: true },
    { id: "memorial", label: "Memorial Descritivo de Microgeração", required: true },
    { id: "art", label: "ART de Projeto e Execução", required: true },
    { id: "certificados", label: "Datasheet e Certificados do Inversor", required: true }
  ],
  "Enel": [
    { id: "procuracao", label: "Procuração Específica Enel", required: true },
    { id: "rg_cpf", label: "Documentação do Titular", required: true },
    { id: "fatura", label: "Fatura de Energia Recente", required: true },
    { id: "formulario", label: "Anexo 1 - Formulário de Solicitação de Acesso Enel", required: true },
    { id: "memorial", label: "Memorial Técnico de Conexão", required: true },
    { id: "diagrama", label: "Diagrama Unifilar com ART de Projeto", required: true }
  ],
  "DEFAULT": [
    { id: "procuracao", label: "Procuração do Cliente Titular", required: true },
    { id: "rg_cpf", label: "Documento de Identificação (RG/CPF)", required: true },
    { id: "fatura", label: "Fatura de Energia Recente", required: true },
    { id: "formulario", label: "Formulário de Acesso da Distribuidora", required: true },
    { id: "memorial", label: "Memorial Descritivo de Engenharia", required: true },
    { id: "art", label: "ART / TRT de Projeto e Execução", required: true }
  ]
};

interface ConcessionariaChecklistProps {
  concessionaria?: string;
  onStatusChange?: (completedCount: number, totalCount: number) => void;
}

export const ConcessionariaChecklist: React.FC<ConcessionariaChecklistProps> = ({
  concessionaria = "EDP",
  onStatusChange
}) => {
  const normKey = Object.keys(CHECKLISTS_BY_DISTRIBUTOR).find(k => concessionaria.toUpperCase().includes(k)) || "DEFAULT";
  const items = CHECKLISTS_BY_DISTRIBUTOR[normKey];

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    const updated = { ...checked, [id]: !checked[id] };
    setChecked(updated);
    const completed = Object.values(updated).filter(Boolean).length;
    if (onStatusChange) {
      onStatusChange(completed, items.length);
    }
  };

  const completedCount = Object.values(checked).filter(Boolean).length;
  const isAllDone = completedCount === items.length;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-extrabold text-foreground text-sm">
            Checklist de Documentos — {concessionaria}
          </h3>
        </div>
        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
          isAllDone 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
        }`}>
          {completedCount} de {items.length} concluídos
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = !!checked[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isChecked
                  ? "bg-emerald-500/5 border-emerald-500/30 text-foreground"
                  : "bg-secondary/20 border-border hover:border-primary/40 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-xs font-semibold ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {item.label}
                </span>
              </div>
              {item.required && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                  Obrigatório
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isAllDone && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Toda a documentação exigida pela {concessionaria} está completa para protocolo!</span>
        </div>
      )}
    </div>
  );
};
