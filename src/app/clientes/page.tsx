"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Search, Trash2, ChevronRight, Phone, Mail, MapPin, FileText, Home } from "lucide-react";

type Client = {
  id: string;
  name: string;
  cpfCnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  moduleModel: string | null;
  inverterModel: string | null;
  createdAt: string;
  _count: { projects: number };
};

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "", cpfCnpj: "", phone: "", email: "", address: "", moduleModel: "", inverterModel: ""
  });

  const fetchClients = () => {
    setIsLoading(true);
    fetch("/api/clients")
      .then((res) => {
        if (!res.ok) throw new Error("Falha ao buscar clientes");
        return res.json();
      })
      .then((data) => setClients(data))
      .catch((err) => {
        console.error(err);
        setError("Não foi possível carregar os clientes.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

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
      setNewClient({ name: "", cpfCnpj: "", phone: "", email: "", address: "", moduleModel: "", inverterModel: "" });
      fetchClients();
    } catch (err) {
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
      setClients(clients.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Não foi possível deletar o cliente.");
    }
  };

  const filtered = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || 
           (c.cpfCnpj && c.cpfCnpj.includes(term)) ||
           (c.email && c.email.toLowerCase().includes(term));
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-violet-600 p-3 rounded-xl text-white shadow-lg shadow-violet-200">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/" className="flex items-center gap-1 text-slate-500 font-medium hover:underline text-xs">
                  <Home className="w-3 h-3" /> Início
                </Link>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
              <p className="text-slate-500 font-medium">Gerencie seus clientes e equipamentos</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md active:scale-95">
              <Users className="w-5 h-5" />
              Novo Cliente
            </button>
            <Link href="/" className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
              Nova Simulação
            </Link>
          </div>
        </header>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 font-medium">{error}</div>}

        {/* Barra de busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none bg-white shadow-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              {clients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum resultado encontrado"}
            </h3>
            <p className="text-slate-500 mb-6">
              {clients.length === 0
                ? "Vincule um cliente ao salvar sua próxima simulação."
                : "Tente buscar por outro termo."}
            </p>
            {clients.length === 0 && (
              <Link href="/" className="inline-block bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                Criar Simulação
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((client) => (
              <div key={client.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-slate-100 flex flex-col h-full group">
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1 group-hover:text-violet-600 transition-colors">
                      {client.name}
                    </h3>
                    <button onClick={() => deleteClient(client.id)} title="Apagar Cliente"
                      className="p-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
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

                  {(client.moduleModel || client.inverterModel) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-sm">
                      {client.moduleModel && <p className="text-slate-600"><span className="font-semibold">Módulo:</span> {client.moduleModel}</p>}
                      {client.inverterModel && <p className="text-slate-600"><span className="font-semibold">Inversor:</span> {client.inverterModel}</p>}
                    </div>
                  )}
                </div>

                <Link href={`/clientes/${client.id}`}
                  className="flex items-center justify-between p-4 border-t border-slate-100 text-sm hover:bg-violet-50 transition-colors rounded-b-2xl">
                  <span className="text-slate-500 font-medium">
                    {client._count.projects} {client._count.projects === 1 ? "projeto" : "projetos"}
                  </span>
                  <span className="flex items-center gap-1 text-violet-600 font-semibold">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-violet-600 p-6 text-white flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6" /> Novo Cliente
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Nome Completo *</label>
                  <input type="text" required value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Ex: João da Silva" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">CPF / CNPJ</label>
                  <input type="text" value={newClient.cpfCnpj} onChange={(e) => setNewClient({...newClient, cpfCnpj: e.target.value})}
                    placeholder="000.000.000-00" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Telefone</label>
                  <input type="text" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="(00) 00000-0000" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">E-mail</label>
                  <input type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="email@exemplo.com" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Endereço</label>
                  <input type="text" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                    placeholder="Rua, Número, Cidade/UF" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-violet-200 disabled:opacity-50">
                  {isSaving ? "Salvando..." : "Criar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
