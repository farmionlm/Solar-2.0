"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Sun, History, Upload, Save, Download, Users, Zap, Search, X, ArrowLeft } from "lucide-react";
import { ProcessedUnit, ClientData, ClientListItem } from "@/types";
import { ResultCards } from "@/components/ResultCards";
import { SimulationTable } from "@/components/SimulationTable";
import { ClientLinkingForm } from "@/components/ClientLinkingForm";
import { UserMenu } from "@/components/UserMenu";
import { calculateUnitSolarData, calculateProjectTotals } from "@/utils/solarMath";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [allClients, setAllClients] = useState<ClientListItem[]>([]);
  const [clientLinkMode, setClientLinkMode] = useState<'existing' | 'new'>('existing');
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  const [results, setResults] = useState<{
    units: ProcessedUnit[];
    totalKwp: number;
    totalModules: number;
  } | null>(null);

  useEffect(() => {
    // Buscar todos os clientes para a lista de seleção
    fetch("/api/clients")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllClients(data);
      })
      .catch(err => console.error("Erro ao buscar lista de clientes", err));

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

    const processedUnits: ProcessedUnit[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || (!row[codeIdx] && !row[nameIdx] && !row[consIdx])) continue;

      const code = String(row[codeIdx] || "N/A");
      const name = String(row[nameIdx] || "N/A");
      const rawCons = String(row[consIdx]).replace(",", ".").replace(/[^\d.-]/g, "");
      const monthlyCons = parseFloat(rawCons);

      if (isNaN(monthlyCons) || monthlyCons <= 0) continue;

      const solarData = calculateUnitSolarData(monthlyCons, Number(modulePower));

      processedUnits.push({ 
        code, 
        name, 
        monthlyCons, 
        ...solarData 
      });
    }

    const totals = calculateProjectTotals(processedUnits);

    if (processedUnits.length === 0) {
      setError("Nenhum dado numérico válido de consumo foi encontrado.");
      setResults(null);
    } else {
      setResults({
      units: processedUnits,
      ...totals
    });
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

      // Se NÃO tem cliente pré-selecionado e tem dados de novo cliente, envia para criação
      if (!preSelectedClient?.id && clientData.name.trim()) {
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
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-all">
              <Sun className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">SolarCalc Pro</h1>
              <p className="text-slate-500 font-medium">Dimensionamento Fotovoltaico Inteligente</p>
            </div>
          </Link>
          <div className="flex gap-3">
            <Link href="/clientes" className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Clientes</span>
            </Link>
            <Link href="/historico" className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">Histórico</span>
            </Link>
            <UserMenu />
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
                <Input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Escolas Municipais"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Potência do Módulo (W)</label>
                <Input 
                  type="number" 
                  value={modulePower}
                  onChange={(e) => {
                    setModulePower(e.target.value ? Number(e.target.value) : "");
                    if (error && e.target.value) setError("");
                  }}
                  placeholder="Ex: 550"
                  className="font-mono"
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
              <ResultCards 
                modulePower={modulePower} 
                totalKwp={results.totalKwp} 
                totalModules={results.totalModules} 
              />

              <ClientLinkingForm 
                showClientForm={showClientForm}
                setShowClientForm={setShowClientForm}
                preSelectedClient={preSelectedClient}
                setPreSelectedClient={setPreSelectedClient}
                clientLinkMode={clientLinkMode}
                setClientLinkMode={setClientLinkMode}
                clientSearchTerm={clientSearchTerm}
                setClientSearchTerm={setClientSearchTerm}
                allClients={allClients}
                clientData={clientData}
                setClientData={setClientData}
              />

              <div className="flex flex-wrap gap-4 mb-6">
                <Button onClick={exportToExcel}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md h-12 px-6 shadow-emerald-500/20 active:scale-95 text-base">
                  <Download className="w-5 h-5 mr-2" /> Exportar Planilha
                </Button>
                <Button onClick={saveToDatabase} disabled={isSaving || saved}
                  className={`rounded-xl shadow-md h-12 px-6 active:scale-95 text-base ${
                    saved ? 'bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                  }`}>
                  <Save className="w-5 h-5 mr-2" />
                  {isSaving ? "Salvando..." : saved ? "Projeto Salvo!" : "Salvar no Histórico"}
                </Button>
              </div>

              <SimulationTable units={results.units} />
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
