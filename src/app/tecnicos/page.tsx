"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Mail, Trash2, Edit2, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/UserMenu';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Technician = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count?: { clients: number };
};

export default function PartnerTechniciansPage() {
  const { data: session, mutate } = useSWR('/api/technicians', fetcher);
  const authSession = useSession();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  const [editingUser, setEditingUser] = useState<Technician | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', password: '' });
  
  const [deletingUser, setDeletingUser] = useState<Technician | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authSession.status === 'authenticated' && authSession.data?.user?.role !== 'PARTNER') {
    router.push('/');
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erro ao criar técnico.');
      } else {
        setIsCreating(false);
        setFormData({ name: '', email: '', password: '' });
        mutate();
      }
    } catch {
      setError('Erro de conexão ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: Technician) => {
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
      const res = await fetch(`/api/technicians/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erro ao atualizar técnico.');
      } else {
        setEditingUser(null);
        mutate();
      }
    } catch {
      setError('Erro de conexão ao atualizar a conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/technicians/${deletingUser.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Erro ao deletar técnico.');
      } else {
        setDeletingUser(null);
        mutate();
      }
    } catch {
      setError('Erro de conexão ao deletar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Users className="w-4 h-4" /> Gestão de Equipe & Acessos
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Meus Técnicos</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Gerencie os acessos e permissões dos técnicos da sua empresa</p>
        </div>
        <Button onClick={() => { setIsCreating(true); setError(''); }} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 active:scale-95 h-11 px-5 font-bold text-xs">
          <Plus className="w-4 h-4 mr-2" /> Novo Técnico
        </Button>
      </header>

        {error && !isCreating && !editingUser && !deletingUser && (
          <div className="bg-red-900/20 text-red-400 p-4 rounded-xl mb-6 border border-red-900/50 font-medium text-center">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  <th className="p-4 font-semibold text-muted-foreground">Técnico</th>
                  <th className="p-4 font-semibold text-muted-foreground">E-mail de Acesso</th>
                  <th className="p-4 font-semibold text-muted-foreground text-center">Clientes / Projetos</th>
                  <th className="p-4 font-semibold text-muted-foreground text-center">Data de Criação</th>
                  <th className="p-4 font-semibold text-muted-foreground text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {!session ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando técnicos...</td>
                  </tr>
                ) : session.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Sua equipe ainda não possui técnicos cadastrados.</td>
                  </tr>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  session.map((tech: any) => (
                    <tr key={tech.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                      <td className="p-4 font-bold">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {tech.name.charAt(0).toUpperCase()}
                          </div>
                          {tech.name}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" /> {tech.email}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-secondary text-foreground px-3 py-1 rounded-full text-xs font-bold border border-border">
                          {tech._count?.clients || 0} Registros
                        </span>
                      </td>
                      <td className="p-4 text-center text-muted-foreground text-sm">
                        {new Date(tech.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(tech)}>
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setDeletingUser(tech); setError(''); }} className="border-red-900/30 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL NOVO TÉCNICO */}
      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" /> Adicionar Técnico
            </h3>
            <p className="text-muted-foreground mb-6">Crie uma conta de acesso para um funcionário da sua empresa.</p>
            
            {error && <div className="bg-red-900/20 text-red-400 p-3 rounded-lg mb-4 border border-red-900/50 text-sm">{error}</div>}
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nome do Técnico</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">E-mail de Acesso</label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="joao@suaempresa.com.br" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Senha Inicial</label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required placeholder="Senha segura" />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreating(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Conta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR TÉCNICO */}
      {editingUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Edit2 className="w-6 h-6 text-primary" /> Editar Técnico
            </h3>
            <p className="text-muted-foreground mb-6">Atualize os dados de acesso de {editingUser.name}.</p>
            
            {error && <div className="bg-red-900/20 text-red-400 p-3 rounded-lg mb-4 border border-red-900/50 text-sm">{error}</div>}
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nome do Técnico</label>
                <Input value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">E-mail de Acesso</label>
                <Input type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nova Senha <span className="text-muted-foreground font-normal">(deixe em branco para não alterar)</span></label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input type="password" value={editFormData.password} onChange={e => setEditFormData({...editFormData, password: e.target.value})} className="pl-9" placeholder="Nova senha (opcional)" />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingUser(null)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETAR TÉCNICO */}
      {deletingUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-red-900/30 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-2 text-red-500">Deletar Técnico</h3>
            <p className="text-foreground mb-6">
              Tem certeza que deseja remover o acesso de <strong className="text-red-400">{deletingUser.name}</strong>? Esta ação removerá permanentemente a conta de login do técnico. Os clientes e simulações cadastrados por ele serão mantidos no banco da empresa.
            </p>
            
            {error && <div className="bg-red-900/20 text-red-400 p-3 rounded-lg mb-4 border border-red-900/50 text-sm">{error}</div>}
            
            <div className="flex gap-3 mt-8">
              <Button type="button" variant="outline" className="flex-1 border-border" onClick={() => setDeletingUser(null)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                {loading ? 'Deletando...' : 'Sim, Deletar Técnico'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
