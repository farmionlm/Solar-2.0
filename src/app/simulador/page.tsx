"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import { Sun, Upload, Save, Download, Users, ArrowLeft, RefreshCw, CheckCircle2, Zap, Battery } from "lucide-react";
import { ProcessedUnit, ClientData, ClientListItem } from "@/types";
import { ResultCards } from "@/components/ResultCards";
import { SimulationTable } from "@/components/SimulationTable";
import { ClientLinkingForm } from "@/components/ClientLinkingForm";
import { ExcelParserService } from "@/services/ExcelParserService";
import { HSP_BY_UF, DEFAULT_HSP } from "@/utils/solarIrradiation";
import { calculateBatteryRequirement, validateDisjuntorCompatibility } from "@/utils/solarMath";
import { validateRegulatoryLimits } from "@/utils/regulatoryLimits";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepCard } from "@/components/ui/StepCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProjectContextBanner } from "@/components/ui/ProjectContextBanner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SimulatorContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");

  const { data: dbModules } = useSWR("/api/equipments/modules", fetcher);
  const { data: dbInverters } = useSWR("/api/equipments/inverters", fetcher);

  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedInverterId, setSelectedInverterId] = useState<string>("");
  const [modulePower, setModulePower] = useState<number | "">("");
  const [projectName, setProjectName] = useState<string>("");
  const [connectionType, setConnectionType] = useState<string>("Bifásico");
  const [padraoAmps, setPadraoAmps] = useState<number | "">(50);
  
  const [cep, setCep] = useState("");
  const [uf, setUf] = useState("");
  const [irradiation, setIrradiation] = useState<number>(DEFAULT_HSP);
  const [lossFactorPercent, setLossFactorPercent] = useState<number>(15);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [rawExcelData, setRawExcelData] = useState<any[][] | null>(null);

  // Estados de Dimensionamento de Baterias (Sistema Híbrido/Nobreak)
  const [enableBatteryBackup, setEnableBatteryBackup] = useState(false);
  const [criticalLoadKw, setCriticalLoadKw] = useState<number | "">(3);
  const [autonomyHours, setAutonomyHours] = useState<number | "">(4);

  // Estados de Comparação de Múltiplos Cenários (S3 — Cenário A vs Cenário B)
  const [enableCompareScenarios, setEnableCompareScenarios] = useState(false);
  const [selectedModuleIdB, setSelectedModuleIdB] = useState<string>("");
  const [modulePowerB, setModulePowerB] = useState<number | "">("");
  const [lossFactorPercentB, setLossFactorPercentB] = useState<number>(15);

  const batteryCalc = useMemo(() => {
    if (!enableBatteryBackup) return null;
    return calculateBatteryRequirement(Number(criticalLoadKw) || 0, Number(autonomyHours) || 0);
  }, [enableBatteryBackup, criticalLoadKw, autonomyHours]);

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

  const results = useMemo(() => {
    if (rawExcelData && modulePower && Number(modulePower) > 0) {
      try {
        return ExcelParserService.calculateUnits(rawExcelData, Number(modulePower), irradiation, lossFactorPercent);
      } catch (err) {
        console.error("Erro ao recalcular Cenário A:", err);
        return null;
      }
    }
    return null;
  }, [modulePower, irradiation, lossFactorPercent, rawExcelData]);

  const resultsB = useMemo(() => {
    if (enableCompareScenarios && rawExcelData && modulePowerB && Number(modulePowerB) > 0) {
      try {
        return ExcelParserService.calculateUnits(rawExcelData, Number(modulePowerB), irradiation, lossFactorPercentB);
      } catch (err) {
        console.error("Erro ao recalcular Cenário B:", err);
        return null;
      }
    }
    return null;
  }, [enableCompareScenarios, modulePowerB, irradiation, lossFactorPercentB, rawExcelData]);

  useEffect(() => {
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

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.substring(0, 8);
    
    const formattedCep = value.replace(/^(\d{5})(\d)/, "$1-$2");
    setCep(formattedCep);

    if (value.length === 8) {
      setIsFetchingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await res.json();
        
        if (!data.erro && data.uf) {
          setUf(data.uf);
          const newHsp = HSP_BY_UF[data.uf] || DEFAULT_HSP;
          setIrradiation(newHsp);
        } else {
          setUf("");
          setIrradiation(DEFAULT_HSP);
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setIsFetchingCep(false);
      }
    } else {
      setUf("");
    }
  };

  const processFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setSuccessMsg("");
    setSaved(false);
    
    if (!modulePower || Number(modulePower) <= 0) {
      setError("Por favor, selecione ou insira a potência do módulo primeiro.");
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
        setRawExcelData(jsonData);
      } catch (err: any) {
        setError(err.message || "Erro ao ler o arquivo. Certifique-se de que é um Excel ou CSV válido.");
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
      const selectedModule = dbModules?.find((m: any) => m.id === selectedModuleId);
      const selectedInverter = dbInverters?.find((i: any) => i.id === selectedInverterId);

      const payload: any = {
        name: projectName || 'Projeto sem nome',
        modulePower,
        totalKwp: results.totalKwp,
        totalModules: results.totalModules,
        units: results.units,
        clientId: preSelectedClient?.id || null,
        moduleModel: selectedModule ? `${selectedModule.manufacturer} - ${selectedModule.model}` : null,
        inverterModel: selectedInverter ? `${selectedInverter.manufacturer} - ${selectedInverter.model}` : null,
      };

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Sun className="w-4 h-4" /> Automação de Memorial & Conformidade
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
            Dimensionamento Fotovoltaico
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Selecione o módulo, informe a região e valide os pontos de consumo diretamente aqui.
          </p>
        </div>

        {preSelectedClient && (
          <Link
            href={`/clientes/${preSelectedClient.id}`}
            className="flex items-center gap-2 bg-secondary border border-border hover:border-primary/50 text-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-primary" /> Voltar para Ficha do Cliente
          </Link>
        )}
      </div>

      {/* Banner de Contexto de Projeto Selecionado */}
      <ProjectContextBanner
        projectName={projectName || (preSelectedClient ? `Projeto — ${preSelectedClient.name}` : undefined)}
        clientName={preSelectedClient?.name}
        kwpTotal={results?.totalKwp}
        statusText="Nova Simulação em Andamento"
        clientId={preSelectedClient?.id}
      />

      {error && <div className="bg-red-900/20 text-red-400 p-4 rounded-xl mb-6 border border-red-900/50 font-medium">{error}</div>}
      {successMsg && <div className="bg-emerald-900/20 text-emerald-400 p-4 rounded-xl mb-6 border border-emerald-900/50 font-medium">{successMsg}</div>}

      {/* ETAPA 1: DADOS DO PROJETO & LOCALIZAÇÃO */}
      <StepCard
        stepNumber={1}
        title="DADOS DO PROJETO & REGIONALIZAÇÃO"
        subtitle="Informe o nome de referência e a localização para cálculo exato das Horas de Sol Pleno (HSP)."
        statusBadge={
          uf ? (
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
              HSP Detectado ({uf}: {irradiation} HSP)
            </span>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Nome de Identificação do Projeto</label>
            <Input 
              type="text" 
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Instalação Matriz / Escolas"
              className="h-11 text-sm bg-card border-border"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">CEP do Local de Instalação</label>
            <div className="relative">
              <Input 
                type="text" 
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="h-11 text-sm bg-card border-border"
              />
              {isFetchingCep && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Irradiação Solar (HSP)</label>
            <Input 
              type="number" 
              step="0.1"
              value={irradiation}
              onChange={(e) => setIrradiation(Number(e.target.value) || DEFAULT_HSP)}
              className="h-11 text-sm font-mono text-primary font-bold bg-card border-border"
            />
          </div>
        </div>
      </StepCard>

      {/* ETAPA 2: EQUIPAMENTOS & CONEXÃO DA REDE */}
      <StepCard
        stepNumber={2}
        title="EQUIPAMENTOS & DIMENSIONAMENTO TÉCNICO"
        subtitle="Confira os módulos, inversores e o padrão de ligação da rede elétrica da distribuidora."
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Módulo Fotovoltaico *</label>
            <select 
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedModuleId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedModuleId(id);
                const mod = dbModules?.find((m: any) => m.id === id);
                if (mod) {
                  setModulePower(mod.powerW);
                  if (error) setError("");
                } else {
                  setModulePower("");
                }
              }}
            >
              <option value="">Selecione o módulo...</option>
              {dbModules?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.manufacturer} {m.model} ({m.powerW}W)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Inversor Predominante</label>
            <select 
              className="flex h-11 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedInverterId}
              onChange={(e) => setSelectedInverterId(e.target.value)}
            >
              <option value="">Selecione (Opcional)</option>
              {dbInverters?.map((i: any) => (
                <option key={i.id} value={i.id}>{i.manufacturer} {i.model} ({i.powerW}W)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Disjuntor / Padrão (A)</label>
            <Input
              type="number"
              placeholder="Ex: 50A, 63A"
              value={padraoAmps}
              onChange={(e) => setPadraoAmps(Number(e.target.value) || "")}
              className="h-11 text-sm font-bold bg-card border-border"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Ligação da Saída (Rede)</label>
            <SegmentedControl
              options={[
                { value: "Monofásico", label: "Mono" },
                { value: "Bifásico", label: "Bi" },
                { value: "Trifásico", label: "Tri" },
              ]}
              value={connectionType}
              onChange={setConnectionType}
              className="w-full justify-between"
            />
          </div>
        </div>

        {/* Indicador de Validação de Disjuntor (S2) */}
        {(() => {
          const selectedInverter = dbInverters?.find((i: any) => i.id === selectedInverterId);
          const inverterKw = selectedInverter ? (selectedInverter.powerW / 1000) : (results ? results.totalKwp : 0);
          if (!inverterKw || inverterKw <= 0) return null;
          const disjValidation = validateDisjuntorCompatibility(inverterKw, connectionType, Number(padraoAmps) || 0);
          return (
            <div className={`mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              !disjValidation.isCompatible
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <span>{disjValidation.message}</span>
              <span className="font-extrabold px-2 py-0.5 rounded bg-card border border-border text-[10px] whitespace-nowrap">
                Corrente CA: {disjValidation.estimatedCurrentAmps}A
              </span>
            </div>
          );
        })()}

        {/* Fator de Perdas Globais (Sombreamento/Orientação) */}
        <div className="mt-5 p-4 rounded-xl bg-secondary/30 border border-border/60">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase">
              Fator de Perdas Globais (Sombreamento, Inclinação & Sujidade)
            </label>
            <span className="text-xs font-extrabold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              {lossFactorPercent}% de perdas
            </span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={35}
              step={1}
              value={lossFactorPercent}
              onChange={(e) => setLossFactorPercent(Number(e.target.value))}
              className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <Input
              type="number"
              min={5}
              max={50}
              value={lossFactorPercent}
              onChange={(e) => setLossFactorPercent(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
              className="w-20 h-9 text-xs font-bold text-center bg-card border-border"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Margem padrão recomendada: 15%. Aumente para locais com sombreamento parcial ou orientação não-ideal (ex: Leste/Oeste).
          </p>
        </div>

        {/* Seção de Comparação de Múltiplos Cenários (S3 — Cenário A vs Cenário B) */}
        <div className="mt-5 pt-5 border-t border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-foreground">Comparação de Múltiplos Cenários (Cenário A vs Cenário B)</h4>
              <p className="text-xs text-muted-foreground">Simule 2 configurações técnicas (ex: painéis de potências diferentes) para comparar resultados lado a lado.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableCompareScenarios}
                onChange={(e) => setEnableCompareScenarios(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {enableCompareScenarios && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-extrabold text-primary uppercase">
                <span>⚡ Configuração do Cenário B (Alternativa)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Módulo do Cenário B</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-xs font-bold shadow-sm"
                    value={selectedModuleIdB}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedModuleIdB(id);
                      const mod = dbModules?.find((m: any) => m.id === id);
                      setModulePowerB(mod ? mod.powerW : "");
                    }}
                  >
                    <option value="">Selecione o módulo do Cenário B...</option>
                    {dbModules?.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.manufacturer} {m.model} ({m.powerW}W)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Fator de Perdas do Cenário B (%)</label>
                  <Input
                    type="number"
                    value={lossFactorPercentB}
                    onChange={(e) => setLossFactorPercentB(Number(e.target.value) || 15)}
                    className="h-10 text-xs font-bold bg-card border-border"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção de Backup de Baterias (Sistema Híbrido) */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-emerald-500" />
              <div>
                <h4 className="text-sm font-bold text-foreground">Backup de Baterias (Sistema Híbrido / Off-Grid)</h4>
                <p className="text-xs text-muted-foreground">Calcule a reserva de energia para manter cargas essenciais durante quedas de luz.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableBatteryBackup}
                onChange={(e) => setEnableBatteryBackup(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {enableBatteryBackup && (
            <div className="bg-secondary/30 border border-border p-4 rounded-2xl space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Carga Crítica Prioritária (kW)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={criticalLoadKw}
                    onChange={(e) => setCriticalLoadKw(Number(e.target.value) || "")}
                    placeholder="Ex: 3 kW (Geladeira, Lâmpadas, Roteador)"
                    className="h-10 text-xs bg-card border-border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Autonomia Desejada (Horas)</label>
                  <select
                    value={autonomyHours}
                    onChange={(e) => setAutonomyHours(Number(e.target.value))}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-2 text-xs font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={2}>2 Horas (Curta duração)</option>
                    <option value={4}>4 Horas (Médio porte / Noturno)</option>
                    <option value={8}>8 Horas (Pernoite completo)</option>
                    <option value={12}>12 Horas (Semi off-grid)</option>
                    <option value={24}>24 Horas (Totalmente autônomo)</option>
                  </select>
                </div>
              </div>

              {batteryCalc && batteryCalc.recommendedCapacityKwh > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2">
                    <Battery className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-extrabold text-foreground block">
                        Capacidade Recomendada: {batteryCalc.recommendedCapacityKwh} kWh (LiFePO4)
                      </span>
                      <span className="text-muted-foreground font-medium block">
                        {batteryCalc.suggestedModulesCount}x Módulos de Bateria (5.12 kWh 48V) — Profundidade de descarga 85%
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-500 text-white font-black text-[10px] px-2.5 py-1 rounded-full shrink-0">
                    HÍBRIDO OK
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </StepCard>

      {/* ETAPA 3: PLANILHA DE CONSUMO & RESULTADOS */}
      <StepCard
        stepNumber={3}
        title="PLANILHA DE CONSUMO & MEMORIAL"
        subtitle="Carregue a planilha (.xlsx ou .csv) contendo as unidades consumidoras para gerar o relatório final."
        actionButton={
          results && (
            <Button
              onClick={saveToDatabase}
              disabled={isSaving || saved}
              className={`rounded-xl shadow-md h-10 px-5 text-xs font-bold active:scale-95 ${
                saved ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
              }`}
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isSaving ? "Salvando..." : saved ? "Projeto Salvo!" : "Salvar no Histórico"}
            </Button>
          )
        }
      >
        <div className="mb-6">
          <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase">Arquivo de Consumo das Unidades (.xlsx)</label>
          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv"
              onChange={processFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold flex flex-col items-center justify-center gap-2 transition-all">
              <Upload className="w-6 h-6" />
              <span>{isProcessing ? "Processando planilha..." : "Clique ou arraste o arquivo Excel/CSV de consumo aqui"}</span>
              <span className="text-[11px] font-medium text-muted-foreground">Suporta tabelas com colunas Cód. Instalação, Nome e Consumo em kWh</span>
            </div>
          </div>
        </div>

        {results && (
          <div className="animate-in fade-in duration-500 pt-4 border-t border-border/60 space-y-4">
            {/* Alertas de Enquadramento Regulatório ANEEL (S4) */}
            {(() => {
              const regAlerts = validateRegulatoryLimits(results.totalKwp);
              if (regAlerts.length === 0) return null;
              return (
                <div className="space-y-2">
                  {regAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                        alert.level === 'CRITICAL'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : alert.level === 'WARNING'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                      }`}
                    >
                      <span className="font-extrabold text-sm shrink-0">
                        {alert.level === 'CRITICAL' ? '🚨' : alert.level === 'WARNING' ? '⚠️' : 'ℹ️'}
                      </span>
                      <div>
                        <strong className="block font-bold text-foreground mb-0.5">{alert.title}</strong>
                        <span>{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <ResultCards 
              modulePower={modulePower} 
              totalKwp={results.totalKwp} 
              totalModules={results.totalModules} 
            />

            {/* Quadro Comparativo de Cenários (S3 — Cenário A vs B) */}
            {enableCompareScenarios && resultsB && (
              <div className="p-4 bg-secondary/30 border border-primary/30 rounded-2xl space-y-3 animate-in fade-in duration-200">
                <h4 className="font-extrabold text-sm text-primary flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Comparativo Lado a Lado: Cenário A vs Cenário B
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-card border border-border p-4 rounded-xl space-y-2">
                    <span className="font-extrabold text-sky-400 block border-b border-border pb-1">
                      Cenário A ({modulePower}W — {lossFactorPercent}% perdas)
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Potência Total:</span>
                      <span className="font-bold text-foreground">{results.totalKwp} kWp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Módulos:</span>
                      <span className="font-bold text-foreground">{results.totalModules} placas</span>
                    </div>
                  </div>

                  <div className="bg-card border border-primary/40 p-4 rounded-xl space-y-2">
                    <span className="font-extrabold text-primary block border-b border-border pb-1">
                      Cenário B ({modulePowerB}W — {lossFactorPercentB}% perdas)
                    </span>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Potência Total:</span>
                      <span className="font-bold text-primary">{resultsB.totalKwp} kWp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Módulos:</span>
                      <span className="font-bold text-primary">{resultsB.totalModules} placas</span>
                    </div>
                    <div className="flex justify-between text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
                      <span>Diferença no arranjo:</span>
                      <span className="font-bold text-foreground">
                        {resultsB.totalModules - results.totalModules > 0
                          ? `+${resultsB.totalModules - results.totalModules} placas no Cenário B`
                          : `${resultsB.totalModules - results.totalModules} placas no Cenário B`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

            <div className="flex flex-wrap gap-3 my-6">
              <Button onClick={exportToExcel}
                className="bg-card hover:bg-secondary text-primary border border-primary/30 rounded-xl shadow-sm h-11 px-5 text-xs font-bold active:scale-95">
                <Download className="w-4 h-4 mr-2" /> Exportar Planilha Excel
              </Button>
            </div>

            <SimulationTable units={results.units} />
          </div>
        )}
      </StepCard>
    </div>
  );
}

export default function Simulador() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-foreground font-medium">Carregando formulário...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}
