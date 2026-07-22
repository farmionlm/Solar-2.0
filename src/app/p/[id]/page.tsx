"use client";

import React, { useState, use } from "react";
import useSWR from "swr";
import { Sun, CheckCircle2, DollarSign, Calendar, Zap, ShieldCheck, MessageSquare, Sparkles, ThumbsUp, Loader2 } from "lucide-react";
import { FinanciamentoSolarCard } from "@/components/FinanciamentoSolarCard";
import { PaybackChartCard } from "@/components/PaybackChartCard";
import { openWhatsAppChat, generateProposalWhatsAppMessage } from "@/utils/whatsappHelper";
import { calculateAdvancedFinancials } from "@/utils/solarMath";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PublicProposalClientPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const { data: project, error, isLoading, mutate } = useSWR(`/api/proposals/public/${id}`, fetcher);
  const [isApproving, setIsApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  const handleApproveProposal = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/proposals/public/${id}/approve`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Erro ao aprovar proposta");

      setApprovedSuccess(true);
      mutate();
    } catch {
      alert("Não foi possível aprovar a proposta no momento. Tente novamente ou entre em contato com o consultor.");
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Zap className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">Carregando Proposta Comercial...</p>
        </div>
      </div>
    );
  }

  if (error || !project || project.error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
            !
          </div>
          <h1 className="text-lg font-black">Proposta não encontrada</h1>
          <p className="text-xs text-muted-foreground">A proposta acessada não existe ou foi removida pelo consultor.</p>
        </div>
      </div>
    );
  }

  const totalKwp = project.totalKwp || 0;
  const estimatedCost = project.estimatedCost || (totalKwp * 3800);
  const monthlyGeneration = Math.round(totalKwp * 4.0 * 30 * 0.85);
  const monthlySavings = Math.round(monthlyGeneration * 0.95);
  const isAlreadyApproved = project.status === "CLOSED" || approvedSuccess;

  const financials = calculateAdvancedFinancials({
    totalKwp,
    initialInvestmentCost: estimatedCost,
    tariffPerKwh: 0.95
  });

  const handleWhatsApp = () => {
    const msg = generateProposalWhatsAppMessage({
      clientName: project.client?.name || "Cliente",
      totalKwp,
      monthlySavings,
      proposalUrl: typeof window !== "undefined" ? window.location.href : undefined
    });
    openWhatsAppChat({ phone: project.client?.phone, message: msg });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header Visual */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black">
              <Sun className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Proposta Fotovoltaica</span>
              <h1 className="text-xs font-bold text-foreground truncate max-w-[180px] sm:max-w-xs">{project.name || "Sistema de Energia Solar"}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Falar com</span> Consultor
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banner Hero */}
        <section className="bg-gradient-to-br from-primary/20 via-card to-card border border-primary/20 rounded-2xl p-5 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
              <Sparkles className="w-3 h-3" /> Proposta Exclusiva para Você
            </span>

            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
              Economia estimada de <span className="text-primary">{financials.total25YearSavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> em 25 anos.
            </h2>

            <p className="text-xs text-muted-foreground font-medium">
              Preparado para <strong>{project.client?.name || "Cliente"}</strong> em {new Date(project.createdAt).toLocaleDateString("pt-BR")}.
            </p>

            <div className="pt-2">
              {isAlreadyApproved ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 w-fit">
                  <CheckCircle2 className="w-4 h-4" /> Proposta Aprovada! Nosso consultor entrará em contato.
                </div>
              ) : (
                <button
                  onClick={handleApproveProposal}
                  disabled={isApproving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Processando Aprovação...
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-4 h-4" /> Aprovar Proposta Comercial
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Métricas Principais */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Potência Usina
            </span>
            <span className="text-xl font-black text-foreground block">
              {totalKwp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              {project.totalModules} Módulos Geradores
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-primary" /> Geração Mensal
            </span>
            <span className="text-xl font-black text-primary block">
              {monthlyGeneration.toLocaleString("pt-BR")} kWh
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              ~{Math.round(monthlyGeneration * 12).toLocaleString("pt-BR")} kWh/ano
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Economia Estimada
            </span>
            <span className="text-xl font-black text-emerald-500 block">
              {monthlySavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              Por mês na sua fatura
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Payback (Retorno)
            </span>
            <span className="text-xl font-black text-foreground block">
              ~{financials.paybackYear} Anos
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              Retorno total do investimento
            </span>
          </div>
        </section>

        {/* Simulador de Financiamento */}
        <section>
          <FinanciamentoSolarCard
            estimatedProjectCost={estimatedCost}
            monthlySavings={monthlySavings}
          />
        </section>

        {/* Gráfico de Payback e Fluxo de Caixa */}
        <section>
          <PaybackChartCard
            initialInvestment={estimatedCost}
            monthlySavings={monthlySavings}
          />
        </section>

        {/* Equipamentos & Garantia */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground text-sm">Equipamentos Inclusos no Projeto</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-secondary/30 border border-border rounded-xl p-3.5 space-y-1">
              <span className="text-muted-foreground font-semibold block text-[10px]">Módulos Fotovoltaicos</span>
              <span className="font-bold text-foreground text-xs block">{project.moduleManufacturer || "Painéis Alta Eficiência"} {project.modulePower}W</span>
              <span className="text-muted-foreground font-medium block">Quantidade: {project.totalModules} unidades</span>
            </div>

            <div className="bg-secondary/30 border border-border rounded-xl p-3.5 space-y-1">
              <span className="text-muted-foreground font-semibold block text-[10px]">Inversor Solar</span>
              <span className="font-bold text-foreground text-xs block">{project.inverterManufacturer || "Inversor Homologado ANEEL"}</span>
              <span className="text-muted-foreground font-medium block">Garantia do fabricante contra defeitos</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
