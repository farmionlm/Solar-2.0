"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { ArrowLeft, Save, Download, Zap, LayoutGrid, Calendar, ChevronDown, ChevronUp, FileText, Phone, Mail, MapPin, Home } from "lucide-react";

type Unit = { code: string; name: string; monthlyCons: number; dailyCons: number; requiredKwp: number; requiredModules: number };
type Project = { 
  id: string; name: string; createdAt: string; modulePower: number; totalKwp: number; totalModules: number; 
  moduleModel: string | null; inverterModel: string | null;
  units: Unit[]; _count: { units: number } 
};
type ClientDetail = {
  id: string; name: string; cpfCnpj: string | null; phone: string | null; email: string | null; address: string | null;
  createdAt: string; projects: Project[];
};

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [moduleModel, setModuleModel] = useState("");
  const [inverterModel, setInverterModel] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((res) => { if (!res.ok) throw new Error("Erro"); return res.json(); })
      .then((data) => {
        setClient(data);
      })
      .catch(() => setError("Cliente não encontrado."))
      .finally(() => setIsLoading(false));
  }, [id]);

  const saveProjectEquipment = async (projId: string, modModel: string, invModel: string) => {
    setIsSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/calculations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projId, moduleModel: modModel, inverterModel: invModel }),
      });
      if (!res.ok) throw new Error("Erro");
      const updated = await res.json();
      
      setClient((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          projects: prev.projects.map(p => p.id === projId ? { ...p, moduleModel: updated.moduleModel, inverterModel: updated.inverterModel } : p)
        };
      });
      setSaveMsg("Equipamentos do projeto salvos!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch { setError("Erro ao salvar equipamentos do projeto."); }
    finally { setIsSaving(false); }
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
      ["Equipamentos"],
      ["Modelo do Módulo:", client.moduleModel || "Não definido"],
      ["Modelo do Inversor:", client.inverterModel || "Não definido"],
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

  const [projectEquipments, setProjectEquipments] = useState<Record<string, { module: string, inverter: string }>>({});

  const handleEquipmentChange = (projId: string, field: 'module' | 'inverter', value: string) => {
    setProjectEquipments(prev => ({
      ...prev,
      [projId]: {
        ...(prev[projId] || { 
          module: client?.projects.find(p => p.id === projId)?.moduleModel || "", 
          inverter: client?.projects.find(p => p.id === projId)?.inverterModel || "" 
        }),
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border p-12 text-center">
          <p className="text-red-600 font-medium mb-4">{error || "Cliente não encontrado."}</p>
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
              <Link href="/" className="flex items-center gap-1 text-slate-500 font-medium hover:underline text-sm">
                <Home className="w-3.5 h-3.5" /> Início
              </Link>
              <Link href="/clientes" className="flex items-center gap-1 text-violet-600 font-medium hover:underline text-sm">
                <ArrowLeft className="w-4 h-4" /> Voltar para Clientes
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{client.name}</h1>
          </div>
          <div className="flex gap-3">
            <Link href={`/?clientId=${id}`}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md shadow-violet-500/20 active:scale-95">
              <Zap className="w-5 h-5" /> Novo Projeto
            </Link>
            <button onClick={exportClientExcel}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md shadow-emerald-500/20 active:scale-95">
              <Download className="w-5 h-5" /> Planilha de Projetos (Abas)
            </button>
          </div>
        </header>

        {/* Dados do cliente */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Dados do Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {client.cpfCnpj && <p className="flex items-center gap-2 text-slate-600"><FileText className="w-4 h-4 text-slate-400" /> {client.cpfCnpj}</p>}
            {client.phone && <p className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400" /> {client.phone}</p>}
            {client.email && <p className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400" /> {client.email}</p>}
            {client.address && <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" /> {client.address}</p>}
          </div>
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
                const currentEquip = projectEquipments[proj.id] || { 
                  module: proj.moduleModel || "", 
                  inverter: proj.inverterModel || "" 
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
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => exportProjectExcel(proj)}
                          className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all shadow-sm"
                          title="Exportar este projeto"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)} className="p-1">
                          {expandedProject === proj.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>
                      </div>
                    </div>

                    {expandedProject === proj.id && (
                      <div className="border-t border-slate-200 p-6 bg-slate-50/30">
                        {/* Equipamentos do Projeto */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 mb-6 shadow-sm">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Equipamentos do Projeto</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Modelo do Módulo</label>
                              <input type="text" value={currentEquip.module} onChange={(e) => handleEquipmentChange(proj.id, 'module', e.target.value)}
                                placeholder="Ex: Canadian Solar 550W" className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Modelo do Inversor</label>
                              <input type="text" value={currentEquip.inverter} onChange={(e) => handleEquipmentChange(proj.id, 'inverter', e.target.value)}
                                placeholder="Ex: Growatt 6000W" className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none text-sm" />
                            </div>
                          </div>
                          <button onClick={() => saveProjectEquipment(proj.id, currentEquip.module, currentEquip.inverter)} disabled={isSaving}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50">
                            <Save className="w-4 h-4" /> {isSaving ? "Salvando..." : "Salvar Equipamentos"}
                          </button>
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
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-3 font-semibold text-slate-600">Código</th>
                                <th className="p-3 font-semibold text-slate-600">Unidade</th>
                                <th className="p-3 font-semibold text-slate-600 text-right">Média (kWh)</th>
                                <th className="p-3 font-semibold text-slate-600 text-right">kWp</th>
                                <th className="p-3 font-semibold text-slate-600 text-right">Módulos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {proj.units.map((u, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-3 text-slate-700 font-medium">{u.code}</td>
                                  <td className="p-3 text-slate-700">{u.name}</td>
                                  <td className="p-3 text-slate-600 text-right font-mono">{u.monthlyCons.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                  <td className="p-3 text-slate-900 font-semibold text-right font-mono">{u.requiredKwp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                  <td className="p-3 text-slate-900 font-bold text-right">{u.requiredModules}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
