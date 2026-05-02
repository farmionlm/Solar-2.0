"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Users, Plus, ShieldCheck, Mail, Building, Trash2, Edit2, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/UserMenu';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Partner = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count?: { clients: number };
};

export default function AdminPartnersPage() {
  const { data: session, isLoading, mutate } = useSWR('/api/users', fetcher);
  const authSession = useSession();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  // Edit State
  const [editingUser, setEditingUser] = useState<Partner | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '' });
  
  // Delete State
  const [deletingUser, setDeletingUser] = useState<Partner | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

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
        mutate();
      }
    } catch (err) {
      setError('Erro de conexão ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: Partner) => {
    setEditingUser(user);
    setEditFormData({ name: user.name, email: user.email, password: '' });
    setError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!editingUser) return;
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erro ao atualizar parceiro.');
      } else {
        setEditingUser(null);
        mutate();
      }
    } catch (err) {
      setError('Erro de conexão ao atualizar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (user: Partner) => {
    setDeletingUser(user);
    setAdminPassword('');
    setError('');
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!deletingUser) return;
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erro ao excluir parceiro.');
      } else {
        setDeletingUser(null);
        mutate();
      }
    } catch (err) {
      setError('Erro de conexão ao excluir a conta.');
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
            onClick={() => { setIsCreating(!isCreating); setEditingUser(null); setDeletingUser(null); setError(''); }}
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200"
          >
            {isCreating ? "Cancelar" : <><Plus className="w-4 h-4 mr-2" /> Nova Empresa</>}
          </Button>
          <UserMenu />
        </div>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-violet-100 mb-8 animate-in fade-in">
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

      {editingUser && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 mb-8 animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-500" /> Editar Parceiro: {editingUser.name}
            </h2>
            <Button variant="ghost" onClick={() => setEditingUser(null)} className="text-slate-500">Cancelar</Button>
          </div>
          <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Nome da Empresa</label>
              <Input required value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">E-mail de Acesso</label>
              <Input required type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Nova Senha (Opcional)</label>
              <Input type="text" placeholder="Deixe em branco para manter" value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} />
            </div>
            {error && <div className="md:col-span-3 text-red-500 text-sm font-bold">{error}</div>}
            <div className="md:col-span-3 flex justify-end mt-2">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Salvando..." : "Atualizar Dados"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deletingUser && (
        <div className="bg-red-50 p-6 rounded-2xl shadow-sm border border-red-200 mb-8 animate-in fade-in">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800">Excluir Parceiro Definitivamente?</h2>
              <p className="text-red-700 text-sm font-medium mt-1">
                Você está prestes a excluir a empresa <strong>{deletingUser.name}</strong>. 
                Isso apagará também TODOS os clientes e projetos criados por eles. Essa ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <form onSubmit={handleDeleteSubmit} className="bg-white p-4 rounded-xl border border-red-100">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Para confirmar, digite sua Senha de Administrador:
            </label>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <Input 
                  required 
                  type="password" 
                  placeholder="Sua senha de admin" 
                  value={adminPassword} 
                  onChange={e => setAdminPassword(e.target.value)} 
                  className="border-red-200 focus-visible:ring-red-500"
                />
                {error && <p className="text-red-600 text-sm font-bold mt-2">{error}</p>}
              </div>
              <Button type="button" variant="ghost" onClick={() => setDeletingUser(null)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !adminPassword} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                {loading ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase">
          <div className="col-span-4">Empresa / Parceiro</div>
          <div className="col-span-3">E-mail</div>
          <div className="col-span-2 text-center">Clientes Salvos</div>
          <div className="col-span-3 text-right">Ações</div>
        </div>

        <div className="divide-y divide-slate-50">
          {!session ? (
            <div className="p-8 text-center text-slate-400">Carregando empresas...</div>
          ) : session.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhuma empresa parceira cadastrada ainda.</div>
          ) : (
            session.map((user: Partner) => (
              <div key={user.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-4 font-bold text-slate-800 flex items-center gap-3 truncate">
                  <div className="w-8 h-8 rounded bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{user.name}</span>
                </div>
                <div className="col-span-3 text-slate-600 text-sm flex items-center gap-2 truncate">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" /> <span className="truncate">{user.email}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                    {user._count?.clients || 0}
                  </span>
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditClick(user)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteClick(user)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
