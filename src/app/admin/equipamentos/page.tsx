"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Settings, Plus, Trash2, ArrowLeft, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/UserMenu';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminEquipmentsPage() {
  const [activeTab, setActiveTab] = useState<'MODULES' | 'INVERTERS'>('MODULES');
  
  const { data: modules, mutate: mutateModules, isLoading: loadingModules } = useSWR('/api/equipments/modules', fetcher);
  const { data: inverters, mutate: mutateInverters, isLoading: loadingInverters } = useSWR('/api/equipments/inverters', fetcher);

  const [formData, setFormData] = useState({
    manufacturer: '',
    model: '',
    powerW: '',
    currentImp: '',
    numMppts: '',
    inputsPerMppt: ''
  });

  const [isCreating, setIsCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = activeTab === 'MODULES' ? '/api/equipments/modules' : '/api/equipments/inverters';

    try {
      const res = await fetch(url, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editId ? { id: editId, ...formData } : formData),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || `Erro ao ${editId ? 'atualizar' : 'criar'} equipamento.`);
      } else {
        setIsCreating(false);
        setEditId(null);
        setFormData({ manufacturer: '', model: '', powerW: '', currentImp: '', numMppts: '', inputsPerMppt: '' });
        if (activeTab === 'MODULES') mutateModules();
        else mutateInverters();
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setFormData({
      manufacturer: item.manufacturer,
      model: item.model,
      powerW: String(item.powerW),
      currentImp: item.currentImp ? String(item.currentImp) : '',
      numMppts: item.numMppts ? String(item.numMppts) : '',
      inputsPerMppt: item.inputsPerMppt ? String(item.inputsPerMppt) : ''
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string, type: 'MODULES' | 'INVERTERS') => {
    if (!confirm('Deseja realmente deletar este equipamento do catálogo?')) return;
    
    const url = type === 'MODULES' ? `/api/equipments/modules?id=${id}` : `/api/equipments/inverters?id=${id}`;
    
    try {
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        if (type === 'MODULES') mutateModules();
        else mutateInverters();
      } else {
        alert('Erro ao deletar equipamento.');
      }
    } catch {
      alert('Erro de conexão ao deletar.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3 group">
            <div className="bg-primary p-3 rounded-xl text-primary-foreground shadow-lg">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Catálogo de Equipamentos</h1>
              <p className="text-muted-foreground font-medium">Banco de dados global de engenharia</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Voltar</span>
            </Link>
            <UserMenu />
          </div>
        </header>

        <div className="mb-6 flex bg-card border border-border p-1 rounded-xl w-full md:w-auto overflow-hidden">
          <button 
            onClick={() => { setActiveTab('MODULES'); setIsCreating(false); setEditId(null); }}
            className={`flex-1 md:px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'MODULES' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
          >
            <Sun className="w-4 h-4" /> Módulos Fotovoltaicos
          </button>
          <button 
            onClick={() => { setActiveTab('INVERTERS'); setIsCreating(false); setEditId(null); }}
            className={`flex-1 md:px-6 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'INVERTERS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
          >
            <Zap className="w-4 h-4" /> Inversores
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg p-6 mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{activeTab === 'MODULES' ? 'Módulos Cadastrados' : 'Inversores Cadastrados'}</h2>
            <p className="text-muted-foreground text-sm">Estes itens aparecerão na lista de seleção do Simulador.</p>
          </div>
          <Button onClick={() => { setIsCreating(true); setEditId(null); setFormData({ manufacturer: '', model: '', powerW: '', currentImp: '', numMppts: '', inputsPerMppt: '' }); setError(''); }} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Novo Modelo
          </Button>
        </div>

        {error && !isCreating && (
          <div className="bg-red-900/20 text-red-400 p-4 rounded-xl mb-6 border border-red-900/50 font-medium text-center">
            {error}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b border-border">
                  <th className="p-4 font-semibold text-muted-foreground">Fabricante</th>
                  <th className="p-4 font-semibold text-muted-foreground">Modelo</th>
                  <th className="p-4 font-semibold text-muted-foreground text-center">
                    {activeTab === 'MODULES' ? 'Potência (W)' : 'Potência Nominal AC (W)'}
                  </th>
                  {activeTab === 'MODULES' && <th className="p-4 font-semibold text-muted-foreground text-center">Corrente (A)</th>}
                  {activeTab === 'INVERTERS' && <th className="p-4 font-semibold text-muted-foreground text-center">MPPTs</th>}
                  <th className="p-4 font-semibold text-muted-foreground text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'MODULES' ? loadingModules : loadingInverters) ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando catálogo...</td>
                  </tr>
                ) : (activeTab === 'MODULES' ? modules : inverters)?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum equipamento cadastrado.</td>
                  </tr>
                ) : (
                  (activeTab === 'MODULES' ? modules : inverters)?.map((item: any) => (
                    <tr key={item.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                      <td className="p-4 font-bold">{item.manufacturer}</td>
                      <td className="p-4 text-muted-foreground">{item.model}</td>
                      <td className="p-4 text-center">
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold border border-primary/20">
                          {item.powerW} W
                        </span>
                      </td>
                      {activeTab === 'MODULES' && (
                        <td className="p-4 text-center text-sm font-medium text-muted-foreground">
                          {item.currentImp ? `${item.currentImp} A` : '-'}
                        </td>
                      )}
                      {activeTab === 'INVERTERS' && (
                        <td className="p-4 text-center text-sm text-muted-foreground">
                          {item.numMppts ? `${item.numMppts} MPPTs (${item.inputsPerMppt} In)` : '-'}
                        </td>
                      )}
                      <td className="p-4 text-center flex justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-primary hover:bg-primary/10">
                          <Plus className="w-4 h-4 rotate-45" /> {/* Use a better icon if possible, but keeping it simple */}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, activeTab)} className="text-red-500 hover:bg-red-900/20">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
              {editId ? <Settings className="w-6 h-6 text-primary" /> : <Plus className="w-6 h-6 text-primary" />}
              {editId ? 'Editar' : 'Cadastrar'} {activeTab === 'MODULES' ? 'Módulo' : 'Inversor'}
            </h3>
            
            {error && <div className="bg-red-900/20 text-red-400 p-3 rounded-lg mb-4 border border-red-900/50 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Fabricante</label>
                <Input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} required placeholder="Ex: Canadian Solar" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Modelo</label>
                <Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} required placeholder="Ex: CS6W-550MB-AG" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Potência (W)</label>
                <Input type="number" value={formData.powerW} onChange={e => setFormData({...formData, powerW: e.target.value})} required placeholder="Ex: 550" />
              </div>
              
              {activeTab === 'MODULES' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Corrente Imp (A) (Opcional)</label>
                  <Input type="number" step="0.01" value={formData.currentImp} onChange={e => setFormData({...formData, currentImp: e.target.value})} placeholder="Ex: 13.50" />
                </div>
              )}
              
              {activeTab === 'INVERTERS' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Qtd. MPPTs (Opcional)</label>
                    <Input type="number" value={formData.numMppts} onChange={e => setFormData({...formData, numMppts: e.target.value})} placeholder="Ex: 2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Entradas p/ MPPT</label>
                    <Input type="number" value={formData.inputsPerMppt} onChange={e => setFormData({...formData, inputsPerMppt: e.target.value})} placeholder="Ex: 1" />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsCreating(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-primary text-primary-foreground" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar no Catálogo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick hack for the missing Sun icon if it's not imported correctly
function Sun(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
}
