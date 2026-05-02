"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import * as XLSX from "xlsx";
import { ArrowLeft, Save, Download, Zap, LayoutGrid, Calendar, ChevronDown, ChevronUp, FileText, Phone, Mail, MapPin, Home, Pencil, X, Trash2 } from "lucide-react";

import { ProcessedUnit, Project, ClientDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateMemorialPDF } from "@/utils/generateMemorial";

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


function formatCep(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  let formatted = "";
  if (clean.length > 0) formatted += clean.substring(0, Math.min(clean.length, 5));
  if (clean.length > 5) formatted += "-" + clean.substring(5, clean.length);
  return formatted;
}

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: client, error: swrError, isLoading, mutate } = useSWR<ClientDetail>(`/api/clients/${id}`, fetcher);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientData, setEditClientData] = useState({
    name: "", cpfCnpj: "", phone: "", email: "", address: "", neighborhood: "", city: "", cep: "", installationNumber: ""
  });

  const saveProjectEquipment = async (projId: string, equipData: any) => {
    setIsSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/calculations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projId, ...equipData }),
      });
      if (!res.ok) throw new Error("Erro");
      await res.json();
      
      await mutate();
      setSaveMsg("Dados técnicos do projeto salvos!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch { setError("Erro ao salvar dados técnicos."); }
    finally { setIsSaving(false); }
  };
  
  const handleUpdateClient = async () => {
    if (!editClientData.name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editClientData }),
      });
      if (!res.ok) throw new Error("Erro");
      await res.json();
      await mutate();
      setIsEditingClient(false);
      setSaveMsg("Dados do cliente atualizados!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setError("Erro ao atualizar dados do cliente.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = () => {
    if (!client) return;
    setEditClientData({
      name: client.name,
      cpfCnpj: formatCpfCnpj(client.cpfCnpj || ""),
      phone: formatPhone(client.phone || ""),
      email: client.email || "",
      address: client.address || "",
      neighborhood: client.neighborhood || "",
      city: client.city || "",
      cep: formatCep(client.cep || ""),
      installationNumber: formatUnidadeConsumidora(client.installationNumber || "")
    });
    setIsEditingClient(true);
  };

  const exportClientExcel = () => {
    if (!client) return;

    const wb = XLSX.utils.book_new();

    // Aba 1 - Dados do Cliente
    const clientSheet: any[][] = [
      ["Ficha do Cliente"],
      [],
      ["Nome:", client.name],
      ["CPF/CNPJ:", client.cpfCnpj || "-"],
      ["Telefone:", client.phone || "-"],
      ["E-mail:", client.email || "-"],
      ["Endereço:", client.address || "-"],
      [],
      ["Resumo dos Projetos"],
      ["Total de Projetos:", client.projects.length],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(clientSheet);
    ws1["!cols"] = [{ wch: 22 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Dados do Cliente");

    // Aba para cada projeto
    client.projects.forEach((proj, idx) => {
      const projData: any[][] = [
        [`Projeto: ${proj.name || "Sem nome"}`],
        ["Data:", new Date(proj.createdAt).toLocaleDateString("pt-BR")],
        ["Potência do Módulo:", `${proj.modulePower} W`],
        ["Total kWp:", proj.totalKwp],
        ["Total de Módulos:", proj.totalModules],
        [],
        ["Código", "Unidade", "Média Mensal (kWh)", "Consumo Diário (kWh/dia)", "kWp Necessário", "Qtd. Módulos"],
      ];

      proj.units.forEach((u) => {
        projData.push([u.code, u.name, u.monthlyCons, u.dailyCons, u.requiredKwp, u.requiredModules]);
      });

      projData.push([
        "TOTAL", "-",
        proj.units.reduce((a, u) => a + u.monthlyCons, 0),
        proj.units.reduce((a, u) => a + u.dailyCons, 0),
        proj.totalKwp, proj.totalModules,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(projData);
      ws["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 15 }];
      
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:F1");
      for (let R = 6; R <= range.e.r; ++R) {
        for (let C = 2; C <= 4; ++C) {
          const ref = XLSX.utils.encode_cell({ c: C, r: R });
          if (ws[ref]) ws[ref].z = "#,##0.00";
        }
        const refF = XLSX.utils.encode_cell({ c: 5, r: R });
        if (ws[refF]) ws[refF].z = "#,##0";
      }

      XLSX.utils.book_append_sheet(wb, ws, `Projeto ${idx + 1}`);
    });

    const fileName = client.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    XLSX.writeFile(wb, `Cliente_${fileName}.xlsx`);
  };

  const exportProjectExcel = (proj: Project) => {
    if (!client) return;

    const exportData: any[][] = [
      ["RELATÓRIO DE DIMENSIONAMENTO FOTOVOLTAICO"],
      [],
      ["1. DADOS DO CLIENTE"],
      ["Nome:", client.name],
      ["CPF/CNPJ:", client.cpfCnpj || "-"],
      ["Telefone:", client.phone || "-"],
      ["E-mail:", client.email || "-"],
      ["Endereço:", client.address || "-"],
      [],
      ["2. EQUIPAMENTOS SUGERIDOS"],
      ["Modelo do Módulo:", proj.moduleModel || "Não definido"],
      ["Modelo do Inversor:", proj.inverterModel || "Não definido"],
      ["Potência do Módulo Base:", `${proj.modulePower} W`],
      [],
      ["3. RESUMO DO PROJETO"],
      ["Nome do Projeto:", proj.name || "Sem nome"],
      ["Data de Criação:", new Date(proj.createdAt).toLocaleDateString("pt-BR")],
      ["Potência Total Necessária:", `${proj.totalKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`],
      ["Quantidade de Módulos:", `${proj.totalModules} unid.`],
      [],
      ["4. DETALHAMENTO POR UNIDADE"],
      ["Código de Instalação", "Nome da Unidade", "Média Mensal (kWh)", "Consumo Diário (kWh/dia)", "kWp Necessário", "Qtd. Módulos"]
    ];

    proj.units.forEach((u) => {
      exportData.push([u.code, u.name, u.monthlyCons, u.dailyCons, u.requiredKwp, u.requiredModules]);
    });

    exportData.push([
      "TOTAL CONSOLIDADO", "-",
      proj.units.reduce((a, u) => a + u.monthlyCons, 0),
      proj.units.reduce((a, u) => a + u.dailyCons, 0),
      proj.totalKwp, proj.totalModules,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    ws["!cols"] = [{ wch: 25 }, { wch: 45 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 15 }];
    
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:F1");
    const dataStartRow = 22;
    for (let R = dataStartRow; R <= range.e.r; ++R) {
      for (let C = 2; C <= 4; ++C) {
        const ref = XLSX.utils.encode_cell({ c: C, r: R });
        if (ws[ref]) ws[ref].z = "#,##0.00";
      }
      const refF = XLSX.utils.encode_cell({ c: 5, r: R });
      if (ws[refF]) ws[refF].z = "#,##0";
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dimensionamento");
    XLSX.writeFile(wb, `Projeto_${(proj.name || "SemNome").replace(/[^a-z0-9]/gi, "_")}.xlsx`);
  };

  const [projectEquipments, setProjectEquipments] = useState<Record<string, any>>({});

  const handleEquipmentChange = (projId: string, field: string, value: string | number) => {
    setProjectEquipments(prev => ({
      ...prev,
      [projId]: {
        ...(prev[projId] || {}),
        [field]: value
      }
    }));
  };

  const handleInverterChange = (projId: string, inverterIndex: number, field: string, value: any) => {
    setProjectEquipments(prev => {
      const existingInverters = [ ...(prev[projId]?.inverters || client?.projects.find((p: any) => p.id === projId)?.inverters || []) ];
      if (!existingInverters[inverterIndex]) {
        existingInverters[inverterIndex] = { manufacturer: "", model: "", outputPower: null, outputCurrent: null, quantity: 1 };
      }
      existingInverters[inverterIndex] = {
        ...existingInverters[inverterIndex],
        [field]: value
      };
      return {
        ...prev,
        [projId]: {
          ...(prev[projId] || {}),
          inverters: existingInverters
        }
      };
    });
  };

  const addInverterRow = (projId: string) => {
    setProjectEquipments(prev => {
      const existingInverters = [ ...(prev[projId]?.inverters || client?.projects.find((p: any) => p.id === projId)?.inverters || []) ];
      existingInverters.push({ manufacturer: "", model: "", outputPower: null, outputCurrent: null, quantity: 1 });
      return {
        ...prev,
        [projId]: {
          ...(prev[projId] || {}),
          inverters: existingInverters
        }
      };
    });
  };

  const removeInverterRow = (projId: string, inverterIndex: number) => {
    setProjectEquipments(prev => {
      const existingInverters = [ ...(prev[projId]?.inverters || client?.projects.find((p: any) => p.id === projId)?.inverters || []) ];
      existingInverters.splice(inverterIndex, 1);
      return {
        ...prev,
        [projId]: {
          ...(prev[projId] || {}),
          inverters: existingInverters
        }
      };
    });
  };

  if (isLoading && !client) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (swrError || error || !client) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border p-12 text-center">
          <p className="text-red-600 font-medium mb-4">{swrError?.message || error || "Cliente não encontrado."}</p>
          <div className="flex justify-center gap-4">
            <Link href="/" className="text-slate-500 font-semibold hover:underline">Ir para Início</Link>
            <Link href="/clientes" className="text-violet-600 font-semibold hover:underline">Voltar para Clientes</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/" className="flex items-center gap-1 text-slate-500 font-medium hover:underline text-sm group/home">
                <Home className="w-3.5 h-3.5 group-hover/home:text-violet-600" /> Início
              </Link>
              <Link href="/clientes" className="flex items-center gap-1 text-violet-600 font-medium hover:underline text-sm">
                <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
              </Link>
            </div>
            <Link href="/" className="group/logo block">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 group-hover/logo:text-violet-600 transition-colors">{client.name}</h1>
            </Link>
          </div>
          <div className="flex gap-3">
            <Link href={`/?clientId=${id}`}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md shadow-violet-500/20 active:scale-95 h-12">
              <Zap className="w-5 h-5" /> Novo Projeto
            </Link>
            <Button onClick={exportClientExcel}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 h-12 px-6 text-base">
              <Download className="w-5 h-5 mr-2" /> Planilha de Projetos (Abas)
            </Button>
          </div>
        </header>

        {/* Dados do cliente */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Dados do Cliente</h2>
            {!isEditingClient ? (
              <Button variant="ghost"
                onClick={startEditing}
                className="text-violet-600 hover:bg-violet-50 hover:text-violet-700 font-semibold text-sm"
              >
                <Pencil className="w-4 h-4 mr-1.5" /> Editar Dados
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost"
                  onClick={() => setIsEditingClient(false)}
                  className="text-slate-500 hover:bg-slate-100 font-semibold text-sm"
                >
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateClient}
                  disabled={isSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1" /> {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>
          
          {isEditingClient ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nome Completo</label>
                <Input type="text" value={editClientData.name} onChange={(e) => setEditClientData({...editClientData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">CPF / CNPJ</label>
                <Input type="text" value={editClientData.cpfCnpj} onChange={(e) => setEditClientData({...editClientData, cpfCnpj: formatCpfCnpj(e.target.value)})} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Telefone</label>
                <Input type="text" value={editClientData.phone} onChange={(e) => setEditClientData({...editClientData, phone: formatPhone(e.target.value)})} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">E-mail</label>
                <Input type="email" value={editClientData.email} onChange={(e) => setEditClientData({...editClientData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">CEP</label>
                <Input type="text" value={editClientData.cep} onChange={(e) => setEditClientData({...editClientData, cep: formatCep(e.target.value)})} placeholder="00000-000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Endereço (Rua, Número)</label>
                <Input type="text" value={editClientData.address} onChange={(e) => setEditClientData({...editClientData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Bairro</label>
                <Input type="text" value={editClientData.neighborhood} onChange={(e) => setEditClientData({...editClientData, neighborhood: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Cidade / UF</label>
                <Input type="text" value={editClientData.city} onChange={(e) => setEditClientData({...editClientData, city: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Unidade Consumidora</label>
                <Input type="text" value={editClientData.installationNumber} onChange={(e) => setEditClientData({...editClientData, installationNumber: formatUnidadeConsumidora(e.target.value)})} placeholder="Ex: 0.000.939.307.054-04" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p className="flex items-center gap-2 text-slate-600"><FileText className="w-4 h-4 text-slate-400" /> {client.cpfCnpj || "CPF/CNPJ não informado"}</p>
              <p className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400" /> {client.phone || "Telefone não informado"}</p>
              <p className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400" /> {client.email || "E-mail não informado"}</p>
              <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" /> {client.cep ? `CEP: ${client.cep}` : "CEP não informado"}</p>
              <p className="flex items-center gap-2 text-slate-600 md:col-span-2"><MapPin className="w-4 h-4 text-slate-400" /> {[client.address, client.neighborhood, client.city].filter(Boolean).join(', ') || "Endereço não informado"}</p>
              <p className="flex items-center gap-2 text-slate-600 md:col-span-2"><Zap className="w-4 h-4 text-slate-400" /> Unidade Consumidora: <span className="font-semibold">{client.installationNumber || "Não informado"}</span></p>
            </div>
          )}
        </div>

        {/* Projetos */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800">
              Projetos ({client.projects.length})
            </h2>
            {saveMsg && <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 text-sm font-medium animate-in fade-in duration-300">{saveMsg}</div>}
          </div>

          {client.projects.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhum projeto vinculado a este cliente.</p>
          ) : (
            <div className="space-y-4">
              {client.projects.map((proj) => {
                const currentEquip = {
                  moduleModel: proj.moduleModel || "",
                  inverterModel: proj.inverterModel || "",
                  generationKwh: proj.generationKwh || "",
                  reductionPercent: proj.reductionPercent || "",
                  moduleManufacturer: proj.moduleManufacturer || "",
                  moduleArea: proj.moduleArea || "",
                  moduleCurrent: proj.moduleCurrent || "",
                  inverterManufacturer: proj.inverterManufacturer || "",
                  inverterOutputPower: proj.inverterOutputPower || "",
                  inverterOutputCurrent: proj.inverterOutputCurrent || "",
                  areaOccupied: proj.areaOccupied || "",
                  professionalName: proj.professionalName || "",
                  professionalCrt: proj.professionalCrt || "",
                  inverters: proj.inverters || [],
                  ...projectEquipments[proj.id]
                };

                return (
                  <div key={proj.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition-colors text-left">
                      <button onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
                        className="flex-grow">
                        <div>
                          <h3 className="font-bold text-slate-800">{proj.name || "Projeto sem nome"}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(proj.createdAt).toLocaleDateString("pt-BR")}</span>
                            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" /> {proj.totalKwp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp</span>
                            <span className="flex items-center gap-1"><LayoutGrid className="w-3.5 h-3.5 text-blue-500" /> {proj.totalModules} módulos</span>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const currentEquip = projectEquipments[proj.id] || {};
                              const mergedProject = { ...proj, ...currentEquip };
                              generateMemorialPDF(client, mergedProject);
                            } catch (err) {
                              console.error("Erro ao gerar PDF:", err);
                              alert("Ocorreu um erro ao gerar o PDF. Verifique os dados.");
                            }
                          }}
                          className="text-violet-600 bg-violet-50 hover:bg-violet-100"
                          title="Gerar Memorial Descritivo (PDF)"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); exportProjectExcel(proj); }}
                          className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          title="Exportar Planilha Excel"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}>
                          {expandedProject === proj.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </Button>
                      </div>
                    </div>

                    {expandedProject === proj.id && (
                      <div className="border-t border-slate-200 p-6 bg-slate-50/30">
                        {/* Dados Técnicos do Projeto para Memorial */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6 shadow-sm">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Dados para o Memorial Descritivo
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Geração Mensal Estimada (kWh)</label>
                              <Input type="number" value={currentEquip.generationKwh} onChange={(e) => handleEquipmentChange(proj.id, 'generationKwh', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Percentual de Redução (%)</label>
                              <Input type="number" value={currentEquip.reductionPercent} onChange={(e) => handleEquipmentChange(proj.id, 'reductionPercent', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Área Total (m²)</label>
                              <Input type="number" value={currentEquip.areaOccupied} onChange={(e) => handleEquipmentChange(proj.id, 'areaOccupied', e.target.value)} />
                            </div>

                            <div className="col-span-full border-t border-slate-100 my-2"></div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Fabricante do Módulo</label>
                              <Input type="text" value={currentEquip.moduleManufacturer} onChange={(e) => handleEquipmentChange(proj.id, 'moduleManufacturer', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Modelo do Módulo</label>
                              <Input type="text" value={currentEquip.moduleModel} onChange={(e) => handleEquipmentChange(proj.id, 'moduleModel', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Corrente do Módulo (Imp - A)</label>
                              <Input type="number" value={currentEquip.moduleCurrent} onChange={(e) => handleEquipmentChange(proj.id, 'moduleCurrent', e.target.value)} />
                            </div>

                            <div className="col-span-full border-t border-slate-100 my-2"></div>

                            <div className="col-span-full bg-slate-50/80 border border-slate-100 p-4 rounded-xl mb-2">
                              <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Inversores ({currentEquip.inverters?.length || 0})</span>
                                <Button
                                  type="button"
                                  onClick={() => addInverterRow(proj.id)}
                                  variant="outline"
                                  className="h-8 text-xs bg-white hover:bg-violet-50 text-violet-600 border-violet-200"
                                >
                                  + Adicionar Inversor
                                </Button>
                              </div>

                              {(!currentEquip.inverters || currentEquip.inverters.length === 0) ? (
                                <p className="text-xs text-slate-400 text-center py-2">Nenhum inversor adicionado.</p>
                              ) : (
                                <div className="space-y-4">
                                  {currentEquip.inverters.map((inv: any, idx: number) => (
                                    <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Fabricante</label>
                                        <Input type="text" value={inv.manufacturer || ""} onChange={(e) => handleInverterChange(proj.id, idx, 'manufacturer', e.target.value)} className="h-9 text-xs" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Modelo</label>
                                        <Input type="text" value={inv.model || ""} onChange={(e) => handleInverterChange(proj.id, idx, 'model', e.target.value)} className="h-9 text-xs" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Potência Saída (kW)</label>
                                        <Input type="number" value={inv.outputPower ?? ""} onChange={(e) => handleInverterChange(proj.id, idx, 'outputPower', e.target.value)} className="h-9 text-xs" />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Corrente Saída (A)</label>
                                        <Input type="number" value={inv.outputCurrent ?? ""} onChange={(e) => handleInverterChange(proj.id, idx, 'outputCurrent', e.target.value)} className="h-9 text-xs" />
                                      </div>
                                      <div className="flex gap-2 items-center justify-between">
                                        <div className="flex-1">
                                          <label className="block text-xs font-bold text-slate-500 mb-1">Qtd</label>
                                          <Input type="number" value={inv.quantity ?? 1} onChange={(e) => handleInverterChange(proj.id, idx, 'quantity', e.target.value)} className="h-9 text-xs" />
                                        </div>
                                        <Button
                                          type="button"
                                          onClick={() => removeInverterRow(proj.id, idx)}
                                          variant="ghost"
                                          size="icon"
                                          className="text-red-500 hover:bg-red-50 h-9 w-9 mt-5"
                                          title="Remover Inversor"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="col-span-full border-t border-slate-100 my-2"></div>

                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Resp. Técnico</label>
                              <Input type="text" value={currentEquip.professionalName} onChange={(e) => handleEquipmentChange(proj.id, 'professionalName', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Registro Profissional (CRT/CREA)</label>
                              <Input type="text" value={currentEquip.professionalCrt} onChange={(e) => handleEquipmentChange(proj.id, 'professionalCrt', e.target.value)} />
                            </div>
                          </div>
                          
                          <Button onClick={() => saveProjectEquipment(proj.id, currentEquip)} disabled={isSaving}
                            className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md active:scale-95 disabled:opacity-50 h-12 px-8">
                            <Save className="w-4 h-4 mr-2" /> {isSaving ? "Salvando..." : "Salvar Todos os Dados Técnicos"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
                            <div className="text-xs text-slate-500 uppercase font-bold">Módulo Base</div>
                            <div className="text-lg font-bold text-slate-800">{proj.modulePower}W</div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
                            <div className="text-xs text-slate-500 uppercase font-bold">kWp Total</div>
                            <div className="text-lg font-bold text-blue-600">{proj.totalKwp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-slate-100 text-center shadow-sm">
                            <div className="text-xs text-slate-500 uppercase font-bold">Qtd Módulos</div>
                            <div className="text-lg font-bold text-emerald-600">{proj.totalModules}</div>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="font-semibold text-slate-600">Código</TableHead>
                                <TableHead className="font-semibold text-slate-600">Unidade</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right">Média (kWh)</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right">kWp</TableHead>
                                <TableHead className="font-semibold text-slate-600 text-right">Módulos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {proj.units.map((u, i) => (
                                <TableRow key={i} className="hover:bg-slate-50">
                                  <TableCell className="text-slate-700 font-medium py-3">{u.code}</TableCell>
                                  <TableCell className="text-slate-700 py-3">{u.name}</TableCell>
                                  <TableCell className="text-slate-600 text-right font-mono py-3">{u.monthlyCons.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-slate-900 font-semibold text-right font-mono py-3">{u.requiredKwp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-slate-900 font-bold text-right py-3">{u.requiredModules}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
