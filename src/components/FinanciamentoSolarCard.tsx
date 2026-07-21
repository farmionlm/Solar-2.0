"use client";

import React, { useState } from "react";
import { Landmark, TrendingUp, CheckCircle2, DollarSign, Calculator } from "lucide-react";

interface FinanciamentoSolarCardProps {
  estimatedProjectCost: number;
  monthlySavings: number;
}

export const FinanciamentoSolarCard: React.FC<FinanciamentoSolarCardProps> = ({
  estimatedProjectCost,
  monthlySavings
}) => {
  const [months, setMonths] = useState<number>(60);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(1.39); // 1.39% a.m.

  // Cálculo da parcela no sistema Price: PMT = PV * [i * (1 + i)^n] / [(1 + i)^n - 1]
  const i = monthlyInterestRate / 100;
  const n = months;
  let pmt = 0;
  if (i > 0 && n > 0 && estimatedProjectCost > 0) {
    pmt = estimatedProjectCost * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  }

  const pmtFormatted = pmt.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const savingsFormatted = monthlySavings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const difference = monthlySavings - pmt;
  const isPositiveBalance = difference >= 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-emerald-500" />
          <h3 className="font-extrabold text-foreground text-sm">
            Simulador de Financiamento Solar
          </h3>
        </div>
        <span className="text-xs font-bold text-muted-foreground bg-secondary/50 px-2.5 py-0.5 rounded-full">
          Tabela Price
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-muted-foreground font-semibold block mb-1">
            Prazo (Nº de Parcelas)
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={24}>24x (2 Anos)</option>
            <option value={36}>36x (3 Anos)</option>
            <option value={48}>48x (4 Anos)</option>
            <option value={60}>60x (5 Anos)</option>
            <option value={72}>72x (6 Anos)</option>
            <option value={84}>84x (7 Anos)</option>
          </select>
        </div>

        <div>
          <label className="text-muted-foreground font-semibold block mb-1">
            Taxa de Juros (% ao mês)
          </label>
          <input
            type="number"
            step="0.05"
            value={monthlyInterestRate}
            onChange={(e) => setMonthlyInterestRate(Number(e.target.value))}
            className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Resultado Comparativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="bg-secondary/40 border border-border rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Economia Mensal Estimada
          </span>
          <span className="text-lg font-black text-emerald-400 block mt-0.5">
            {savingsFormatted}
          </span>
        </div>

        <div className="bg-secondary/40 border border-border rounded-xl p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground block">
            Parcela do Financiamento ({months}x)
          </span>
          <span className="text-lg font-black text-foreground block mt-0.5">
            {pmtFormatted}
          </span>
        </div>
      </div>

      {/* Argumento de Vendas */}
      <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
        isPositiveBalance 
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
      }`}>
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <div className="text-xs">
          {isPositiveBalance ? (
            <span>
              <strong>Projeto Autopagável!</strong> A economia de <strong>{savingsFormatted}/mês</strong> cobre a parcela de <strong>{pmtFormatted}</strong> e ainda gera um troco positivo de <strong>{difference.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</strong> desde o 1º mês!
            </span>
          ) : (
            <span>
              A parcela fica em <strong>{pmtFormatted}</strong> para uma economia mensal de <strong>{savingsFormatted}</strong> na conta de luz.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
