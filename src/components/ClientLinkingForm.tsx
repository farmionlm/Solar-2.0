import React from 'react';
import { Users, ChevronDown, ChevronUp, Search, ChevronRight, X } from 'lucide-react';
import { ClientData, ClientListItem } from '@/types';
import { Input } from '@/components/ui/input';

import { formatCpfCnpj, formatPhone, formatCep } from "@/utils/formatters";

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
    <div className="mb-6 border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setShowClientForm(!showClientForm)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-secondary/50 to-card hover:from-secondary hover:to-muted transition-all"
      >
        <span className="flex items-center gap-2 font-bold text-foreground">
          <Users className="w-5 h-5 text-primary" />
          {preSelectedClient ? `Vínculo: ${preSelectedClient.name}` : "Vincular Cliente (Opcional)"}
        </span>
        {showClientForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      
      {showClientForm && (
        <div className="p-5 bg-card border-t border-border">
          {preSelectedClient ? (
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-primary p-2 rounded-lg text-primary-foreground">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-primary font-bold uppercase tracking-wider">Cliente Selecionado</p>
                  <p className="text-lg font-bold text-foreground">{preSelectedClient.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setPreSelectedClient(null);
                  setClientData({ name: "", cpfCnpj: "", phone: "", email: "", address: "", neighborhood: "", city: "", cep: "" });
                }}
                className="flex items-center gap-1 text-red-400 hover:bg-red-950/30 px-3 py-1.5 rounded-lg font-bold transition-all text-sm"
              >
                <X className="w-4 h-4" /> Alterar / Remover
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 p-1 bg-secondary rounded-xl mb-6 w-full md:w-fit border border-border">
                <button 
                  onClick={() => setClientLinkMode('existing')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${clientLinkMode === 'existing' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Cliente Existente
                </button>
                <button 
                  onClick={() => setClientLinkMode('new')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex-1 md:flex-none ${clientLinkMode === 'new' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Novo Cliente
                </button>
              </div>

              {clientLinkMode === 'existing' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      type="text"
                      placeholder="Buscar cliente por nome ou CPF..."
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      className="w-full pl-12 h-12 bg-secondary border-border focus:border-primary"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border shadow-inner bg-secondary/20">
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
                          className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-all text-left group"
                        >
                          <div>
                            <p className="font-bold text-foreground group-hover:text-primary">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.cpfCnpj || "Sem CPF/CNPJ"}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                        </button>
                      ))
                    }
                    {allClients.filter(c => 
                        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                        (c.cpfCnpj && c.cpfCnpj.includes(clientSearchTerm))
                      ).length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-1">Nome do Cliente *</label>
                    <Input type="text" value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})}
                      placeholder="Ex: João da Silva" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-1">CPF / CNPJ</label>
                    <Input type="text" value={clientData.cpfCnpj} onChange={(e) => setClientData({...clientData, cpfCnpj: formatCpfCnpj(e.target.value)})}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-1">Telefone</label>
                    <Input type="text" value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: formatPhone(e.target.value)})}
                      placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-1">E-mail</label>
                    <Input type="email" value={clientData.email} onChange={(e) => setClientData({...clientData, email: e.target.value})}
                      placeholder="email@exemplo.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-muted-foreground mb-1">CEP</label>
                    <Input type="text" value={clientData.cep || ""} onChange={(e) => setClientData({...clientData, cep: formatCep(e.target.value)})}
                      placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-muted-foreground mb-1">Endereço (Rua, Número)</label>
                    <Input type="text" value={clientData.address || ""} onChange={(e) => setClientData({...clientData, address: e.target.value})}
                      placeholder="Rua, Nº" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-1">Bairro</label>
                    <Input type="text" value={clientData.neighborhood || ""} onChange={(e) => setClientData({...clientData, neighborhood: e.target.value})}
                      placeholder="Bairro" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-foreground mb-1">Cidade / UF</label>
                    <Input type="text" value={clientData.city || ""} onChange={(e) => setClientData({...clientData, city: e.target.value})}
                      placeholder="Cidade/UF" />
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
