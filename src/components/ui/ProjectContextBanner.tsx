"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Zap, CheckCircle2 } from "lucide-react";

interface ProjectContextBannerProps {
  projectName?: string;
  clientName?: string;
  kwpTotal?: number;
  statusText?: string;
  projectId?: string;
  clientId?: string;
  onChangeProject?: () => void;
}

export function ProjectContextBanner({
  projectName,
  clientName,
  kwpTotal,
  statusText = "Em Análise de Viabilidade",
  projectId,
  clientId,
  onChangeProject,
}: ProjectContextBannerProps) {
  if (!projectName && !clientName) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-lg mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-card via-card to-primary/5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> {statusText}
          </span>
          {kwpTotal && (
            <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-black px-2.5 py-0.5 rounded-full border border-primary/20">
              <Zap className="w-3 h-3" /> {kwpTotal.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp
            </span>
          )}
        </div>
        <h3 className="text-xl font-black text-foreground">
          {projectName || clientName || "Projeto Ativo"}
        </h3>
        {clientName && projectName && (
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Cliente: {clientName}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
        {projectId && (
          <Link
            href={`/proposta?projectId=${projectId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir proposta PDF
          </Link>
        )}

        {clientId && (
          <Link
            href={`/clientes/${clientId}`}
            className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            Ver Ficha do Cliente
          </Link>
        )}

        {onChangeProject && (
          <button
            onClick={onChangeProject}
            className="inline-flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-border px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trocar projeto
          </button>
        )}
      </div>
    </div>
  );
}
