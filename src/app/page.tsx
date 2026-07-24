"use client";

import React, { Suspense, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Sun, Users, Activity, BarChart3, PlusCircle, ArrowRight, Building2, UserCheck, XCircle, Award, Zap, Search, X, ExternalLink, AlertTriangle } from 'lucide-react';
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
const LOSS_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#64748b'];

function DashboardContent() {
  const { data: metrics, error, isLoading, mutate } = useSWR('/api/analytics', fetcher);
  const [showCanceledModal, setShowCanceledModal] = useState(false);
  const [canceledFilter, setCanceledFilter] = useState("");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Ações Rápidas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Sun className="w-8 h-8 text-primary animate-pulse" />
            Visão Geral do Negócio
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe a performance de vendas, projetos em andamento e homologações.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/simulador">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Novo Orçamento / Simulador
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-foreground font-medium flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          Carregando métricas em tempo real...
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-center text-sm font-semibold">
          Falha ao carregar dados do dashboard. Verifique sua conexão.
        </div>
      ) : (
        <>
          {/* Cards de Métricas Principais (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Total em Aberto</h3>
              <div className="text-2xl md:text-3xl font-black text-foreground mb-1">
                {(metrics.openEstimatedRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-muted-foreground font-medium truncate" title="Projetos em Simulação e Negociação">
                Simulação + Negociação
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Potência Orçada</h3>
              <div className="text-2xl md:text-3xl font-black text-primary mb-1">
                {metrics.totalKwp || 0} <span className="text-base font-bold">kWp</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium truncate" title="Soma de todos os projetos">
                {metrics.totalProjects || 0} projetos no sistema
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
              <h3 className="text-muted-foreground font-bold text-xs uppercase tracking-wider mb-1">Taxa de Conversão</h3>
              <div className="text-2xl md:text-3xl font-black text-emerald-500 mb-1">
                {metrics.conversionRatePercent || 0}%
              </div>
              <p className="text-[11px] text-muted-foreground font-medium truncate" title="Projetos fechados vs total">
                {metrics.closedProjects || 0} projetos fechados
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

            {/* CARD CLICÁVEL: PROJETOS CANCELADOS */}
            <button
              onClick={() => setShowCanceledModal(true)}
              className="bg-card border border-red-500/30 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-red-500/60 hover:bg-red-500/5 transition-all text-left cursor-pointer"
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-red-400 font-bold text-xs uppercase tracking-wider">Cancelados / Perdidos</h3>
                <ArrowRight className="w-4 h-4 text-red-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-red-500 mb-1">
                {metrics.canceledProjectsCount || 0} <span className="text-xs font-bold text-muted-foreground">projetos</span>
              </div>
              <p className="text-[11px] text-red-400/90 font-bold truncate flex items-center gap-1">
                <span>Clique para ver a lista e motivos</span>
              </p>
            </button>
          </div>

          {/* Gráficos do Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

            {/* Distribuição de Status */}
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
                        <Pie data={metrics.statusData.filter((d: any) => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                          {metrics.statusData.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm font-medium">Nenhum projeto registrado.</div>
              )}
            </div>
          </div>

          {/* NOVAS SEÇÕES: C2 (Motivos de Perda) + H1 (Concessionárias) + D2 (Desempenho da Equipe) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* C2 — Motivos de Perda */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Motivos de Perda</h3>
                    <p className="text-[11px] text-muted-foreground">Projetos cancelados/perdidos</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowCanceledModal(true)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors border border-red-500/20 flex items-center gap-1 shrink-0"
                  title="Ver lista completa de projetos cancelados"
                >
                  <span>Ver Lista ({metrics.canceledProjectsCount || 0})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {metrics.lossReasonData?.length > 0 ? (
                <div className="space-y-3">
                  {metrics.lossReasonData.map((item: any, idx: number) => {
                    const totalLoss = metrics.lossReasonData.reduce((a: number, b: any) => a + b.value, 0);
                    const pct = totalLoss > 0 ? Math.round((item.value / totalLoss) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-foreground flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LOSS_COLORS[idx % LOSS_COLORS.length] }} />
                            {item.name}
                          </span>
                          <span className="text-muted-foreground font-bold">{item.value} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: LOSS_COLORS[idx % LOSS_COLORS.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                  Nenhum projeto registrado como perdido até o momento. 🎉
                </div>
              )}
            </div>

            {/* H1 — Status por Concessionária */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Painel por Concessionária</h3>
                    <p className="text-[11px] text-muted-foreground">Distribuição de processos por distribuidora de energia</p>
                  </div>
                </div>
              </div>

              {metrics.concessionariaData?.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-bold">
                        <th className="py-2 px-2">Concessionária</th>
                        <th className="py-2 px-2 text-center">Total</th>
                        <th className="py-2 px-2 text-center">Simulação</th>
                        <th className="py-2 px-2 text-center">Negociação</th>
                        <th className="py-2 px-2 text-center">Homologação</th>
                        <th className="py-2 px-2 text-center">Concluído</th>
                        <th className="py-2 px-2 text-right">Potência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {metrics.concessionariaData.map((item: any) => (
                        <tr key={item.name} className="hover:bg-secondary/30 transition-colors">
                          <td className="py-2.5 px-2 font-bold text-foreground truncate max-w-[140px]">{item.name}</td>
                          <td className="py-2.5 px-2 text-center font-extrabold text-foreground">{item.total}</td>
                          <td className="py-2.5 px-2 text-center text-sky-400 font-bold">{item.simulacao}</td>
                          <td className="py-2.5 px-2 text-center text-amber-400 font-bold">{item.negociacao}</td>
                          <td className="py-2.5 px-2 text-center text-indigo-400 font-bold">{item.homologacao}</td>
                          <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{item.concluido}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-primary">{item.kwpTotal} kWp</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                  Nenhuma concessionária vinculada a clientes ainda.
                </div>
              )}
            </div>
          </div>

          {/* D2 — Performance por Técnico / Responsável */}
          {metrics.teamPerformance?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 mb-8">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Performance da Equipe & Técnicos</h3>
                    <p className="text-[11px] text-muted-foreground">Ranking de fechamentos e volume por responsável</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold">
                      <th className="py-2 px-2">Responsável / Usuário</th>
                      <th className="py-2 px-2 text-center">Perfil</th>
                      <th className="py-2 px-2 text-center">Projetos Totais</th>
                      <th className="py-2 px-2 text-center">Vendas Fechadas</th>
                      <th className="py-2 px-2 text-center">Taxa de Conversão</th>
                      <th className="py-2 px-2 text-right">kWp Vendido</th>
                      <th className="py-2 px-2 text-right">Volume (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {metrics.teamPerformance.map((member: any) => (
                      <tr key={member.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-2.5 px-2 font-bold text-foreground truncate">{member.name}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="bg-secondary text-muted-foreground px-2 py-0.5 rounded-full text-[10px] font-bold border border-border">
                            {member.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-foreground">{member.totalProjects}</td>
                        <td className="py-2.5 px-2 text-center font-extrabold text-emerald-400">{member.closedProjects}</td>
                        <td className="py-2.5 px-2 text-center font-bold text-sky-400">{member.conversionRate}%</td>
                        <td className="py-2.5 px-2 text-right font-bold text-primary">{member.totalKwp} kWp</td>
                        <td className="py-2.5 px-2 text-right font-black text-foreground">
                          {member.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DE PROJETOS CANCELADOS */}
      {showCanceledModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Projetos Cancelados / Perdidos</h3>
                  <p className="text-xs text-muted-foreground">Lista completa com motivos de perda registrados</p>
                </div>
              </div>
              <button
                onClick={() => setShowCanceledModal(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtro de Busca */}
            <div className="p-4 border-b border-border/60 bg-background/50">
              <div className="relative">
                <input
                  type="text"
                  value={canceledFilter}
                  onChange={(e) => setCanceledFilter(e.target.value)}
                  placeholder="Buscar por cliente, projeto ou motivo de cancelamento..."
                  className="w-full h-10 pl-9 pr-4 text-xs font-semibold bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Lista de Projetos Cancelados */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {(() => {
                const list = (metrics?.canceledProjectsList || []).filter((p: any) => {
                  if (!canceledFilter.trim()) return true;
                  const term = canceledFilter.toLowerCase();
                  return (
                    p.name?.toLowerCase().includes(term) ||
                    p.clientName?.toLowerCase().includes(term) ||
                    p.lossReason?.toLowerCase().includes(term)
                  );
                });

                if (list.length === 0) {
                  return (
                    <div className="py-12 text-center text-xs text-muted-foreground font-medium space-y-2">
                      <AlertTriangle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p>Nenhum projeto cancelado encontrado com este filtro.</p>
                    </div>
                  );
                }

                return list.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-foreground text-sm">{proj.name}</h4>
                        <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {proj.totalKwp} kWp
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        {proj.clientId ? (
                          <Link href={`/clientes/${proj.clientId}`} className="text-muted-foreground hover:text-primary font-bold transition-colors underline">
                            Cliente: {proj.clientName}
                          </Link>
                        ) : (
                          <span>Cliente: {proj.clientName}</span>
                        )}
                        <span>•</span>
                        <span>{new Date(proj.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Motivo: <strong className="text-foreground">{proj.lossReason}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          if (confirm(`Deseja reativar o projeto "${proj.name}" e movê-lo de volta para Em Negociação?`)) {
                            try {
                              const res = await fetch(`/api/projects/${proj.id}/status`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'NEGOTIATION', lossReason: null })
                              });
                              if (!res.ok) throw new Error();
                              await mutate();
                              alert('Projeto reativado com sucesso! Movido para Em Negociação.');
                            } catch {
                              alert('Erro ao reativar projeto.');
                            }
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all border border-emerald-500/30 flex items-center gap-1"
                        title="Reativar e mover de volta para Em Negociação no Funil de Vendas"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reativar
                      </button>
                      {proj.clientId && (
                        <Link
                          href={`/clientes/${proj.clientId}`}
                          className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all border border-border flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-primary" /> Ver Ficha
                        </Link>
                      )}
                      <Link
                        href={`/proposta?projectId=${proj.id}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Proposta
                      </Link>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-foreground font-bold flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        Carregando Dashboard...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
