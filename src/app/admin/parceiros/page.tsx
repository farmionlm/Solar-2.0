"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Plus, ShieldCheck, Mail, Building, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/UserMenu';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPartnersPage() {
  const { data: session, isLoading } = useSWR('/api/users', fetcher);
  const authSession = useSession();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redireciona se não for admin
  if (authSession.status === 'authenticated' && authSession.data?.user?.role !== 'ADMIN') {
    router.push('/');
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erro ao criar parceiro.');
      } else {
        setIsCreating(false);
        setFormData({ name: '', email: '', password: '' });
        // Recarregar a página
        window.location.reload();
      }
    } catch (err) {
      setError('Erro de conexão ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestão de Parceiros</h1>
            <p className="text-slate-500 text-sm font-medium">Controle as contas das empresas parceiras (B2B)</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Button 
            onClick={() => setIsCreating(!isCreating)}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200"
          >
            {isCreating ? "Cancelar" : <><Plus className="w-4 h-4 mr-2" /> Nova Empresa</>}
          </Button>
          <UserMenu />
        </div>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-violet-100 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-violet-500" /> Criar Conta de Parceiro
          </h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Nome da Empresa</label>
              <Input required placeholder="Ex: SolarTech Brasil" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">E-mail de Acesso</label>
              <Input required type="email" placeholder="contato@empresa.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Senha Inicial</label>
              <Input required type="text" placeholder="Senha Forte" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            {error && <div className="md:col-span-3 text-red-500 text-sm font-bold">{error}</div>}
            <div className="md:col-span-3 flex justify-end mt-2">
              <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
                {loading ? "Criando..." : "Salvar Empresa Parceira"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase">
          <div className="col-span-4">Empresa / Parceiro</div>
          <div className="col-span-4">E-mail</div>
          <div className="col-span-2 text-center">Clientes Salvos</div>
          <div className="col-span-2 text-right">Cadastrado em</div>
        </div>

        <div className="divide-y divide-slate-50">
          {!session ? (
            <div className="p-8 text-center text-slate-400">Carregando empresas...</div>
          ) : session.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma empresa parceira cadastrada ainda.</div>
          ) : (
            session.map((user: any) => (
              <div key={user.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {user.name}
                </div>
                <div className="col-span-4 text-slate-600 text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" /> {user.email}
                </div>
                <div className="col-span-2 text-center">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                    {user._count?.clients || 0}
                  </span>
                </div>
                <div className="col-span-2 text-right text-xs text-slate-500 font-medium">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
