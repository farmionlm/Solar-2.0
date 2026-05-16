"use client";

import React, { Suspense } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Activity, Search } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function AuditoriaContent() {
  const { data: logs, error, isLoading } = useSWR('/api/audit', fetcher);
  const [searchTerm, React_useState] = React.useState("");

  const filteredLogs = logs?.filter((log: any) => {
    const term = searchTerm.toLowerCase();
    return log.action.toLowerCase().includes(term) || 
           log.details.toLowerCase().includes(term) ||
           log.user.name.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" title="Voltar ao Início" className="bg-primary p-3 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
              <ShieldCheck className="w-8 h-8" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Auditoria e Logs</h1>
              <p className="text-muted-foreground font-medium">Histórico de atividades da plataforma</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <Link href="/" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar ao Dashboard</span>
            </Link>
            <UserMenu />
          </div>
        </header>

        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border bg-secondary/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Histórico de Ações
            </h2>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar logs..."
                value={searchTerm}
                onChange={(e) => React_useState(e.target.value)}
                className="pl-9 h-10 w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-border text-sm text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4">Data/Hora</th>
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Ação</th>
                  <th className="p-4">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">Carregando logs de auditoria...</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-red-500 font-medium">Erro ao carregar logs.</td>
                  </tr>
                ) : !filteredLogs || filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border hover:bg-secondary/20 transition-colors text-sm">
                      <td className="p-4 whitespace-nowrap text-muted-foreground font-medium">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                            {log.user.name.charAt(0).toUpperCase()}
                          </div>
                          {log.user.name}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5 ml-8 block opacity-80">{log.user.role}</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Auditoria() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground font-medium">Carregando...</div>}>
      <AuditoriaContent />
    </Suspense>
  );
}
