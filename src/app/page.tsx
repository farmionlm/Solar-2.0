"use client";

import React, { Suspense } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Sun, Users, Activity, BarChart3, PlusCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const COLORS = ['#38bdf8', '#d97706', '#059669', '#6366f1', '#64748b', '#dc2626'];

function DashboardContent() {
  const { data: metrics, error, isLoading } = useSWR('/api/analytics', fetcher);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Activity className="w-4 h-4" /> Visão Geral de Vendas & Engenharia
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Painel de Controle
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Acompanhe o desempenho de simulações, potência orçada e distribuição do funil CRM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Link href="/simulador">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 active:scale-95 h-11 px-5 font-bold text-xs">
              <PlusCircle className="w-4 h-4 mr-2" /> Nova Simulação
            </Button>
          </Link>
          <Link href="/clientes">
            <Button variant="outline" className="border-border bg-card hover:bg-secondary rounded-xl h-11 px-5 font-bold text-xs">
              <Users className="w-4 h-4 mr-2" /> Meus Clientes
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 text-red-400 p-8 rounded-2xl text-center font-medium border border-red-900/50">
          Ocorreu um erro ao carregar os dados do painel de controle.
        </div>
      ) : !metrics ? null : (
        <>
          {/* Cards de KPIs Principais de Vendas & Engenharia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Faturamento Orçado</h3>
              <div className="text-2xl md:text-3xl font-black text-emerald-500/90 mb-1">
                {(metrics.openEstimatedRevenue || metrics.totalEstimatedRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium truncate" title="Projetos ativos em Simulação e Negociação">
                Em projetos abertos (Simulação / Negociação)
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Potência Total Orçada</h3>
              <div className="text-2xl md:text-3xl font-black text-foreground mb-1 flex items-baseline gap-1">
                {metrics.totalKwp} <span className="text-sm text-muted-foreground font-bold">kWp</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                Acumulado de {metrics.totalProjects || 0} proposta(s)
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Taxa de Conversão</h3>
              <div className="text-2xl md:text-3xl font-black text-primary mb-1">
                {metrics.conversionRatePercent || 0}%
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold truncate">
                {metrics.closedProjects || 0} de {metrics.totalProjects || 0} projetos fechados
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Ticket Médio</h3>
              <div className="text-2xl md:text-3xl font-black text-foreground mb-1">
                {(metrics.averageTicket || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium truncate" title="Média geral por projeto orçado">
                Média geral por projeto
              </p>
            </div>
          </div>

          {/* Gráficos do Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolução Mensal */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black mb-1 text-foreground">Evolução de Projetos</h3>
                <p className="text-xs text-muted-foreground mb-6">Quantidade de novos orçamentos nos últimos 6 meses</p>
              </div>
              <div className="h-[240px] w-full">
                {metrics.monthlyData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                        contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px'}}
                      />
                      <Bar dataKey="projetos" name="Qtd. Projetos" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm font-medium">Sem dados suficientes.</div>
                )}
              </div>
            </div>

            {/* Distribuição de Status com Legenda Detalhada */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black mb-1 text-foreground">Distribuição de Projetos por Status</h3>
                <p className="text-xs text-muted-foreground mb-4">Proporção de simulações e vendas no funil CRM</p>
              </div>

              {metrics.statusData?.some((d: any) => d.value > 0) ? (
                <div className="space-y-4">
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.statusData.filter((d: any) => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {metrics.statusData.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legenda Customizada Explicativa e Colorida */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50">
                    {metrics.statusData.filter((d: any) => d.value > 0).map((item: any, idx: number) => {
                      const total = metrics.statusData.reduce((a: number, b: any) => a + b.value, 0);
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-foreground truncate">{item.name}:</span>
                          <span className="text-primary font-bold ml-auto">{item.value} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm font-medium">Nenhum projeto registrado.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground font-medium">Carregando painel de controle...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
