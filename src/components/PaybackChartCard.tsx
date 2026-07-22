"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { TrendingUp, DollarSign, Award } from "lucide-react";

interface PaybackChartCardProps {
  initialInvestment: number; // Ex: 25000
  monthlySavings: number;    // Ex: 650
  energyInflationRate?: number; // Ex: 0.06 (6% a.a.)
}

export function PaybackChartCard({
  initialInvestment,
  monthlySavings,
  energyInflationRate = 0.06,
}: PaybackChartCardProps) {
  const chartData = useMemo(() => {
    const data = [];
    let cumulative = -initialInvestment;
    let currentAnnualSavings = monthlySavings * 12;

    // Ano 0 (Investimento inicial)
    data.push({
      yearLabel: "Ano 0",
      year: 0,
      fluxoAcumulado: Math.round(cumulative),
      economiaAno: 0,
    });

    let breakEvenYear = 25;

    for (let year = 1; year <= 25; year++) {
      cumulative += currentAnnualSavings;
      data.push({
        yearLabel: `Ano ${year}`,
        year,
        fluxoAcumulado: Math.round(cumulative),
        economiaAno: Math.round(currentAnnualSavings),
      });

      if (cumulative >= 0 && breakEvenYear === 25) {
        breakEvenYear = year;
      }

      // Reajuste anual da energia
      currentAnnualSavings *= (1 + energyInflationRate);
    }

    return { data, breakEvenYear, finalBalance: Math.round(cumulative) };
  }, [initialInvestment, monthlySavings, energyInflationRate]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground text-sm sm:text-base">
              Retorno do Investimento & Fluxo de Caixa (25 Anos)
            </h3>
            <p className="text-xs text-muted-foreground">
              Projeção de retorno com inflação energética estimada em {(energyInflationRate * 100).toFixed(0)}% a.a.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Break-Even: ~Ano {chartData.breakEvenYear}
          </span>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData.data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="yearLabel"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs space-y-1">
                      <p className="font-bold text-foreground border-b border-border/50 pb-1">{item.yearLabel}</p>
                      <p className="text-muted-foreground">
                        Economia no ano: <span className="font-bold text-foreground">{formatCurrency(item.economiaAno)}</span>
                      </p>
                      <p className={item.fluxoAcumulado >= 0 ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                        Saldo Acumulado: {formatCurrency(item.fluxoAcumulado)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="fluxoAcumulado"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorAcumulado)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rodapé explicativo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
          <span className="text-muted-foreground block text-[11px]">Investimento Inicial</span>
          <span className="font-bold text-foreground">{formatCurrency(initialInvestment)}</span>
        </div>
        <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
          <span className="text-muted-foreground block text-[11px]">Ponto de Equilíbrio</span>
          <span className="font-bold text-emerald-500">Ano {chartData.breakEvenYear} (Payback)</span>
        </div>
        <div className="bg-secondary/40 p-3 rounded-xl border border-border/50">
          <span className="text-muted-foreground block text-[11px]">Economia Acumulada (25 Anos)</span>
          <span className="font-bold text-emerald-500">{formatCurrency(chartData.finalBalance)}</span>
        </div>
      </div>
    </div>
  );
}
