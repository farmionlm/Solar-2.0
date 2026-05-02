import React from 'react';
import { Users, ChevronDown, ChevronUp, Search, ChevronRight, X } from 'lucide-react';
import { ClientData, ClientListItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function formatUnidadeConsumidora(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 15);
  let formatted = "";
  if (clean.length > 0) {
    formatted += clean[0];
  }
  if (clean.length > 1) {
    formatted += "." + clean.substring(1, Math.min(clean.length, 4));
  }
  if (clean.length > 4) {
    formatted += "." + clean.substring(4, Math.min(clean.length, 7));
  }
  if (clean.length > 7) {
    formatted += "." + clean.substring(7, Math.min(clean.length, 10));
  }
  if (clean.length > 10) {
    formatted += "." + clean.substring(10, Math.min(clean.length, 13));
  }
  if (clean.length > 13) {
    formatted += "-" + clean.substring(13, clean.length);
  }
  return formatted;
}


function formatCpfCnpj(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 14);
  if (clean.length <= 11) {
    let formatted = "";
    if (clean.length > 0) formatted += clean.substring(0, 3);
    if (clean.length > 3) formatted += "." + clean.substring(3, 6);
    if (clean.length > 6) formatted += "." + clean.substring(6, 9);
    if (clean.length > 9) formatted += "-" + clean.substring(9, 11);
    return formatted;
  } else {
    let formatted = "";
    if (clean.length > 0) formatted += clean.substring(0, 2);
    if (clean.length > 2) formatted += "." + clean.substring(2, 5);
    if (clean.length > 5) formatted += "." + clean.substring(5, 8);
    if (clean.length > 8) formatted += "/" + clean.substring(8, 12);
    if (clean.length > 12) formatted += "-" + clean.substring(12, 14);
    return formatted;
  }
}

function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 10) {
    let formatted = "";
    if (clean.length > 0) formatted += "(" + clean.substring(0, 2);
    if (clean.length > 2) formatted += ") " + clean.substring(2, 6);
    if (clean.length > 6) formatted += "-" + clean.substring(6, 10);
    return formatted;
  } else {
    let formatted = "";
    if (clean.length > 0) formatted += "(" + clean.substring(0, 2);
    if (clean.length > 2) formatted += ") " + clean.substring(2, 7);
    if (clean.length > 7) formatted += "-" + clean.substring(7, 11);
    return formatted;
  }
}

interface ClientLinkingFormProps {
  showClientForm: boolean;
  setShowClientForm: (show: boolean) => void;
  preSelectedClient: { id: string, name: string } | null;
  setPreSelectedClient: (client: { id: string, name: string } | null) => void;
  clientLinkMode: 'existing' | 'new';
  setClientLinkMode: (mode: 'existing' | 'new') => void;
  clientSearchTerm: string;
  setClientSearchTerm: (term: string) => void;
  allClients: ClientListItem[];
  clientData: ClientData;
  setClientData: (data: ClientData) => void;
}

export const ClientLinkingForm: React.FC<ClientLinkingFormProps> = ({
  showClientForm,
  setShowClientForm,
  preSelectedClient,
  setPreSelectedClient,
  clientLinkMode,
  setClientLinkMode,
  clientSearchTerm,
  setClientSearchTerm,
  allClients,
  clientData,
  setClientData,
}) => {
  return (
    <div className="mb-6 border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setShowClientForm(!showClientForm)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-all"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-700">
          <Users className="w-5 h-5 text-violet-600" />
          {preSelectedClient ? `Vínculo: ${preSelectedClient.name}` : "Vincular Cliente (Opcional)"}
        </span>
        {showClientForm ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      
      {showClientForm && (
        <div className="p-5 bg-white border-t border-slate-100">
          {preSelectedClient ? (
            <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 p-2 rounded-lg text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-violet-600 font-bold uppercase tracking-wider">Cliente Selecionado</p>
                  <p className="text-lg font-bold text-slate-800">{preSelectedClient.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setPreSelectedClient(null);
                  setClientData({ name: "", cpfCnpj: "", phone: "", email: "", address: "", neighborhood: "", city: "", cep: "", installationNumber: "" });
                }}
                className="flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-semibold transition-all text-sm"
              >
                <X className="w-4 h-4" /> Alterar / Remover
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6 w-full md:w-fit">
                <button 
                  onClick={() => setClientLinkMode('existing')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${clientLinkMode === 'existing' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Cliente Existente
                </button>
                <button 
                  onClick={() => setClientLinkMode('new')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${clientLinkMode === 'new' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Novo Cliente
                </button>
              </div>

              {clientLinkMode === 'existing' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input 
                      type="text"
                      placeholder="Buscar cliente por nome ou CPF..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full pl-12 h-12"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 shadow-inner bg-slate-50/30">
                    {allClients
                      .filter(c => 
                        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                        (c.cpfCnpj && c.cpfCnpj.includes(clientSearchTerm))
                      )
                      .map(client => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setPreSelectedClient({ id: client.id, name: client.name });
                            setClientData({ name: "", cpfCnpj: "", phone: "", email: "", address: "", neighborhood: "", city: "", cep: "", installationNumber: "" });
                          }}
                          className="w-full flex items-center justify-between p-4 hover:bg-violet-50 transition-all text-left group"
                        >
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-violet-700">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.cpfCnpj || "Sem CPF/CNPJ"}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-violet-400" />
                        </button>
                      ))
                    }
                    {allClients.filter(c => 
                        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                        (c.cpfCnpj && c.cpfCnpj.includes(clientSearchTerm))
                      ).length === 0 && (
                      <div className="p-8 text-center text-slate-500">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Nome do Cliente *</label>
                    <Input type="text" value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})}
                      placeholder="Ex: João da Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">CPF / CNPJ</label>
                    <Input type="text" value={clientData.cpfCnpj} onChange={(e) => setClientData({...clientData, cpfCnpj: formatCpfCnpj(e.target.value)})}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Telefone</label>
                    <Input type="text" value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: formatPhone(e.target.value)})}
                      placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">E-mail</label>
                    <Input type="email" value={clientData.email} onChange={(e) => setClientData({...clientData, email: e.target.value})}
                      placeholder="email@exemplo.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-600 mb-1">CEP</label>
                    <Input type="text" value={clientData.cep || ""} onChange={(e) => setClientData({...clientData, cep: e.target.value})}
                      placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Endereço (Rua, Número)</label>
                    <Input type="text" value={clientData.address || ""} onChange={(e) => setClientData({...clientData, address: e.target.value})}
                      placeholder="Rua, Nº" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Bairro</label>
                    <Input type="text" value={clientData.neighborhood || ""} onChange={(e) => setClientData({...clientData, neighborhood: e.target.value})}
                      placeholder="Bairro" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Cidade / UF</label>
                    <Input type="text" value={clientData.city || ""} onChange={(e) => setClientData({...clientData, city: e.target.value})}
                      placeholder="Cidade/UF" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Unidade Consumidora</label>
                    <Input type="text" value={clientData.installationNumber || ""} onChange={(e) => setClientData({...clientData, installationNumber: formatUnidadeConsumidora(e.target.value)})}
                      placeholder="Ex: 0.000.939.307.054-04" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
