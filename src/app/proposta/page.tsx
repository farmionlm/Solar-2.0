"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Sun, Zap, TrendingUp, Clock, Leaf, PrinterIcon, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ── Constants ────────────────────────────────────────────────────────────────
const TARIFF_KWH = 0.85;          // Avg Brazilian tariff R$/kWh
const ANNUAL_TARIFF_INCREASE = 0.05; // 5% yearly increase
const SYSTEM_LIFETIME_YEARS = 5;
const AVG_COST_PER_KWP = 4800;    // R$ per kWp (avg Brazilian market)
const CO2_KG_PER_KWH = 0.1;       // CO2 offset per kWh (Brazilian grid avg)

function generateSavingsData(monthlyGenKwh: number, systemCost: number) {
  let tariff = TARIFF_KWH;
  let cumulativeSavings = -systemCost;
  let paybackYear: number | null = null;

  return Array.from({ length: SYSTEM_LIFETIME_YEARS }, (_, i) => {
    const year = i + 1;
    const annualSavings = monthlyGenKwh * 12 * tariff;
    cumulativeSavings += annualSavings;

    if (paybackYear === null && cumulativeSavings >= 0) {
      paybackYear = year;
    }

    tariff *= (1 + ANNUAL_TARIFF_INCREASE);

    return {
      year: `${year}°`,
      "Economia Acumulada": Math.round(cumulativeSavings),
      paybackYear
    };
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/80 border border-blue-100 rounded-2xl p-5 flex flex-col items-center text-center shadow-md">
      <div className="mb-2">{icon}</div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
function PropostaContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const clientName = searchParams.get("clientName");

  // Grab the project from the full list since we don't have a single-item API
  const { data: allProjects, isLoading } = useSWR<Project[]>("/api/calculations", fetcher);
  const { data: companySettings } = useSWR("/api/settings", fetcher);
  const p = allProjects?.find((x) => x.id === projectId);

  // Sanitiza o nome do cliente vindo da URL (evita XSS passivo em conteúdo renderizado)
  const safeClientName = clientName ? clientName.trim().slice(0, 200) : null;

  if (isLoading || !allProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <p className="text-slate-500 font-bold text-xl">Projeto não encontrado.</p>
        <Link href="/funil" className="text-blue-600 hover:underline font-bold">← Voltar ao Funil</Link>
      </div>
    );
  }

  const brandColor = companySettings?.brandColor || "#1d4ed8";
  const logoUrl = companySettings?.logoUrl || null;
  const companyName = companySettings?.name || "SolarCalc Pro";
  const companyPhone = companySettings?.companyPhone || null;
  const companyWebsite = companySettings?.companyWebsite || null;

  // ── Calculations ──────────────────────────────────────────────────────────
  const monthlyGenKwh = p.totalKwp * 120; // Simple approximation: 120kWh/kWp/month
  const annualGenKwh = monthlyGenKwh * 12;
  const systemCost = p.estimatedCost ? Number(p.estimatedCost) : Math.round(p.totalKwp * AVG_COST_PER_KWP);
  const monthlySavings = monthlyGenKwh * TARIFF_KWH;
  const savingsData = generateSavingsData(monthlyGenKwh, systemCost);
  const paybackYear = savingsData.find(d => d["Economia Acumulada"] >= 0)?.year ?? "N/A";
  const totalSavingsPeriod = savingsData[SYSTEM_LIFETIME_YEARS - 1]["Economia Acumulada"];
  const co2Saved = Math.round((annualGenKwh * CO2_KG_PER_KWH * SYSTEM_LIFETIME_YEARS) / 1000); // tonnes in period

  const displayClient = safeClientName || p.client?.name || "Prezado Cliente";
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 font-sans print:bg-white">
      {/* Print toolbar (hidden in print) */}
      <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/funil" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Funil
          </Link>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md active:scale-95 transition-all text-sm"
        >
          <PrinterIcon className="w-4 h-4" /> Salvar / Imprimir PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 print:px-8 print:py-6">
        {/* ── HEADER / CAPA ────────────────────────────────────────────────── */}
        <div
          className="text-white rounded-3xl p-10 mb-8 flex flex-col md:flex-row justify-between items-start gap-6 shadow-2xl print:rounded-xl print:shadow-none"
          style={{ background: `linear-gradient(135deg, ${brandColor}ee, ${brandColor}99)` }}
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain bg-white/20 rounded-xl p-1" />
              ) : (
                <div className="bg-white/20 p-2 rounded-xl">
                  <Sun className="w-8 h-8 text-yellow-300" />
                </div>
              )}
              <div>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Proposta Comercial</p>
                <h1 className="text-2xl font-black">{companyName}</h1>
              </div>
            </div>
            <h2 className="text-3xl font-black text-white leading-tight mb-2">
              {displayClient}
            </h2>
            <p className="text-white/80 text-sm font-medium">
              {p.name ? `Projeto: ${p.name}` : "Dimensionamento Personalizado"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Data da Proposta</p>
            <p className="text-white font-bold text-sm">{today}</p>
            <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 text-center">
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest">Sistema</p>
              <p className="text-4xl font-black text-yellow-300">{p.totalKwp.toFixed(2)}</p>
              <p className="text-white/70 text-sm font-bold">kWp</p>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Zap className="w-8 h-8 text-blue-500" />}
            label="Geração Estimada"
            value={`${monthlyGenKwh.toLocaleString("pt-BR")} kWh`}
            sub="por mês"
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8 text-emerald-500" />}
            label="Economia Mensal"
            value={`R$ ${monthlySavings.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="na conta de luz"
          />
          <StatCard
            icon={<Clock className="w-8 h-8 text-amber-500" />}
            label="Payback Estimado"
            value={paybackYear}
            sub="tempo de retorno"
          />
          <StatCard
            icon={<Leaf className="w-8 h-8 text-green-500" />}
            label="CO₂ Evitado"
            value={`${co2Saved} ton`}
            sub={`em ${SYSTEM_LIFETIME_YEARS} anos`}
          />
        </div>

        {/* ── ROI CHART ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 mb-8 print:shadow-none print:border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-1">Retorno do Investimento (ROI) em {SYSTEM_LIFETIME_YEARS} Anos</h3>
          <p className="text-slate-400 text-sm font-medium mb-6">
            Com tarifa atual de R$ {TARIFF_KWH}/kWh e reajuste anual de {(ANNUAL_TARIFF_INCREASE * 100).toFixed(0)}%.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(v: any) => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Acumulado"]}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                {/* Zero line reference */}
                <Area
                  type="monotone"
                  dataKey="Economia Acumulada"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fill="url(#savingsGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
            <p className="text-emerald-800 font-bold text-sm">
              Economia Total Estimada em {SYSTEM_LIFETIME_YEARS} anos:{" "}
              <span className="text-emerald-600 text-lg">
                R$ {totalSavingsPeriod.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>

        {/* ── SYSTEM SUMMARY ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 mb-8 print:shadow-none print:border-slate-200">
          <h3 className="text-xl font-black text-slate-800 mb-4">Detalhes Técnicos do Sistema</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Potência Total", value: `${p.totalKwp.toFixed(2)} kWp` },
              { label: "Total de Módulos", value: `${p.totalModules} unidades` },
              { label: "Módulo Fotovoltaico", value: p.moduleModel || "Conforme especificação" },
              { label: "Inversor", value: p.inverterModel || "Conforme especificação" },
              { label: "Geração Anual Est.", value: `${annualGenKwh.toLocaleString("pt-BR")} kWh` },
              { label: "Investimento Estimado*", value: `R$ ${systemCost.toLocaleString("pt-BR")}` },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
                <p className="font-black text-slate-800 text-sm">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs mt-4 font-medium">
            * Estimativa de mercado. O valor final será definido após visita técnica e detalhamento do projeto.
          </p>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="text-center text-slate-400 text-xs font-medium pt-4 border-t border-slate-200">
          <p>{companyName}{companyPhone ? ` • Tel: ${companyPhone}` : ''}{companyWebsite ? ` • ${companyWebsite}` : ''}</p>
          <p className="mt-1">Proposta gerada em {today} • Valores sujeitos a alteração após visita técnica.</p>
        </div>
      </div>
    </div>
  );
}

export default function PropostaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PropostaContent />
    </Suspense>
  );
}
