"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/utils/fetcher";
import { Users, Search, Trash2, ChevronRight, Phone, Mail, MapPin, FileText, Home, Building, Sun } from "lucide-react";

import { ClientListItem as Client } from "@/types";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatCpfCnpj, formatPhone, formatCep } from "@/utils/formatters";
import { fetchAddressByCep } from "@/utils/cepApi";
import { FaturaOcrModal } from "@/components/FaturaOcrModal";
import { FaturaExtraida } from "@/utils/faturaParser";
import { Sparkles, Loader2 } from "lucide-react";

export default function Clientes() {
  const { data: session } = useSession();
  const { data: clients, error: swrError, isLoading, mutate } = useSWR<Client[]>("/api/clients", fetcher);
  const [activeTab, setActiveTab] = useState<'MEUS' | 'GERAIS'>('MEUS');
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepStatusMessage, setCepStatusMessage] = useState("");
  const [newClient, setNewClient] = useState({
    name: "", cpfCnpj: "", phone: "", email: "", address: "", cep: "", neighborhood: "", city: ""
  });

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setNewClient(prev => ({ ...prev, cep: formatted }));
    setCepStatusMessage("");

    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setIsSearchingCep(true);
      setCepStatusMessage("Buscando endereço...");
      try {
        const addressData = await fetchAddressByCep(clean);
        if (addressData) {
          if (addressData.erro) {
            setCepStatusMessage("⚠️ CEP não encontrado. Preencha o endereço manualmente.");
          } else {
            setNewClient(prev => ({
              ...prev,
              address: addressData.logradouro || prev.address,
              neighborhood: addressData.bairro || prev.neighborhood,
              city: addressData.cityDisplay || prev.city,
            }));
            setCepStatusMessage("✓ Endereço preenchido automaticamente! Você pode editar qualquer campo se necessário.");
          }
        }
      } catch {
        setCepStatusMessage("⚠️ Erro ao buscar CEP. Preencha o endereço manualmente.");
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  const handleApplyOcrData = (data: FaturaExtraida) => {
    const cityDisplay = data.cidade ? (data.uf ? `${data.cidade} / ${data.uf}` : data.cidade) : "";
    setNewClient({
      name: data.clienteNome || "Novo Cliente Fatura",
      cpfCnpj: data.cpfCnpj ? formatCpfCnpj(data.cpfCnpj) : "",
      phone: "",
      email: "",
      address: data.endereco || "",
      cep: data.cep ? formatCep(data.cep) : "",
      neighborhood: data.bairro || "",
      city: cityDisplay,
    });
    setShowModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setShowModal(false);
      setNewClient({ name: "", cpfCnpj: "", phone: "", email: "", address: "", cep: "", neighborhood: "", city: "" });
      setCepStatusMessage("");
      mutate();
    } catch {
      alert("Erro ao criar cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este cliente? Os projetos vinculados serão desvinculados.")) return;

    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
      mutate();
    } catch (err) {
      console.error(err);
      alert("Não foi possível deletar o cliente.");
    }
  };

  const filtered = (clients || []).filter((c) => {
    const isMine = c.userId === session?.user?.id;
    if (activeTab === 'MEUS' && !isMine) return false;
    if (activeTab === 'GERAIS' && isMine) return false;

    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           (c.cpfCnpj && c.cpfCnpj.includes(term)) ||
           (c.email && c.email.toLowerCase().includes(term));
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Users className="w-4 h-4" /> Cadastro de Clientes & Equipamentos
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Gerencie sua base de clientes, equipamentos e histórico de projetos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95">
            <Sparkles className="w-4 h-4" /> Importar Fatura (OCR)
          </button>
          <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md shadow-primary/20 active:scale-95 h-11 px-5 font-bold text-xs">
            <Users className="w-4 h-4 mr-2" /> Novo Cliente
          </Button>
          <Link href="/simulador" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 text-foreground px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm">
            <Sun className="w-4 h-4 text-primary" /> Nova Simulação
          </Link>
        </div>
      </header>

        {/* Barra de busca e Abas */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex bg-card border border-border p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('MEUS')}
              className={`flex-1 md:px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'MEUS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
            >
              Meus Clientes
            </button>
            <button 
              onClick={() => setActiveTab('GERAIS')}
              className={`flex-1 md:px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'GERAIS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/50'}`}
            >
              Clientes Gerais
            </button>
          </div>

          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
              className="w-full pl-12 h-11 shadow-sm bg-card border-border text-foreground rounded-xl"
            />
          </div>
        </div>

        {isLoading && !clients ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : swrError ? (
          <div className="bg-red-900/20 text-red-400 p-8 rounded-2xl text-center font-medium border border-red-900/50 mb-8">
            Ocorreu um erro ao carregar os clientes.
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-xl border border-border p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              {(!clients || clients.length === 0) ? "Nenhum cliente cadastrado" : "Nenhum resultado encontrado"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {(!clients || clients.length === 0)
                ? "Vincule um cliente ao salvar sua próxima simulação."
                : "Tente buscar por outro termo."}
            </p>
            {(!clients || clients.length === 0) && (
              <Link href="/simulador" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
                Criar Simulação
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((client) => (
              <div key={client.id} className="bg-card rounded-2xl shadow-xl hover:shadow-black/50 transition-all border border-border flex flex-col h-full group">
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <Link href={`/clientes/${client.id}`} className="block group/name">
                      <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover/name:text-primary transition-colors cursor-pointer">
                        {client.name}
                      </h3>
                    </Link>
                    <button onClick={() => deleteClient(client.id)} title="Apagar Cliente"
                      className="p-1.5 text-red-400 bg-red-950/30 hover:bg-red-900/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {client.cpfCnpj && (
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> {client.cpfCnpj}
                    </p>
                  )}

                  <div className="space-y-1.5 text-sm text-slate-500">
                    {client.phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {client.phone}</p>}
                    {client.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {client.email}</p>}
                    {client.address && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {client.address}</p>}
                  </div>

                  {/* Badge de Procuração */}
                  <div className="mt-3">
                    {client.procuracaoUrl ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        <FileText className="w-3 h-3" /> Procuração OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        ⚠️ Sem Procuração
                      </span>
                    )}
                  </div>

                  {/* Partner badge — only shown in Clientes Gerais tab */}
                  {activeTab === 'GERAIS' && (() => {
                    const u = client.user;
                    // Resolve partner name
                    const partnerName = u?.role === 'PARTNER'
                      ? u.name
                      : u?.company?.name ?? null;
                    // Resolve technician name (only if created by a technician)
                    const techName = u?.role === 'TECHNICIAN' ? u.name : null;

                    return (
                      <div className="mt-3 space-y-1.5">
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg w-fit ${partnerName ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          <Building className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {partnerName ?? 'Sem parceiro (Admin)'}
                          </span>
                        </div>
                        {techName && (
                          <div className="flex items-center gap-1.5 bg-secondary text-muted-foreground text-xs font-semibold px-2.5 py-1 rounded-lg w-fit">
                            <Users className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">Técnico: {techName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>

                <Link href={`/clientes/${client.id}`}
                  className="flex items-center justify-between p-4 border-t border-border text-sm hover:bg-primary/5 transition-colors rounded-b-2xl">
                  <span className="text-muted-foreground font-medium">
                  {client._count?.projects || 0} {client._count?.projects === 1 ? "projeto" : "projetos"}
                </span>
                  <span className="flex items-center gap-1 text-primary font-bold">
                    Ver Detalhes <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-border">
            <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" /> Novo Cliente
              </h2>
              <button onClick={() => setShowModal(false)} className="text-primary-foreground/80 hover:text-primary-foreground text-2xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Nome Completo *</label>
                  <Input type="text" required value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Ex: João da Silva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">CPF / CNPJ</label>
                  <Input type="text" value={newClient.cpfCnpj} onChange={(e) => setNewClient({...newClient, cpfCnpj: formatCpfCnpj(e.target.value)})}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Telefone</label>
                  <Input type="text" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">E-mail</label>
                  <Input type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="email@exemplo.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-muted-foreground mb-1 flex items-center justify-between">
                    <span>CEP</span>
                    {isSearchingCep && (
                      <span className="text-xs text-primary font-semibold flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando endereço...
                      </span>
                    )}
                  </label>
                  <Input type="text" value={newClient.cep} onChange={handleCepChange}
                    placeholder="00000-000" />
                  {cepStatusMessage && (
                    <p className={`text-xs mt-1 font-medium ${cepStatusMessage.startsWith("✓") ? "text-emerald-500 dark:text-emerald-400" : cepStatusMessage.startsWith("⚠️") ? "text-amber-500" : "text-muted-foreground"}`}>
                      {cepStatusMessage}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Endereço (Rua, Número)</label>
                  <Input type="text" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                    placeholder="Ex: Rua das Flores, 123" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Bairro</label>
                  <Input type="text" value={newClient.neighborhood} onChange={(e) => setNewClient({...newClient, neighborhood: e.target.value})}
                    placeholder="Ex: Centro" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Cidade / UF</label>
                  <Input type="text" value={newClient.city} onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                    placeholder="Ex: São Paulo / SP" />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}
                  className="rounded-xl h-12 px-6 text-base border-border bg-card hover:bg-secondary">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 h-12 px-8 text-base">
                  {isSaving ? "Salvando..." : "Criar Cliente"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Leitor Inteligente de Faturas (OCR) */}
      <FaturaOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onApply={handleApplyOcrData}
      />
    </div>
  );
}
