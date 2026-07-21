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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <ShieldCheck className="w-4 h-4" /> Auditoria & Registros de Segurança
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Logs de Auditoria</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Histórico completo de alterações de status e ações executadas no sistema</p>
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
