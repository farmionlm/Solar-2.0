"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { ArrowLeft, Users, Search, Trash2, ChevronRight, Phone, Mail, MapPin, FileText, Home } from "lucide-react";

import { ClientListItem as Client } from "@/types";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { formatUnidadeConsumidora, formatCpfCnpj, formatPhone } from "@/utils/formatters";

export default function Clientes() {
  const { data: clients, error: swrError, isLoading, mutate } = useSWR<Client[]>("/api/clients", fetcher);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "", cpfCnpj: "", phone: "", email: "", address: "", installationNumber: ""
  });

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
      setNewClient({ name: "", cpfCnpj: "", phone: "", email: "", address: "", installationNumber: "" });
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
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           (c.cpfCnpj && c.cpfCnpj.includes(term)) ||
           (c.email && c.email.toLowerCase().includes(term));
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-primary p-3 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-all">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1 text-muted-foreground font-bold text-xs uppercase tracking-wider group-hover:text-primary transition-colors">
                  <Home className="w-3 h-3" /> Início
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">Clientes</h1>
              <p className="text-muted-foreground font-medium">Gerencie seus clientes e equipamentos</p>
            </div>
          </Link>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <Button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md active:scale-95 h-10 px-4 sm:px-5">
              <Users className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Button>
            <Link href="/" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Nova Simulação</span>
            </Link>
            <UserMenu />
          </div>
        </header>

        {/* Barra de busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
              className="w-full pl-12 h-12 shadow-sm bg-card border-border text-foreground"
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
              <Link href="/" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
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
                    <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {client.name}
                    </h3>
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
      </div>

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
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Endereço</label>
                  <Input type="text" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                    placeholder="Rua, Número, Cidade/UF" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-muted-foreground mb-1">Unidade Consumidora</label>
                  <Input type="text" value={formatUnidadeConsumidora(newClient.installationNumber || "")} onChange={(e) => setNewClient({...newClient, installationNumber: formatUnidadeConsumidora(e.target.value)})}
                    placeholder="Ex: 0.000.939.307.054-04" />
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
    </div>
  );
}
