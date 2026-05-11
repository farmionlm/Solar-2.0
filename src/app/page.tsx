"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Sun, History, Upload, Save, Download, Users, ArrowLeft } from "lucide-react";
import { ProcessedUnit, ClientData, ClientListItem } from "@/types";
import { ResultCards } from "@/components/ResultCards";
import { SimulationTable } from "@/components/SimulationTable";
import { ClientLinkingForm } from "@/components/ClientLinkingForm";
import { UserMenu } from "@/components/UserMenu";
import { calculateUnitSolarData, calculateProjectTotals } from "@/utils/solarMath";
import { ExcelParserService } from "@/services/ExcelParserService";
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
    name: "", cpfCnpj: "", phone: "", email: "", address: "", installationNumber: ""
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
              address: data.address || "",
              installationNumber: data.installationNumber || ""
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
        if (!event.target?.result) throw new Error("Erro na leitura");
        const jsonData = ExcelParserService.parseBuffer(event.target.result as ArrayBuffer);
        const calculatedResults = ExcelParserService.calculateUnits(jsonData, Number(modulePower));
        setResults(calculatedResults);
      } catch (err: any) {
        setError(err.message || "Erro ao ler o arquivo. Certifique-se de que é um Excel ou CSV válido e contém os dados necessários.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    if (!results) return;

    const projName = projectName || "Dimensionamento Solar";
    const workbook = ExcelParserService.generateExportWorkbook(
      projName,
      Number(modulePower),
      results.totalKwp,
      results.totalModules,
      results.units
    );
    
    XLSX.writeFile(workbook, `Dimensionamento_${projName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlsx`);
  };

  const saveToDatabase = async () => {
    if (!results) return;
    setIsSaving(true);
    setError("");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch {
      setError("Ocorreu um erro ao tentar salvar o projeto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-primary p-3 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-105 transition-all">
              <Sun className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">SolarCalc Pro</h1>
              <p className="text-muted-foreground font-medium">Dimensionamento Fotovoltaico Inteligente</p>
            </div>
          </Link>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            <Link href="/clientes" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Clientes</span>
            </Link>
            <Link href="/historico" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 text-foreground px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm">
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">Histórico</span>
            </Link>
            <UserMenu />
          </div>
        </header>

        <div className="bg-card rounded-2xl shadow-xl shadow-black/40 border border-border overflow-hidden mb-8">
          <div className="p-6 md:p-8 bg-gradient-to-br from-secondary/50 to-card/50 border-b border-border">
            <h2 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
              Nova Simulação
            </h2>
            
            {error && <div className="bg-red-900/20 text-red-400 p-4 rounded-xl mb-6 border border-red-900/50 font-medium">{error}</div>}
            {successMsg && <div className="bg-emerald-900/20 text-emerald-400 p-4 rounded-xl mb-6 border border-emerald-900/50 font-medium">{successMsg}</div>}

            {preSelectedClient && (
              <div className="bg-primary/10 text-primary p-4 rounded-xl mb-6 border border-primary/20 flex justify-between items-center">
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
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Planilha de Consumo (.xlsx)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv"
                    onChange={processFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-medium flex items-center justify-center gap-2 transition-all">
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
                  className="bg-card hover:bg-secondary text-primary border border-primary/30 rounded-xl shadow-md h-12 px-6 active:scale-95 text-base">
                  <Download className="w-5 h-5 mr-2" /> Exportar Planilha
                </Button>
                <Button onClick={saveToDatabase} disabled={isSaving || saved}
                  className={`rounded-xl shadow-md h-12 px-6 active:scale-95 text-base ${
                    saved ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
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
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-foreground font-medium">Carregando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
