"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Sun, History, Upload, Save, Download, Users, ChevronDown, ChevronUp, Zap, ArrowLeft } from "lucide-react";

type ProcessedUnit = {
  code: string;
  name: string;
  monthlyCons: number;
  dailyCons: number;
  requiredKwp: number;
  requiredModules: number;
};

type ClientData = {
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  address: string;
};

function HomeContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const [modulePower, setModulePower] = useState<number | "">("");
  const [projectName, setProjectName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [preSelectedClient, setPreSelectedClient] = useState<{ id: string, name: string } | null>(null);

  const [clientData, setClientData] = useState<ClientData>({
    name: "", cpfCnpj: "", phone: "", email: "", address: ""
  });

  const [results, setResults] = useState<{
    units: ProcessedUnit[];
    totalKwp: number;
    totalModules: number;
  } | null>(null);

  useEffect(() => {
    if (clientId) {
      fetch(`/api/clients/${clientId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.name) {
            setPreSelectedClient({ id: data.id, name: data.name });
            setClientData({
              name: data.name,
              cpfCnpj: data.cpfCnpj || "",
              phone: data.phone || "",
              email: data.email || "",
              address: data.address || ""
            });
            setShowClientForm(true);
          }
        })
        .catch(err => console.error("Erro ao buscar cliente pré-selecionado", err));
    }
  }, [clientId]);

  const processFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccessMsg("");
    setSaved(false);
    
    if (!modulePower || modulePower <= 0) {
      setError("Por favor, insira uma potência válida para o módulo.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (jsonData.length < 2) {
          setError("A planilha parece estar vazia ou não contém dados suficientes.");
          setIsProcessing(false);
          return;
        }

        calculateAndDisplay(jsonData);
      } catch (err) {
        console.error(err);
        setError("Erro ao ler o arquivo. Certifique-se de que é um Excel ou CSV válido.");
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const calculateAndDisplay = (data: any[][]) => {
    const headers = data[0].map((h) => String(h).toLowerCase());

    let codeIdx = -1;
    let nameIdx = -1;
    let consIdx = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes("cód") || h.includes("cod") || h.includes("instala")) codeIdx = codeIdx === -1 ? i : codeIdx;
      if (h.includes("nome") || h.includes("escola") || h.includes("unidade")) nameIdx = nameIdx === -1 ? i : nameIdx;
      if (h.includes("consumo") || h.includes("média") || h.includes("media") || h.includes("kwh")) consIdx = consIdx === -1 ? i : consIdx;
    }

    if (codeIdx === -1 && headers.length > 0) codeIdx = 0;
    if (nameIdx === -1 && headers.length > 1) nameIdx = 1;
    if (consIdx === -1 && headers.length > 2) consIdx = 2;

    if (codeIdx === -1 || nameIdx === -1 || consIdx === -1) {
      setError("Não foi possível identificar as colunas necessárias.");
      setIsProcessing(false);
      return;
    }

    let totalKwp = 0;
    let totalModules = 0;
    const IRRADIATION = 4.0;
    const processedUnits: ProcessedUnit[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || (!row[codeIdx] && !row[nameIdx] && !row[consIdx])) continue;

      const code = String(row[codeIdx] || "N/A");
      const name = String(row[nameIdx] || "N/A");
      const rawCons = String(row[consIdx]).replace(",", ".").replace(/[^\d.-]/g, "");
      const monthlyCons = parseFloat(rawCons);

      if (isNaN(monthlyCons) || monthlyCons <= 0) continue;

      const dailyCons = monthlyCons / 30;
      const requiredKwp = dailyCons / IRRADIATION;
      const modulePowerKwp = Number(modulePower) / 1000;
      const requiredModules = Math.ceil(requiredKwp / modulePowerKwp);

      totalKwp += requiredKwp;
      totalModules += requiredModules;

      processedUnits.push({ code, name, monthlyCons, dailyCons, requiredKwp, requiredModules });
    }

    if (processedUnits.length === 0) {
      setError("Nenhum dado numérico válido de consumo foi encontrado.");
      setResults(null);
    } else {
      setResults({ units: processedUnits, totalKwp, totalModules });
    }
    
    setIsProcessing(false);
  };

  const exportToExcel = () => {
    if (!results) return;

    const projName = projectName || "Dimensionamento Solar";
    
    const exportData: any[][] = [
      ["Relatório de Dimensionamento Fotovoltaico"],
      ["Projeto:", projName],
      ["Potência do Módulo:", `${modulePower} W`],
      ["Total Necessário:", `${results.totalKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`],
      ["Total de Módulos:", `${results.totalModules} unid.`],
      [],
      ["Código de Instalação", "Nome da Escola / Unidade", "Média Mensal (kWh)", "Consumo Diário (kWh/dia)", "kWp Necessário", "Qtd. Módulos"]
    ];

    results.units.forEach(u => {
      exportData.push([u.code, u.name, u.monthlyCons, u.dailyCons, u.requiredKwp, u.requiredModules]);
    });
    
    exportData.push([
      "TOTAL", "-",
      results.units.reduce((acc, u) => acc + u.monthlyCons, 0),
      results.units.reduce((acc, u) => acc + u.dailyCons, 0),
      results.totalKwp, results.totalModules
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    worksheet["!cols"] = [{ wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 22 }, { wch: 20 }, { wch: 15 }];
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:F1");
    for (let R = 6; R <= range.e.r; ++R) {
      for (let C = 2; C <= 4; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c:C, r:R});
        if(worksheet[cell_ref]) worksheet[cell_ref].z = "#,##0.00";
      }
      const cell_ref_F = XLSX.utils.encode_cell({c:5, r:R});
      if(worksheet[cell_ref_F]) worksheet[cell_ref_F].z = "#,##0";
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dimensionamento");
    XLSX.writeFile(workbook, `Dimensionamento_${projName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  const saveToDatabase = async () => {
    if (!results) return;
    setIsSaving(true);
    setError("");

    try {
      const payload: any = {
        name: projectName || 'Projeto sem nome',
        modulePower,
        totalKwp: results.totalKwp,
        totalModules: results.totalModules,
        units: results.units,
        clientId: preSelectedClient?.id || null
      };

      // Se tem dados de cliente preenchidos, envia junto
      if (clientData.name.trim()) {
        payload.clientData = clientData;
      }

      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Falha ao salvar');
      
      setSaved(true);
      setSuccessMsg("Projeto salvo com sucesso!" + (clientData.name.trim() ? ` Cliente "${clientData.name}" vinculado.` : ""));
    } catch (err) {
      setError("Ocorreu um erro ao tentar salvar o projeto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200">
              <Sun className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">SolarCalc Pro</h1>
              <p className="text-slate-500 font-medium">Dimensionamento Fotovoltaico Inteligente</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/clientes" className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <Users className="w-5 h-5" />
              Clientes
            </Link>
            <Link href="/historico" className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <History className="w-5 h-5" />
              Histórico
            </Link>
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-8">
          <div className="p-6 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50/50 border-b border-slate-100">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
              Nova Simulação
            </h2>
            
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 font-medium">{error}</div>}
            {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl mb-6 border border-emerald-100 font-medium">{successMsg}</div>}

            {preSelectedClient && (
              <div className="bg-violet-50 text-violet-700 p-4 rounded-xl mb-6 border border-violet-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Vinculando este projeto ao cliente: <strong>{preSelectedClient.name}</strong></span>
                </div>
                <Link href={`/clientes/${preSelectedClient.id}`} className="text-sm font-bold hover:underline flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Cliente
                </Link>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome do Projeto (Opcional)</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Escolas Municipais"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Potência do Módulo (W)</label>
                <input 
                  type="number" 
                  value={modulePower}
                  onChange={(e) => setModulePower(e.target.value ? Number(e.target.value) : "")}
                  placeholder="Ex: 550"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Planilha de Consumo (.xlsx)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv"
                    onChange={processFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full p-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-600 font-medium flex items-center justify-center gap-2 transition-all">
                    {isProcessing ? "Processando..." : <><Upload className="w-5 h-5" /> Selecionar Arquivo</>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {results && (
            <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10"><Sun className="w-32 h-32" /></div>
                  <h3 className="text-slate-400 font-medium mb-1 relative z-10">Módulo Base</h3>
                  <div className="text-4xl font-bold relative z-10">{modulePower} <span className="text-xl text-slate-400 font-normal">W</span></div>
                </div>
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
                  <h3 className="text-blue-200 font-medium mb-1">Total kWp Necessário</h3>
                  <div className="text-4xl font-bold">{results.totalKwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-xl text-blue-200 font-normal">kWp</span></div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                  <h3 className="text-emerald-100 font-medium mb-1">Total de Módulos</h3>
                  <div className="text-4xl font-bold">{results.totalModules} <span className="text-xl text-emerald-100 font-normal">unid.</span></div>
                </div>
              </div>

              {/* Formulário de Cliente */}
              <div className="mb-6 border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowClientForm(!showClientForm)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-all"
                >
                  <span className="flex items-center gap-2 font-semibold text-slate-700">
                    <Users className="w-5 h-5 text-violet-600" />
                    Vincular Cliente (Opcional)
                  </span>
                  {showClientForm ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                {showClientForm && (
                  <div className="p-5 bg-white border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Nome do Cliente *</label>
                        <input type="text" value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})}
                          placeholder="Ex: João da Silva" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">CPF / CNPJ</label>
                        <input type="text" value={clientData.cpfCnpj} onChange={(e) => setClientData({...clientData, cpfCnpj: e.target.value})}
                          placeholder="000.000.000-00" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Telefone</label>
                        <input type="text" value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: e.target.value})}
                          placeholder="(00) 00000-0000" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">E-mail</label>
                        <input type="email" value={clientData.email} onChange={(e) => setClientData({...clientData, email: e.target.value})}
                          placeholder="email@exemplo.com" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Endereço / Cidade</label>
                        <input type="text" value={clientData.address} onChange={(e) => setClientData({...clientData, address: e.target.value})}
                          placeholder="Rua, Nº - Cidade/UF" className="w-full p-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all outline-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <button onClick={exportToExcel}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95">
                  <Download className="w-5 h-5" /> Exportar Planilha
                </button>
                <button onClick={saveToDatabase} disabled={isSaving || saved}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-md active:scale-95 ${
                    saved ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30'
                  }`}>
                  <Save className="w-5 h-5" />
                  {isSaving ? "Salvando..." : saved ? "Projeto Salvo!" : "Salvar no Histórico"}
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Código</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Nome da Unidade</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">Média (kWh)</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">Diário (kWh)</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">kWp</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">Módulos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.units.map((unit, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-slate-700 font-medium">{unit.code}</td>
                          <td className="p-4 text-slate-700">{unit.name}</td>
                          <td className="p-4 text-slate-600 text-right font-mono">{unit.monthlyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-4 text-slate-600 text-right font-mono">{unit.dailyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-4 text-slate-900 font-semibold text-right font-mono">{unit.requiredKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-4 text-slate-900 font-bold text-right">{unit.requiredModules}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Carregando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
