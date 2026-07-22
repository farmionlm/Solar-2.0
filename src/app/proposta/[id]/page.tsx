"use client";

import React, { useState, use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Sun, CheckCircle2, DollarSign, Calendar, Zap, ShieldCheck, Download, MessageSquare, ArrowLeft, Award, Sparkles } from "lucide-react";
import { FinanciamentoSolarCard } from "@/components/FinanciamentoSolarCard";
import { PaybackChartCard } from "@/components/PaybackChartCard";
import { openWhatsAppChat, generateProposalWhatsAppMessage } from "@/utils/whatsappHelper";
import { calculateAdvancedFinancials } from "@/utils/solarMath";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PublicProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const { data: project, error, isLoading } = useSWR(`/api/projects/${id}`, fetcher);
  const [accepted, setAccepted] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Zap className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-bold text-muted-foreground">Carregando Proposta Comercial...</p>
        </div>
      </div>
    );
  }

  if (error || !project || project.error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            !
          </div>
          <h1 className="text-xl font-black">Proposta não encontrada</h1>
          <p className="text-sm text-muted-foreground">A proposta que você está tentando acessar não existe ou expirou.</p>
        </div>
      </div>
    );
  }

  const totalKwp = project.totalKwp || 0;
  const estimatedCost = project.estimatedCost || (totalKwp * 3800); // R$ 3.800/kWp estimado
  const monthlyGeneration = Math.round(totalKwp * 4.0 * 30 * 0.85); // 85% eficiência
  const monthlySavings = Math.round(monthlyGeneration * 0.95); // R$ 0.95/kWh

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
      proposalUrl: typeof window !== "undefined" ? `${window.location.origin}/p/${id}` : undefined
    });
    openWhatsAppChat({ phone: project.client?.phone, message: msg });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header Visual */}
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black">
              <Sun className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="text-xs font-black text-primary uppercase tracking-widest block">Proposta Comercial</span>
              <h1 className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">{project.name || "Energia Solar Fotovoltaica"}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Compartilhar no</span> WhatsApp
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Banner Hero */}
        <section className="bg-gradient-to-br from-primary/20 via-card to-card border border-primary/20 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" /> Estudo de Viabilidade Fotovoltaica
            </span>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Economize até <span className="text-primary">{financials.total25YearSavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> nos próximos 25 anos.
            </h2>

            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Preparado para <strong>{project.client?.name || "Cliente"}</strong> em {new Date(project.createdAt).toLocaleDateString("pt-BR")}.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              {accepted ? (
                <div className="bg-emerald-500 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Proposta Aceita pelo Cliente!
                </div>
              ) : (
                <button
                  onClick={() => setAccepted(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-xl transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Aceitar Proposta Online
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Métricas Principais */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-500" /> Potência do Sistema
            </span>
            <span className="text-2xl font-black text-foreground block">
              {totalKwp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              {project.totalModules} Módulos Fotovoltaicos
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sun className="w-4 h-4 text-primary" /> Geração Mensal Estimada
            </span>
            <span className="text-2xl font-black text-primary block">
              {monthlyGeneration.toLocaleString("pt-BR")} kWh
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              ~{Math.round(monthlyGeneration * 12).toLocaleString("pt-BR")} kWh/ano
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-500" /> Economia Mensal
            </span>
            <span className="text-2xl font-black text-emerald-400 block">
              {monthlySavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              Redução imediata na conta
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4 text-blue-500" /> Retorno do Investimento
            </span>
            <span className="text-2xl font-black text-foreground block">
              ~{financials.paybackYear} Anos
            </span>
            <span className="text-[11px] text-muted-foreground font-medium block">
              Payback estimado (25 anos úteis)
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

        {/* Gráfico de Payback e Fluxo de Caixa 25 Anos */}
        <section>
          <PaybackChartCard
            initialInvestment={estimatedCost}
            monthlySavings={monthlySavings}
          />
        </section>

        {/* Equipamentos & Especificações Técnicas */}
        <section className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-foreground text-base">Equipamentos Inclusos na Proposta</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-1">
              <span className="text-muted-foreground font-semibold block text-[11px]">Módulos Fotovoltaicos</span>
              <span className="font-bold text-foreground text-sm block">{project.moduleManufacturer || "Painéis Alta Eficiência"} {project.modulePower}W</span>
              <span className="text-muted-foreground font-medium block">Quantidade: {project.totalModules} unidades</span>
            </div>

            <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-1">
              <span className="text-muted-foreground font-semibold block text-[11px]">Inversor Solar</span>
              <span className="font-bold text-foreground text-sm block">{project.inverterManufacturer || "Inversor String/Microinversor"}</span>
              <span className="text-muted-foreground font-medium block">Certificação Inmetro / ANEEL 140/2022</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
