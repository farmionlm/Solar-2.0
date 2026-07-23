"use client";

import { useState, use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import * as XLSX from "xlsx";
import { ArrowLeft, Save, Download, Zap, LayoutGrid, Calendar, ChevronDown, ChevronUp, FileText, Phone, Mail, MapPin, Home, Pencil, X, Trash2, RefreshCw, Upload, Eye, PenTool, MessageSquare, ExternalLink, Sparkles } from "lucide-react";

import { Project, ClientDetail, Inverter } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateMemorialPDF } from "@/utils/generateMemorial";
import { generateMemorialDocx } from "@/utils/generateMemorialDocx";
import { generateFormularioAcessoPDF } from "@/utils/generateFormularioAcesso";
import { generateFormularioAcessoDocx } from "@/utils/generateFormularioAcessoDocx";
import { SlaCountdownBadge } from "@/components/SlaCountdownBadge";
import { SignatureCanvasModal } from "@/components/SignatureCanvasModal";
import { FaturaOcrModal } from "@/components/FaturaOcrModal";
import { FaturaExtraida } from "@/utils/faturaParser";
import { calculateUnitSolarData, calculateProjectTotals } from "@/utils/solarMath";
import { generateProposalWhatsAppMessage, openWhatsAppChat } from "@/utils/whatsappHelper";

import { formatUnidadeConsumidora, formatCpfCnpj, formatPhone, formatCep } from "@/utils/formatters";
import { fetchAddressByCep } from "@/utils/cepApi";
import { Loader2 } from "lucide-react";

export default function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: client, error: swrError, isLoading, mutate } = useSWR<ClientDetail>(`/api/clients/${id}`, fetcher);

  // Catálogo de equipamentos
  const { data: dbModules } = useSWR<{ id: string; manufacturer: string; model: string; powerW: number; currentImp: number | null }[]>('/api/equipments/modules', fetcher);
  const { data: dbInverters } = useSWR<{ id: string; manufacturer: string; model: string; powerW: number; numMppts: number | null; inputsPerMppt: number | null }[]>('/api/equipments/inverters', fetcher);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepStatusMsg, setCepStatusMsg] = useState("");
  const [editClientData, setEditClientData] = useState({
    name: "", cpfCnpj: "", phone: "", email: "", address: "", neighborhood: "", city: "", cep: ""
  });

  const handleEditCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setEditClientData(prev => ({ ...prev, cep: formatted }));
    setCepStatusMsg("");

    const clean = formatted.replace(/\D/g, "");
    if (clean.length === 8) {
      setIsSearchingCep(true);
      setCepStatusMsg("Buscando endereço...");
      try {
        const addressData = await fetchAddressByCep(clean);
        if (addressData) {
          if (addressData.erro) {
            setCepStatusMsg("⚠️ CEP não encontrado.");
          } else {
            setEditClientData(prev => ({
              ...prev,
              address: addressData.logradouro || prev.address,
              neighborhood: addressData.bairro || prev.neighborhood,
              city: addressData.cityDisplay || prev.city,
            }));
            setCepStatusMsg("✓ Endereço preenchido!");
          }
        }
      } catch {
        setCepStatusMsg("⚠️ Erro ao buscar CEP.");
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  // Definições para tabelas manuais
  type ManualRow = { code: string; name: string; kWp: number | ""; modules: number | "" };
  const emptyRow = (): ManualRow => ({ code: "", name: "", kWp: "", modules: "" });

  // Estado do modal de re-simulação
  const [reSimProject, setReSimProject] = useState<Project | null>(null);
  const [reSimModulePower, setReSimModulePower] = useState<number | "">("");
  const [reSimError, setReSimError] = useState("");
  const [reSimLoading, setReSimLoading] = useState(false);
  const [reSimMode, setReSimMode] = useState<'choice' | 'excel' | 'manual'>('choice');
  const [reSimRows, setReSimRows] = useState<ManualRow[]>([emptyRow()]);

  // Estado do modal de Novo Projeto
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectMode, setNewProjectMode] = useState<'choice' | 'manual'>('choice');
  const [manualProjectName, setManualProjectName] = useState("");
  const [manualModulePower, setManualModulePower] = useState<number | "">("");
  const [manualRows, setManualRows] = useState<ManualRow[]>([emptyRow()]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");

  // Estado do modal de Assinatura Eletrônica
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Estado do modal de OCR de Fatura
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const handleApplyOcrData = async (data: FaturaExtraida) => {
    setIsSaving(true);
    try {
      const cityDisplay = data.cidade ? (data.uf ? `${data.cidade} / ${data.uf}` : data.cidade) : client?.city;
      const updateData: any = {
        id,
        cpfCnpj: data.cpfCnpj ? formatCpfCnpj(data.cpfCnpj) : client?.cpfCnpj,
        installationNumber: data.instalacao || client?.installationNumber,
        concessionaria: data.concessionaria || client?.concessionaria,
        address: data.endereco || client?.address,
        neighborhood: data.bairro || client?.neighborhood,
        city: cityDisplay,
        cep: data.cep ? formatCep(data.cep) : client?.cep,
      };
      if (data.clienteNome && (!client?.name || client.name.startsWith("Cliente "))) {
        updateData.name = data.clienteNome;
      }

      const res = await fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Erro ao atualizar cliente com dados da fatura");

      await mutate();
      setSaveMsg(`Fatura lida! Concessionária ${data.concessionaria} e consumo de ${data.consumoMedioKwh} kWh/mês importados com sucesso!`);
      setTimeout(() => setSaveMsg(""), 5000);
    } catch (err: any) {
      setError(err.message || "Erro ao aplicar dados da fatura.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetManualModal = () => {
    setShowNewProjectModal(false);
    setNewProjectMode('choice');
    setManualProjectName("");
    setManualModulePower("");
    setManualRows([emptyRow()]);
    setManualError("");
  };

  const updateManualRow = (idx: number, field: keyof ManualRow, value: string | number) => {
    setManualRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const updateReSimRow = (idx: number, field: keyof ManualRow, value: string | number) => {
    setReSimRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSaveManualProject = async () => {
    setManualError("");
    if (!manualProjectName.trim()) { setManualError("Informe o nome do projeto."); return; }
    if (!manualModulePower || Number(manualModulePower) <= 0) { setManualError("Informe a potência do módulo (W)."); return; }

    const validRows = manualRows.filter(
      r => String(r.code).trim() && String(r.name).trim() && Number(r.modules) > 0
    );
    if (validRows.length === 0) { setManualError("Adicione pelo menos uma unidade com todos os campos preenchidos."); return; }

    setManualSaving(true);
    try {
      const modPower = Number(manualModulePower) || 0;
      const validRowsData = validRows.map(r => {
        const calculatedKwp = (Number(r.modules) * modPower) / 1000;
        return {
          code: String(r.code).trim(),
          name: String(r.name).trim(),
          monthlyCons: 0,
          dailyCons: 0,
          requiredKwp: calculatedKwp,
          requiredModules: Number(r.modules),
        };
      });

      const totalKwp = validRowsData.reduce((acc, r) => acc + r.requiredKwp, 0);
      const totalModules = validRowsData.reduce((acc, r) => acc + r.requiredModules, 0);

      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualProjectName.trim(),
          modulePower: modPower,
          totalKwp,
          totalModules,
          units: validRowsData,
          clientId: id,
        }),
      });

      if (!res.ok) throw new Error("Falha ao salvar projeto.");
      resetManualModal();
      await mutate();
      setSaveMsg("Projeto criado com sucesso!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setManualError("Erro ao salvar o projeto. Tente novamente.");
    } finally {
      setManualSaving(false);
    }
  };

  const saveProjectEquipment = async (projId: string, equipData: Record<string, unknown>) => {
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
      cep: formatCep(client.cep || "")
    });
    setIsEditingClient(true);
  };

  const exportClientExcel = () => {
    if (!client) return;

    const wb = XLSX.utils.book_new();

    // Aba 1 - Dados do Cliente
    const clientSheet: (string | number)[][] = [
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
      const projData: (string | number)[][] = [
        [`Projeto: ${proj.name || "Sem nome"}`],
        ["Data:", new Date(proj.createdAt).toLocaleDateString("pt-BR")],
        ["Potência do Módulo:", `${proj.modulePower} W`],
        ["Total kWp:", proj.totalKwp],
        ["Total de Módulos:", proj.totalModules],
        [],
        ["Código", "Unidade", "Média Mensal (kWh)", "Consumo Diário (kWh/dia)", "kWp Necessário", "Qtd. Módulos"],
      ];

      (proj.units || []).forEach((u) => {
        projData.push([u.code, u.name, u.monthlyCons, u.dailyCons, u.requiredKwp, u.requiredModules]);
      });

      projData.push([
        "TOTAL", "-",
        (proj.units || []).reduce((a, u) => a + u.monthlyCons, 0),
        (proj.units || []).reduce((a, u) => a + u.dailyCons, 0),
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

    const exportData: (string | number)[][] = [
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

    (proj.units || []).forEach((u) => {
      exportData.push([u.code, u.name, u.monthlyCons, u.dailyCons, u.requiredKwp, u.requiredModules]);
    });

    exportData.push([
      "TOTAL CONSOLIDADO", "-",
      (proj.units || []).reduce((a, u) => a + u.monthlyCons, 0),
      (proj.units || []).reduce((a, u) => a + u.dailyCons, 0),
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projectEquipments, setProjectEquipments] = useState<Record<string, any>>({});

  const handleEquipmentChange = (projId: string, field: string, value: string | number) => {
    setProjectEquipments(prev => {
      const projState = prev[projId] || {};
      const project = client?.projects.find((p: Project) => p.id === projId);
      
      const nextState = {
        ...projState,
        [field]: value
      };

      const modulePower = Number(nextState.modulePower ?? project?.modulePower ?? 0);

      // Recalcular dependências se mudar módulo ou potência
      if (field === 'modulePower' || field === 'totalModules') {
        const units = nextState.units || project?.units || [];
        const totalModules = Number(nextState.totalModules ?? project?.totalModules ?? 0);
        
        // Sincronizar kWp total
        nextState.totalKwp = (totalModules * modulePower) / 1000;

        // Sincronizar unidades para manter coerência
        const newUnits = [ ...units ];
        if (newUnits.length > 0) {
          // No caso de múltiplas unidades, ajustamos a primeira para manter o total sincronizado
          // ou se for apenas uma, ela recebe o valor total.
          newUnits[0] = {
            ...newUnits[0],
            requiredModules: totalModules,
            requiredKwp: nextState.totalKwp
          };
          nextState.units = newUnits;
        }

        // Recalcular Geração Estimada baseada no novo kWp
        // Prioridade: Consumo original / kWp original. Fallback: 120 (média Brasil)
        const originalUnit = project?.units?.[0];
        let factor = 120;
        const origCons = Number(originalUnit?.monthlyCons || 0);
        const origKwp = Number(originalUnit?.requiredKwp || 0);
        
        if (origCons > 0 && origKwp > 0) {
          factor = origCons / origKwp;
        } else if (project?.generationKwh && project?.totalKwp) {
          factor = project.generationKwh / project.totalKwp;
        }
        
        nextState.generationKwh = Math.round(nextState.totalKwp * factor);
      }

      return {
        ...prev,
        [projId]: nextState
      };
    });
  };

  const handleUnitChange = (projId: string, unitIndex: number, field: string, value: string | number) => {
    setProjectEquipments(prev => {
      const projState = prev[projId] || {};
      const project = client?.projects.find((p: Project) => p.id === projId);
      const units = [ ...(projState.units || project?.units || []) ];
      const modulePower = Number(projState.modulePower ?? project?.modulePower ?? 0);

      if (units[unitIndex]) {
        const newVal = field === 'requiredModules' ? (Number(value) || 0) : value;
        units[unitIndex] = { ...units[unitIndex], [field]: newVal };

        if (field === 'requiredModules') {
          units[unitIndex].requiredKwp = (Number(newVal) * modulePower) / 1000;
        }
      }

      const totalModules = units.reduce((acc, u) => acc + (Number(u.requiredModules) || 0), 0);
      const totalKwp = units.reduce((acc, u) => acc + (Number(u.requiredKwp) || 0), 0);

      // Recalcular geração estimada usando fator original
      const originalUnit = project?.units?.[0];
      let factor = 120;
      const origCons = Number(originalUnit?.monthlyCons || 0);
      const origKwp = Number(originalUnit?.requiredKwp || 0);

      if (origCons > 0 && origKwp > 0) {
        factor = origCons / origKwp;
      } else if (project?.generationKwh && project?.totalKwp) {
        factor = project.generationKwh / project.totalKwp;
      }
      const generationKwh = Math.round(totalKwp * factor);

      return {
        ...prev,
        [projId]: {
          ...projState,
          units,
          totalModules,
          totalKwp,
          generationKwh
        }
      };
    });
  };

  const handleInverterChange = (projId: string, inverterIndex: number, field: keyof Inverter, value: string | number) => {
    setProjectEquipments(prev => {
      const existingInverters = [ ...(prev[projId]?.inverters || client?.projects.find((p: Project) => p.id === projId)?.inverters || []) ];
      if (!existingInverters[inverterIndex]) {
        existingInverters[inverterIndex] = { manufacturer: "", model: "", outputPower: null, outputCurrent: null, quantity: 1, numMppts: 1, inputsPerMppt: 1 } as Inverter;
      }
      existingInverters[inverterIndex] = {
        ...existingInverters[inverterIndex],
        [field]: value
      } as Inverter;
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
      const existingInverters = [ ...(prev[projId]?.inverters || client?.projects.find((p: Project) => p.id === projId)?.inverters || []) ];
      existingInverters.push({ manufacturer: "", model: "", outputPower: null, outputCurrent: null, quantity: 1, numMppts: 1, inputsPerMppt: 1 } as Inverter);
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
      const existingInverters = [ ...(prev[projId]?.inverters || client?.projects.find((p: Project) => p.id === projId)?.inverters || []) ];
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

  const handleReSimFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReSimError("");
    if (!reSimModulePower || reSimModulePower <= 0) {
      setReSimError("Informe a potência do módulo antes de selecionar o arquivo.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !reSimProject) return;

    setReSimLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (jsonData.length < 2) {
          setReSimError("Planilha vazia ou sem dados suficientes.");
          setReSimLoading(false);
          return;
        }

        const headers = jsonData[0].map((h: unknown) => String(h).toLowerCase());
        let codeIdx = -1, nameIdx = -1, consIdx = -1;
        headers.forEach((h: string, i: number) => {
          if ((h.includes("cód") || h.includes("cod") || h.includes("instala")) && codeIdx === -1) codeIdx = i;
          if ((h.includes("nome") || h.includes("escola") || h.includes("unidade")) && nameIdx === -1) nameIdx = i;
          if ((h.includes("consumo") || h.includes("média") || h.includes("media") || h.includes("kwh")) && consIdx === -1) consIdx = i;
        });
        if (codeIdx === -1) codeIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (consIdx === -1) consIdx = 2;

        const processedUnits = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || (!row[codeIdx] && !row[nameIdx] && !row[consIdx])) continue;
          const monthlyCons = parseFloat(String(row[consIdx]).replace(",", ".").replace(/[^\d.-]/g, ""));
          if (isNaN(monthlyCons) || monthlyCons <= 0) continue;
          const solarData = calculateUnitSolarData(monthlyCons, Number(reSimModulePower));
          processedUnits.push({ code: String(row[codeIdx] || "N/A"), name: String(row[nameIdx] || "N/A"), monthlyCons, ...solarData });
        }

        if (processedUnits.length === 0) {
          setReSimError("Nenhum dado de consumo válido encontrado.");
          setReSimLoading(false);
          return;
        }

        const totals = calculateProjectTotals(processedUnits);

        const res = await fetch("/api/calculations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: reSimProject.id,
            modulePower: Number(reSimModulePower),
            totalKwp: totals.totalKwp,
            totalModules: totals.totalModules,
            units: processedUnits,
          }),
        });

        if (!res.ok) throw new Error("Falha ao re-simular.");
        setReSimProject(null);
        setReSimModulePower("");
        setProjectEquipments(prev => {
          const next = { ...prev };
          delete next[reSimProject.id];
          return next;
        });
        mutate();
        setSaveMsg("Projeto re-simulado com sucesso!");
      } catch {
        setReSimError("Erro ao processar a planilha. Verifique o formato.");
      } finally {
        setReSimLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleReSimManual = async () => {
    setReSimError("");
    if (!reSimProject) return;
    if (!reSimModulePower || Number(reSimModulePower) <= 0) {
      setReSimError("Informe a potência do módulo (W).");
      return;
    }

    const validRows = reSimRows.filter(
      r => String(r.code).trim() && String(r.name).trim() && Number(r.modules) > 0
    );
    if (validRows.length === 0) {
      setReSimError("Adicione pelo menos uma unidade com todos os campos preenchidos.");
      return;
    }

    setReSimLoading(true);
    try {
      const modPower = Number(reSimModulePower) || 0;
      const validRowsData = validRows.map(r => {
        const calculatedKwp = (Number(r.modules) * modPower) / 1000;
        return {
          code: String(r.code).trim(),
          name: String(r.name).trim(),
          monthlyCons: 0,
          dailyCons: 0,
          requiredKwp: calculatedKwp,
          requiredModules: Number(r.modules),
        };
      });

      const totalKwp = validRowsData.reduce((acc, r) => acc + r.requiredKwp, 0);
      const totalModules = validRowsData.reduce((acc, r) => acc + r.requiredModules, 0);

      const res = await fetch("/api/calculations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reSimProject.id,
          modulePower: modPower,
          totalKwp,
          totalModules,
          units: validRowsData,
        }),
      });

      if (!res.ok) throw new Error("Falha ao re-simular.");
      
      setReSimProject(null);
      setReSimModulePower("");
      setReSimRows([emptyRow()]);
      setReSimMode('choice');
      
      setProjectEquipments(prev => {
        const next = { ...prev };
        delete next[reSimProject.id];
        return next;
      });
      
      await mutate();
      setSaveMsg("Projeto re-simulado manualmente com sucesso!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setReSimError("Erro ao salvar a re-simulação manual.");
    } finally {
      setReSimLoading(false);
    }
  };

  if (isLoading && !client) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (swrError || error || !client) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-xl border border-border p-12 text-center">
          <p className="text-red-400 font-bold mb-4">{swrError?.message || error || "Cliente não encontrado."}</p>
          <div className="flex justify-center gap-4">
            <Link href="/" className="text-muted-foreground font-bold hover:underline">Ir para Início</Link>
            <Link href="/clientes" className="text-primary font-bold hover:underline">Voltar para Clientes</Link>
          </div>
        </div>
      </div>
    );
  }

  const logDocumentAudit = async (projectId: string, documentType: string, clientName?: string, projectName?: string) => {
    try {
      await fetch('/api/audit/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          documentType,
          clientName,
          projectName: projectName || 'Projeto Solar',
          templateVersion: '2.0.0',
        }),
      });
    } catch (err) {
      console.error('Erro ao registrar auditoria documental:', err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div className="w-full lg:w-auto">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/clientes" className="flex items-center gap-1 text-primary font-bold hover:underline text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Clientes
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground break-words">{client.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-xs">
            <Sparkles className="w-4 h-4" /> Importar Fatura (OCR)
          </button>
          <button
            onClick={() => { setShowNewProjectModal(true); setNewProjectMode('choice'); }}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-bold transition-all shadow-md shadow-primary/20 active:scale-95 text-xs">
            <Zap className="w-4 h-4" /> Novo Projeto
          </button>
          <Button onClick={exportClientExcel}
            className="bg-secondary text-foreground hover:bg-secondary/80 rounded-xl shadow-md active:scale-95 px-4 h-11 text-xs font-bold border border-border">
            <Download className="w-4 h-4 mr-1.5" /> Planilha
          </Button>
        </div>
      </header>

        {/* Dados do cliente */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-foreground">Dados do Cliente</h2>
            {!isEditingClient ? (
              <Button variant="ghost"
                onClick={startEditing}
                className="text-primary hover:bg-primary/10 hover:text-primary font-bold text-sm"
              >
                <Pencil className="w-4 h-4 mr-1.5" /> Editar Dados
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost"
                  onClick={() => setIsEditingClient(false)}
                  className="text-muted-foreground hover:bg-secondary font-bold text-sm"
                >
                  <X className="w-4 h-4 mr-1" /> Cancelar
                </Button>
                <Button 
                  onClick={handleUpdateClient}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-1" /> {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>
          
          {isEditingClient ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Nome Completo</label>
                <Input type="text" value={editClientData.name} onChange={(e) => setEditClientData({...editClientData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">CPF / CNPJ</label>
                <Input type="text" value={editClientData.cpfCnpj} onChange={(e) => setEditClientData({...editClientData, cpfCnpj: formatCpfCnpj(e.target.value)})} placeholder="000.000.000-00 ou 00.000.000/0001-00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Telefone</label>
                <Input type="text" value={editClientData.phone} onChange={(e) => setEditClientData({...editClientData, phone: formatPhone(e.target.value)})} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">E-mail</label>
                <Input type="email" value={editClientData.email} onChange={(e) => setEditClientData({...editClientData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase flex items-center justify-between">
                  <span>CEP</span>
                  {isSearchingCep && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-semibold">
                      <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                    </span>
                  )}
                </label>
                <Input type="text" value={editClientData.cep} onChange={handleEditCepChange} placeholder="00000-000" />
                {cepStatusMsg && (
                  <p className={`text-[10px] mt-0.5 font-medium ${cepStatusMsg.startsWith("✓") ? "text-emerald-400" : cepStatusMsg.startsWith("⚠️") ? "text-amber-400" : "text-muted-foreground"}`}>
                    {cepStatusMsg}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Endereço (Rua, Número)</label>
                <Input type="text" value={editClientData.address} onChange={(e) => setEditClientData({...editClientData, address: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Bairro</label>
                <Input type="text" value={editClientData.neighborhood} onChange={(e) => setEditClientData({...editClientData, neighborhood: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Cidade / UF</label>
                <Input type="text" value={editClientData.city} onChange={(e) => setEditClientData({...editClientData, city: e.target.value})} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground"><FileText className="w-4 h-4 text-primary" /> {client.cpfCnpj || "CPF/CNPJ não informado"}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 text-primary" /> {client.phone || "Telefone não informado"}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 text-primary" /> {client.email || "E-mail não informado"}</p>
              <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 text-primary" /> {client.cep ? `CEP: ${client.cep}` : "CEP não informado"}</p>
              <p className="flex items-center gap-2 text-muted-foreground md:col-span-2"><MapPin className="w-4 h-4 text-primary" /> {[client.address, client.neighborhood, client.city].filter(Boolean).join(', ') || "Endereço não informado"}</p>
            </div>
          )}
        </div>

        {/* Card de Procuração do Cliente */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-black text-foreground">Procuração do Cliente</h2>
                {client.procuracaoUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      ✓ Procuração Anexada
                    </span>
                    {client.procuracaoExpirationDate && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        new Date(client.procuracaoExpirationDate) < new Date()
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : new Date(client.procuracaoExpirationDate).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {new Date(client.procuracaoExpirationDate) < new Date()
                          ? "⚠️ Procuração Expirada"
                          : `Validade: ${new Date(client.procuracaoExpirationDate).toLocaleDateString("pt-BR")}`}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    ⚠️ Sem Procuração Anexada
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground mt-1">
                Anexe a procuração em PDF ou Imagem para acessar o documento de qualquer dispositivo ou local.
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".pdf, .png, .jpg, .jpeg, .docx"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 8 * 1024 * 1024) {
                    alert("O arquivo da procuração deve ter no máximo 8MB.");
                    return;
                  }
                  setIsSaving(true);
                  const reader = new FileReader();
                  reader.onload = async (event) => {
                    try {
                      const dataUrl = event.target?.result as string;
                      const res = await fetch("/api/clients", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, procuracaoUrl: dataUrl, procuracaoName: file.name }),
                      });
                      if (!res.ok) throw new Error("Erro ao salvar procuração");
                      await mutate();
                      setSaveMsg("Procuração atualizada com sucesso!");
                      setTimeout(() => setSaveMsg(""), 3000);
                    } catch {
                      alert("Falha ao enviar o arquivo da procuração.");
                    } finally {
                      setIsSaving(false);
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md h-10 px-4">
                <Upload className="w-4 h-4 mr-1.5" />
                {client.procuracaoUrl ? "Substituir Procuração" : "Anexar Procuração (.PDF)"}
              </Button>
            </div>
          </div>

          {client.procuracaoUrl ? (
            <div className="bg-secondary/30 rounded-xl p-4 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground truncate max-w-md">
                    {client.procuracaoName || "Procuracao_Cliente.pdf"}
                  </p>
                  {client.procuracaoUpdatedAt && (
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Atualizado em: {new Date(client.procuracaoUpdatedAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  onClick={() => {
                    const win = window.open();
                    if (win && client.procuracaoUrl) {
                      win.document.write(`<iframe src="${client.procuracaoUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                    }
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                  title="Abrir procuração em nova aba"
                >
                  <FileText className="w-3.5 h-3.5" /> Visualizar Documento
                </button>

                <a
                  href={client.procuracaoUrl}
                  download={client.procuracaoName || `Procuracao_${client.name.replace(/\s+/g, '_')}.pdf`}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-card hover:bg-secondary text-foreground border border-border px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  title="Baixar cópia da procuração"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Baixar
                </a>

                <button
                  onClick={async () => {
                    if (!confirm("Remover o arquivo da procuração deste cliente?")) return;
                    setIsSaving(true);
                    try {
                      const res = await fetch("/api/clients", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, procuracaoUrl: null, procuracaoName: null }),
                      });
                      if (!res.ok) throw new Error("Erro ao apagar");
                      await mutate();
                      setSaveMsg("Procuração removida.");
                      setTimeout(() => setSaveMsg(""), 3000);
                    } catch {
                      alert("Erro ao remover procuração.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="p-2 text-red-400 bg-red-950/30 hover:bg-red-900/50 rounded-xl transition-colors border border-red-900/30"
                  title="Excluir procuração"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-border rounded-xl bg-secondary/10">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Nenhuma procuração anexada</p>
              <p className="text-xs text-muted-foreground mt-0.5">Faça o upload do documento assinado em formato PDF ou Imagem.</p>
            </div>
          )}
        </div>

        {/* Card de SLA de Homologação junto à Concessionária */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">SLA — Parecer da Concessionária</h2>
                <p className="text-xs text-muted-foreground">Acompanhamento do prazo regulatório ANEEL (15 dias úteis)</p>
              </div>
            </div>
            <SlaCountdownBadge protocolDate={client.protocolDate} targetDays={15} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Data do Protocolo (Envio à Concessionária)
              </label>
              <Input
                type="date"
                defaultValue={client.protocolDate ? new Date(client.protocolDate).toISOString().split("T")[0] : ""}
                onBlur={async (e) => {
                  const dateValue = e.target.value;
                  if (!dateValue) return;
                  setIsSaving(true);
                  try {
                    const res = await fetch("/api/clients", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id, protocolDate: new Date(dateValue).toISOString() }),
                    });
                    if (!res.ok) throw new Error();
                    await mutate();
                    setSaveMsg("Data de protocolo salva com sucesso!");
                    setTimeout(() => setSaveMsg(""), 3000);
                  } catch {
                    alert("Erro ao salvar a data de protocolo.");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="h-10 text-sm font-mono"
              />
              {client.protocolDate && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Protocolado em: {new Date(client.protocolDate).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Concessionária
              </label>
              <Input
                type="text"
                defaultValue={client.concessionaria || ""}
                placeholder="Ex: EDP Espírito Santo"
                onBlur={async (e) => {
                  const value = e.target.value.trim();
                  if (!value) return;
                  setIsSaving(true);
                  try {
                    const res = await fetch("/api/clients", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id, concessionaria: value }),
                    });
                    if (!res.ok) throw new Error();
                    await mutate();
                    setSaveMsg("Concessionária salva!");
                    setTimeout(() => setSaveMsg(""), 3000);
                  } catch {
                    alert("Erro ao salvar a concessionária.");
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="h-10 text-sm"
              />
            </div>
          </div>

          {!client.protocolDate && (
            <div className="mt-4 bg-secondary/20 border border-dashed border-border rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">
                Informe a data em que o projeto foi enviado à concessionária para ativar a contagem regressiva do SLA.
              </p>
            </div>
          )}
        </div>

        {/* Projetos */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-foreground">
              Projetos ({client.projects.length})
            </h2>
            {saveMsg && <div className="bg-emerald-900/20 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-900/50 text-sm font-bold animate-in fade-in duration-300">{saveMsg}</div>}
          </div>

          {client.projects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum projeto vinculado a este cliente.</p>
          ) : (
            <div className="space-y-4">
              {client.projects.map((proj) => {
                const projectState = projectEquipments[proj.id] || {};
                const currentEquip = {
                  ...proj,
                  ...projectState,
                  // Garantir que valores reativos do estado local sobrescrevam os originais
                  totalModules: projectState.totalModules !== undefined ? Number(projectState.totalModules) : proj.totalModules,
                  totalKwp: projectState.totalKwp !== undefined ? Number(projectState.totalKwp) : proj.totalKwp,
                  generationKwh: projectState.generationKwh !== undefined ? Number(projectState.generationKwh) : (proj.generationKwh ?? Math.round(proj.totalKwp * 120))
                };

                return (
                  <div key={proj.id} className="border border-border rounded-xl overflow-hidden shadow-xl hover:shadow-black/50 transition-all">
                    <div className="flex items-center justify-between p-4 bg-card hover:bg-secondary/20 transition-colors text-left">
                      <button onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)}
                        className="flex-grow">
                        <div>
                          <h3 className="font-bold text-foreground text-left text-base md:text-lg">{proj.name || "Projeto sem nome"}</h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1 font-medium"><Calendar className="w-3.5 h-3.5" /> {new Date(proj.createdAt).toLocaleDateString("pt-BR")}</span>
                            <span className="flex items-center gap-1 font-bold text-primary"><Zap className="w-3.5 h-3.5" /> {Number(currentEquip.totalKwp).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp</span>
                            <span className="flex items-center gap-1 font-bold text-primary-foreground/70"><LayoutGrid className="w-3.5 h-3.5" /> {currentEquip.totalModules} módulos</span>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            const kwp = currentEquip.totalKwp || proj.totalKwp || 0;
                            const msg = generateProposalWhatsAppMessage({
                              clientName: client.name,
                              totalKwp: kwp,
                              monthlySavings: Math.round(kwp * 4.0 * 30 * 0.85 * 0.95),
                              proposalUrl: `${window.location.origin}/p/${proj.id}`
                            });
                            openWhatsAppChat({ phone: client.phone || undefined, message: msg });
                          }}
                          className="text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/20"
                          title="Enviar Proposta Comercial deste Projeto via WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Link
                          href={`/proposta?projectId=${proj.id}&clientName=${encodeURIComponent(client.name)}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors flex items-center justify-center border border-primary/20"
                          title="Abrir Proposta Comercial deste Projeto"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const currentEquip = projectEquipments[proj.id] || {};
                              const mergedProject = { ...proj, ...currentEquip };
                              generateMemorialPDF(client, mergedProject);
                              logDocumentAudit(proj.id, 'MEMORIAL_PDF', client.name, proj.name || undefined);
                            } catch (err) {
                              console.error("Erro ao gerar PDF:", err);
                              alert("Ocorreu um erro ao gerar o PDF. Verifique os dados.");
                            }
                          }}
                          className="text-primary bg-primary/10 hover:bg-primary/20"
                          title="Gerar Memorial Descritivo (PDF)"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const currentEquip = projectEquipments[proj.id] || {};
                              const mergedProject = { ...proj, ...currentEquip };
                              generateMemorialDocx(client, mergedProject);
                              logDocumentAudit(proj.id, 'MEMORIAL_DOCX', client.name, proj.name || undefined);
                            } catch (err) {
                              console.error("Erro ao gerar DOCX:", err);
                              alert("Ocorreu um erro ao gerar o Word. Verifique os dados.");
                            }
                          }}
                          className="text-blue-400 bg-blue-950/30 hover:bg-blue-900/50"
                          title="Gerar Memorial Descritivo (Word/DOCX)"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); exportProjectExcel(proj); }}
                          className="text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/50"
                          title="Exportar Planilha Excel"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const currentEquip = projectEquipments[proj.id] || {};
                              const mergedProject = { ...proj, ...currentEquip };
                              generateFormularioAcessoPDF(client, mergedProject);
                              logDocumentAudit(proj.id, 'FORMULARIO_PDF', client.name, proj.name || undefined);
                            } catch (err) {
                              console.error("Erro ao gerar Formulário de Acesso PDF:", err);
                              alert("Ocorreu um erro ao gerar o Formulário em PDF.");
                            }
                          }}
                          className="text-amber-400 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/20"
                          title="Gerar Formulário de Acesso ANEEL / EDP (PDF)"
                        >
                          <Zap className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const currentEquip = projectEquipments[proj.id] || {};
                              const mergedProject = { ...proj, ...currentEquip };
                              generateFormularioAcessoDocx(client, mergedProject);
                              logDocumentAudit(proj.id, 'FORMULARIO_DOCX', client.name, proj.name || undefined);
                            } catch (err) {
                              console.error("Erro ao gerar Formulário de Acesso DOCX:", err);
                              alert("Ocorreu um erro ao gerar o Formulário em Word.");
                            }
                          }}
                          className="text-purple-400 bg-purple-950/30 hover:bg-purple-900/50 border border-purple-500/20"
                          title="Gerar Formulário de Acesso ANEEL / EDP (Word/DOCX)"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setReSimProject(proj); 
                            setReSimModulePower(proj.modulePower); 
                            setReSimError(""); 
                            setReSimMode('choice');
                            setReSimRows((proj.units || []).map(u => ({ 
                              code: u.code, 
                              name: u.name, 
                              kWp: u.requiredKwp, 
                              modules: u.requiredModules 
                            })));
                          }}
                          className="text-amber-400 bg-amber-950/30 hover:bg-amber-900/50"
                          title="Refazer Simulação"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setExpandedProject(expandedProject === proj.id ? null : proj.id)} className="text-muted-foreground">
                          {expandedProject === proj.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>

                    {expandedProject === proj.id && (
                      <div className="border-t border-border p-6 bg-secondary/20">
                        {/* Dados Técnicos do Projeto para Memorial */}
                        <div className="bg-card rounded-2xl p-6 border border-border mb-6 shadow-xl">
                          <h4 className="text-sm font-black text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" /> Dados para o Memorial Descritivo
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Unidade Consumidora (UC)</label>
                              <Input type="text" value={formatUnidadeConsumidora(currentEquip.installationNumber ?? "")} onChange={(e) => handleEquipmentChange(proj.id, 'installationNumber', formatUnidadeConsumidora(e.target.value))} placeholder="0.000.000.000.000-00" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Geração Mensal Estimada (kWh)</label>
                              <Input type="number" value={currentEquip.generationKwh ?? ""} readOnly className="bg-secondary/20 cursor-not-allowed opacity-80" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Percentual de Redução (%)</label>
                              <Input type="number" value={currentEquip.reductionPercent ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'reductionPercent', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Área Total (m²)</label>
                              <Input type="number" value={currentEquip.areaOccupied ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'areaOccupied', e.target.value)} />
                            </div>

                            <div>
                               <label className="block text-xs font-bold text-muted-foreground mb-1 text-primary italic">Valor de Venda (Orçamento R$)</label>
                               <Input 
                                 type="number" 
                                 placeholder="Ex: 35000"
                                 value={currentEquip.estimatedCost ?? ""} 
                                 onChange={(e) => handleEquipmentChange(proj.id, 'estimatedCost', e.target.value)} 
                                 className="border-primary/40 focus:border-primary"
                               />
                             </div>

                             <div className="md:col-span-2 lg:col-span-3">
                               <label className="block text-xs font-bold text-muted-foreground mb-1">Endereço da Instalação (Rua, Nº)</label>
                               <Input type="text" value={currentEquip.address ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'address', e.target.value)} placeholder="Se vazio, usa o endereço do cliente" />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-muted-foreground mb-1">Bairro</label>
                               <Input type="text" value={currentEquip.neighborhood ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'neighborhood', e.target.value)} />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-muted-foreground mb-1">Cidade / UF</label>
                               <Input type="text" value={currentEquip.city ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'city', e.target.value)} />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-muted-foreground mb-1">CEP</label>
                               <Input type="text" value={formatCep(currentEquip.cep ?? "")} onChange={(e) => handleEquipmentChange(proj.id, 'cep', formatCep(e.target.value))} placeholder="00000-000" />
                             </div>

                             <div className="col-span-full border-t border-border my-2"></div>

                            {/* Seleção do Módulo pelo Catálogo */}
                            <div className="md:col-span-2 lg:col-span-4">
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Módulo Fotovoltaico (Catálogo)</label>
                              <select
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={""}
                                onChange={(e) => {
                                  const mod = dbModules?.find(m => m.id === e.target.value);
                                  if (!mod) return;
                                  handleEquipmentChange(proj.id, 'moduleManufacturer', mod.manufacturer);
                                  handleEquipmentChange(proj.id, 'moduleModel', mod.model);
                                  handleEquipmentChange(proj.id, 'modulePower', mod.powerW);
                                  if (mod.currentImp) {
                                    handleEquipmentChange(proj.id, 'moduleCurrent', mod.currentImp);
                                  }
                                }}
                              >
                                <option value="">— Selecionar do catálogo —</option>
                                {(dbModules || []).map(m => (
                                  <option key={m.id} value={m.id}>{m.manufacturer} — {m.model} ({m.powerW}W)</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Fabricante do Módulo</label>
                              <Input type="text" value={currentEquip.moduleManufacturer ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'moduleManufacturer', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Modelo do Módulo</label>
                              <Input type="text" value={currentEquip.moduleModel ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'moduleModel', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Corrente do Módulo (Imp - A)</label>
                              <Input type="number" value={currentEquip.moduleCurrent ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'moduleCurrent', e.target.value)} />
                            </div>

                            <div className="col-span-full border-t border-border my-2"></div>

                            <div className="col-span-full bg-secondary/30 border border-border p-4 rounded-xl mb-2">
                              <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-black text-foreground uppercase tracking-wider">Inversores ({currentEquip.inverters?.length || 0})</span>
                                <Button
                                  type="button"
                                  onClick={() => addInverterRow(proj.id)}
                                  variant="outline"
                                  className="h-8 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
                                >
                                  + Adicionar Inversor
                                </Button>
                              </div>

                              {(!currentEquip.inverters || currentEquip.inverters.length === 0) ? (
                                <p className="text-xs text-muted-foreground text-center py-2">Nenhum inversor adicionado.</p>
                              ) : (
                                  <div className="space-y-4">
                                   {currentEquip.inverters.map((inv: Inverter, idx: number) => (
                                    <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-xl relative space-y-3">
                                       {/* ── Seleção rápida pelo catálogo ── */}
                                       <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                                         <span className="text-xs font-black text-primary uppercase tracking-wider whitespace-nowrap">📦 Catálogo</span>
                                         <select
                                           className="flex-1 h-8 rounded-md border border-primary/30 bg-card px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                                           value={""}
                                           onChange={(e) => {
                                             const catalogInv = dbInverters?.find(i => i.id === e.target.value);
                                             if (!catalogInv) return;
                                             handleInverterChange(proj.id, idx, 'manufacturer', catalogInv.manufacturer);
                                             handleInverterChange(proj.id, idx, 'model', catalogInv.model);
                                             handleInverterChange(proj.id, idx, 'outputPower', catalogInv.powerW / 1000);
                                             if (catalogInv.numMppts) handleInverterChange(proj.id, idx, 'numMppts', catalogInv.numMppts);
                                           }}
                                         >
                                           <option value="">— Selecionar inversor do catálogo —</option>
                                           {(dbInverters || []).map(i => (
                                             <option key={i.id} value={i.id}>{i.manufacturer} — {i.model} ({i.powerW}W)</option>
                                           ))}
                                         </select>
                                       </div>

                                       {/* ── Campos técnicos editáveis ── */}
                                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                                         <div>
                                           <label className="block text-xs font-bold text-muted-foreground mb-1">Fabricante</label>
                                           <Input type="text" value={inv.manufacturer || ""} onChange={(e) => handleInverterChange(proj.id, idx, 'manufacturer', e.target.value)} className="h-9 text-xs" />
                                         </div>
                                         <div>
                                           <label className="block text-xs font-bold text-muted-foreground mb-1">Modelo</label>
                                           <Input type="text" value={inv.model || ""} onChange={(e) => handleInverterChange(proj.id, idx, 'model', e.target.value)} className="h-9 text-xs" />
                                         </div>
                                         <div>
                                           <label className="block text-xs font-bold text-muted-foreground mb-1">Potência Saída (kW)</label>
                                           <Input type="number" value={inv.outputPower ?? ""} onChange={(e) => handleInverterChange(proj.id, idx, 'outputPower', e.target.value)} className="h-9 text-xs" />
                                         </div>
                                         <div>
                                           <label className="block text-xs font-bold text-muted-foreground mb-1">Corrente Saída (A)</label>
                                           <Input type="number" value={inv.outputCurrent ?? ""} onChange={(e) => handleInverterChange(proj.id, idx, 'outputCurrent', e.target.value)} className="h-9 text-xs" />
                                         </div>
                                         <div>
                                           <label className="block text-xs font-bold text-muted-foreground mb-1">Nº MPPTs</label>
                                           <Input type="number" min={1} value={inv.numMppts ?? 1} onChange={(e) => handleInverterChange(proj.id, idx, 'numMppts', e.target.value)} className="h-9 text-xs" />
                                         </div>
                                         <div className="bg-secondary/50 p-2 rounded-lg border border-border">
                                           <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-tight">Entradas por MPPT</label>
                                           <div className="flex flex-wrap gap-2">
                                             {Array.from({ length: Number(inv.numMppts || 1) }).map((_, mIdx) => {
                                               const currentInputs = (inv.mpptInputs || "").split(",").map(n => Number(n) || 1);
                                               if (currentInputs.length !== Number(inv.numMppts || 1)) {
                                                 while (currentInputs.length < Number(inv.numMppts || 1)) currentInputs.push(1);
                                               }
                                               return (
                                                 <div key={mIdx} className="flex items-center gap-1">
                                                   <span className="text-[10px] text-muted-foreground">M{mIdx+1}:</span>
                                                   <Input
                                                     type="number"
                                                     min={1}
                                                     value={currentInputs[mIdx] || 1}
                                                     onChange={(e) => {
                                                       const newVal = Number(e.target.value) || 1;
                                                       const newInputs = [...currentInputs];
                                                       newInputs[mIdx] = newVal;
                                                       handleInverterChange(proj.id, idx, 'mpptInputs', newInputs.join(","));
                                                     }}
                                                     className="h-7 w-10 text-[10px] px-1 text-center"
                                                   />
                                                 </div>
                                               );
                                             })}
                                           </div>
                                         </div>
                                       </div>

                                       {/* ── Quantidade e exclusão ── */}
                                       <div className="flex gap-2 items-center">
                                         <div className="w-20">
                                           <label className="block text-xs font-bold text-muted-foreground mb-1">Qtd</label>
                                           <Input type="number" value={inv.quantity ?? 1} onChange={(e) => handleInverterChange(proj.id, idx, 'quantity', e.target.value)} className="h-9 text-xs" />
                                         </div>
                                         <Button
                                           type="button"
                                           onClick={() => removeInverterRow(proj.id, idx)}
                                           variant="ghost"
                                           size="icon"
                                           className="text-red-500 hover:bg-red-900/10 hover:text-red-400 h-9 w-9 mt-5"
                                           title="Remover Inversor"
                                         >
                                           <Trash2 className="w-4 h-4" />
                                         </Button>
                                       </div>

                                      {/* Arranjo de Painéis Editável para este inversor */}
                                      <div className="bg-secondary/30 p-4 rounded-xl border border-border text-xs text-foreground">
                                        <p className="font-black text-foreground mb-2">Arranjo de Painéis por Entrada (Editável):</p>
                                        {(() => {
                                          const mpptsCount = Number(inv.numMppts || 1);
                                          const mpptInputsArray = (inv.mpptInputs || "").split(",").map(n => Number(n) || 1);
                                          const normalizedInputs = Array.from({ length: mpptsCount }).map((_, i) => mpptInputsArray[i] || 1);
                                          const totalEntries = normalizedInputs.reduce((a, b) => a + b, 0);
                                          const totalInverterModules = proj.totalModules;
                                          const defaultModulesPerEntry = Math.floor(totalInverterModules / totalEntries);

                                          // Converte o stringLayout em array ou inicializa o padrão
                                          let currentModulesArray: number[] = [];
                                          if (inv.stringLayout) {
                                            currentModulesArray = inv.stringLayout.split(",").map(n => Number(n) || 0);
                                          } else {
                                            currentModulesArray = Array.from({ length: totalEntries }).map(() => defaultModulesPerEntry);
                                          }

                                          // Ajusta o array se o número de entradas mudou
                                          if (currentModulesArray.length !== totalEntries) {
                                            if (currentModulesArray.length < totalEntries) {
                                              while (currentModulesArray.length < totalEntries) {
                                                currentModulesArray.push(defaultModulesPerEntry);
                                              }
                                            } else {
                                              currentModulesArray = currentModulesArray.slice(0, totalEntries);
                                            }
                                          }
                                          
                                          if (totalEntries <= 0) {
                                            return <span>Adicione módulos ao projeto para ver o arranjo.</span>;
                                          }

                                          return (
                                            <div className="space-y-3">
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                {currentModulesArray.map((modCount, i) => (
                                                  <div key={i} className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-lg border border-border">
                                                    <span>✓ 01 string com</span>
                                                    <Input
                                                      type="number"
                                                      value={modCount || ""}
                                                      onChange={(e) => {
                                                        const newVal = e.target.value ? Number(e.target.value) : 0;
                                                        const newArr = [...currentModulesArray];
                                                        newArr[i] = newVal;
                                                        handleInverterChange(proj.id, idx, "stringLayout", newArr.join(","));
                                                      }}
                                                      className="w-16 h-8 text-xs text-center font-mono p-1 border-border bg-background text-foreground"
                                                    />
                                                    <span>módulos em série ligada à entrada <strong>{String(i + 1).padStart(2, "0")}</strong></span>
                                                  </div>
                                                ))}
                                              </div>
                                              <p className="mt-2 text-muted-foreground font-medium">
                                                Total de entradas: {totalEntries} | Total de módulos somados neste inversor: {currentModulesArray.reduce((acc, c) => acc + c, 0)}
                                              </p>
                                            </div>
                                          );
                                        })()}
                                      </div>

                                    </div>
                                   ))}
                                  </div>
                              )}
                            </div>

                            <div className="col-span-full border-t border-border my-2"></div>

                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Nome do Resp. Técnico</label>
                              <Input type="text" value={currentEquip.professionalName ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'professionalName', e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-muted-foreground mb-1">Registro Profissional (CRT/CREA)</label>
                              <Input type="text" value={currentEquip.professionalCrt ?? ""} onChange={(e) => handleEquipmentChange(proj.id, 'professionalCrt', e.target.value)} />
                            </div>
                          </div>
                          
                          <Button onClick={() => saveProjectEquipment(proj.id, currentEquip)} disabled={isSaving}
                            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50 h-12 px-8">
                            <Save className="w-4 h-4 mr-2" /> {isSaving ? "Salvando..." : "Salvar Todos os Dados Técnicos"}
                          </Button>
                        </div>

                        {/* ── Central de Documentos para Homologação na Concessionária ── */}
                        <div className="bg-card rounded-2xl p-6 border border-border mb-6 shadow-xl">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border/60">
                            <div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <h4 className="text-base font-black text-foreground">
                                  Documentos para Homologação na Concessionária
                                </h4>
                              </div>
                              <p className="text-xs font-medium text-muted-foreground mt-1">
                                Checklist de conformidade e documentos para protocolo junto à distribuidora de energia.
                              </p>
                            </div>

                            {/* Barra de Progresso de Homologação */}
                            {(() => {
                              const hasMemorial = Boolean(proj.memorialAssinadoUrl);
                              const hasProcuracao = Boolean(client.procuracaoUrl);
                              const hasArt = Boolean(proj.artUrl);
                              const hasCert = Boolean(proj.certInversorUrl);
                              const docsCount = [hasMemorial, hasProcuracao, hasArt, hasCert].filter(Boolean).length;
                              const pct = Math.round((docsCount / 4) * 100);

                              return (
                                <div className="w-full sm:w-64 bg-secondary/50 p-3 rounded-xl border border-border">
                                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                                    <span className="text-muted-foreground">Status Homologação</span>
                                    <span className={docsCount === 4 ? "text-emerald-400" : "text-primary"}>
                                      {docsCount}/4 Anexados ({pct}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border border-border">
                                    <div
                                      className={`h-full transition-all duration-500 rounded-full ${
                                        docsCount === 4 ? "bg-emerald-500" : docsCount > 0 ? "bg-primary" : "bg-muted-foreground/30"
                                      }`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Grid dos 4 Documentos de Homologação */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Doc 1: Memorial Descritivo Assinado */}
                            <div className="bg-secondary/20 rounded-xl p-4 border border-border flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-primary" /> 1. Memorial Assinado
                                  </h5>
                                  {proj.memorialAssinadoUrl ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      ✓ Anexado
                                    </span>
                                  ) : (
                                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                      ⚠️ Pendente
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3 font-medium">
                                  {proj.memorialAssinadoName ? `Arquivo: ${proj.memorialAssinadoName}` : "Gere o memorial e faça upload da cópia assinada pelo cliente/engenheiro."}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept=".pdf, .png, .jpg, .jpeg"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      if (file.size > 8 * 1024 * 1024) { alert("Arquivo deve ser menor que 8MB"); return; }
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        await saveProjectEquipment(proj.id, {
                                          ...currentEquip,
                                          memorialAssinadoUrl: ev.target?.result as string,
                                          memorialAssinadoName: file.name
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                  />
                                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10">
                                    <Upload className="w-3.5 h-3.5 mr-1" /> {proj.memorialAssinadoUrl ? "Substituir Assinado" : "Anexar Assinado"}
                                  </Button>
                                </div>

                                {proj.memorialAssinadoUrl && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const win = window.open();
                                        if (win && proj.memorialAssinadoUrl) win.document.write(`<iframe src="${proj.memorialAssinadoUrl}" frameborder="0" style="border:0; top:0px; left:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                      }}
                                      className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg text-xs font-bold"
                                      title="Visualizar Memorial Assinado"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <a
                                      href={proj.memorialAssinadoUrl}
                                      download={proj.memorialAssinadoName || "Memorial_Assinado.pdf"}
                                      className="p-1.5 text-foreground bg-card hover:bg-secondary border border-border rounded-lg text-xs font-bold"
                                      title="Baixar Memorial Assinado"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => saveProjectEquipment(proj.id, { ...currentEquip, memorialAssinadoUrl: null, memorialAssinadoName: null })}
                                      className="p-1.5 text-red-400 bg-red-950/30 hover:bg-red-900/50 rounded-lg text-xs"
                                      title="Remover"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Doc 2: Procuração do Cliente */}
                            <div className="bg-secondary/20 rounded-xl p-4 border border-border flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-primary" /> 2. Procuração do Cliente
                                  </h5>
                                  {client.procuracaoUrl ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      ✓ Anexado
                                    </span>
                                  ) : (
                                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                      ⚠️ Pendente
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3 font-medium">
                                  {client.procuracaoUrl ? `Arquivo: ${client.procuracaoName || 'Procuracao_Cliente.pdf'}` : "Documento de procuração outorgado no cadastro do cliente."}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                                {client.procuracaoUrl ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        const win = window.open();
                                        if (win && client.procuracaoUrl) win.document.write(`<iframe src="${client.procuracaoUrl}" frameborder="0" style="border:0; top:0px; left:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                      }}
                                      className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-lg text-xs font-bold"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Visualizar Procuração
                                    </button>
                                    <a
                                      href={client.procuracaoUrl}
                                      download={client.procuracaoName || "Procuracao_Cliente.pdf"}
                                      className="p-1.5 text-foreground bg-card hover:bg-secondary border border-border rounded-lg text-xs font-bold"
                                      title="Baixar Procuração"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </>
                                ) : (
                                  <p className="text-[11px] text-amber-400 font-bold">
                                    💡 Anexe a procuração no card de Procuração do Cliente acima.
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Doc 3: ART / TRT (Responsável Técnico) */}
                            <div className="bg-secondary/20 rounded-xl p-4 border border-border flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-primary" /> 3. ART / TRT
                                  </h5>
                                  {proj.artUrl ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      ✓ Anexado
                                    </span>
                                  ) : (
                                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                      ⚠️ Pendente
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3 font-medium">
                                  {proj.artName ? `Arquivo: ${proj.artName}` : "Anotação de Responsabilidade Técnica emitida pelo engenheiro/técnico."}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept=".pdf, .png, .jpg, .jpeg"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      if (file.size > 8 * 1024 * 1024) { alert("Arquivo deve ser menor que 8MB"); return; }
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        await saveProjectEquipment(proj.id, {
                                          ...currentEquip,
                                          artUrl: ev.target?.result as string,
                                          artName: file.name
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                  />
                                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10">
                                    <Upload className="w-3.5 h-3.5 mr-1" /> {proj.artUrl ? "Substituir ART" : "Anexar ART (.PDF)"}
                                  </Button>
                                </div>

                                {proj.artUrl && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const win = window.open();
                                        if (win && proj.artUrl) win.document.write(`<iframe src="${proj.artUrl}" frameborder="0" style="border:0; top:0px; left:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                      }}
                                      className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg text-xs font-bold"
                                      title="Visualizar ART"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <a
                                      href={proj.artUrl}
                                      download={proj.artName || "ART_TRT.pdf"}
                                      className="p-1.5 text-foreground bg-card hover:bg-secondary border border-border rounded-lg text-xs font-bold"
                                      title="Baixar ART"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => saveProjectEquipment(proj.id, { ...currentEquip, artUrl: null, artName: null })}
                                      className="p-1.5 text-red-400 bg-red-950/30 hover:bg-red-900/50 rounded-lg text-xs"
                                      title="Remover ART"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Doc 4: Certificado do Inversor */}
                            <div className="bg-secondary/20 rounded-xl p-4 border border-border flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <h5 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-primary" /> 4. Certificado do Inversor
                                  </h5>
                                  {proj.certInversorUrl ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                                      ✓ Anexado
                                    </span>
                                  ) : (
                                    <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                      ⚠️ Pendente
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3 font-medium">
                                  {proj.certInversorName ? `Arquivo: ${proj.certInversorName}` : "Certificado de Conformidade e ensaios Inmetro do fabricante."}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept=".pdf, .png, .jpg, .jpeg"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      if (file.size > 8 * 1024 * 1024) { alert("Arquivo deve ser menor que 8MB"); return; }
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        await saveProjectEquipment(proj.id, {
                                          ...currentEquip,
                                          certInversorUrl: ev.target?.result as string,
                                          certInversorName: file.name
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                  />
                                  <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10">
                                    <Upload className="w-3.5 h-3.5 mr-1" /> {proj.certInversorUrl ? "Substituir Certificado" : "Anexar Certificado (.PDF)"}
                                  </Button>
                                </div>

                                {proj.certInversorUrl && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const win = window.open();
                                        if (win && proj.certInversorUrl) win.document.write(`<iframe src="${proj.certInversorUrl}" frameborder="0" style="border:0; top:0px; left:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                      }}
                                      className="p-1.5 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg text-xs font-bold"
                                      title="Visualizar Certificado"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <a
                                      href={proj.certInversorUrl}
                                      download={proj.certInversorName || "Certificado_Inversor.pdf"}
                                      className="p-1.5 text-foreground bg-card hover:bg-secondary border border-border rounded-lg text-xs font-bold"
                                      title="Baixar Certificado"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                    <button
                                      onClick={() => saveProjectEquipment(proj.id, { ...currentEquip, certInversorUrl: null, certInversorName: null })}
                                      className="p-1.5 text-red-400 bg-red-950/30 hover:bg-red-900/50 rounded-lg text-xs"
                                      title="Remover Certificado"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-card rounded-xl p-3 border border-border text-center shadow-xl">
                            <div className="text-xs text-muted-foreground uppercase font-black">Módulo Base</div>
                            <div className="text-lg font-bold text-foreground">{currentEquip.modulePower}W</div>
                          </div>
                          <div className="bg-card rounded-xl p-3 border border-border text-center shadow-xl">
                            <div className="text-xs text-muted-foreground uppercase font-black">kWp Total</div>
                            <div className="text-lg font-bold text-primary">{Number(currentEquip.totalKwp).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</div>
                          </div>
                          <div className="bg-card rounded-xl p-3 border border-border text-center shadow-xl flex flex-col justify-between">
                            <div className="text-xs text-muted-foreground uppercase font-black">Qtd Módulos</div>
                            <div className="mt-1 flex justify-center">
                              <Input 
                                type="number" 
                                min={1}
                                value={currentEquip.totalModules ?? ""} 
                                onChange={(e) => handleEquipmentChange(proj.id, 'totalModules', e.target.value)} 
                                className="h-8 w-20 text-center font-bold text-primary text-lg"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xl">
                          <Table>
                            <TableHeader className="bg-secondary/30">
                              <TableRow className="border-border">
                                <TableHead className="font-black text-muted-foreground uppercase tracking-wider">Unidade Consumidora</TableHead>
                                <TableHead className="font-black text-muted-foreground uppercase tracking-wider">Unidade</TableHead>
                                <TableHead className="font-black text-muted-foreground uppercase tracking-wider text-right">Média (kWh)</TableHead>
                                <TableHead className="font-black text-primary uppercase tracking-wider text-right">kWp</TableHead>
                                <TableHead className="font-black text-primary uppercase tracking-wider text-right">Módulos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(currentEquip.units || []).map((u: any, i: number) => (
                                <TableRow key={i} className="hover:bg-secondary/10 border-border">
                                  <TableCell className="text-foreground font-medium py-3">{formatUnidadeConsumidora(u.code)}</TableCell>
                                  <TableCell className="text-muted-foreground py-3">{u.name}</TableCell>
                                  <TableCell className="text-muted-foreground text-right font-mono py-3">{Number(u.monthlyCons).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-primary font-bold text-right font-mono py-3">{Number(u.requiredKwp).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-primary font-black text-right py-3 flex justify-end">
                                    <Input 
                                      type="number" 
                                      min={1}
                                      value={u.requiredModules ?? ""} 
                                      onChange={(e) => handleUnitChange(proj.id, i, 'requiredModules', e.target.value)} 
                                      className="h-8 w-16 text-center font-bold text-primary"
                                    />
                                  </TableCell>
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
      {/* Modal de Novo Projeto */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-border">

            {/* Header */}
            <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Zap className="w-5 h-5" /> Novo Projeto para {client.name}
              </h2>
              <button onClick={resetManualModal} className="text-primary-foreground/80 hover:text-primary-foreground text-2xl font-bold">&times;</button>
            </div>

            {/* Escolha do modo */}
            {newProjectMode === 'choice' && (
              <div className="p-8 flex flex-col gap-4">
                <p className="text-muted-foreground text-sm text-center mb-2 font-bold">Como deseja criar o novo projeto?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opção 1: Planilha */}
                  <Link
                    href={`/simulador?clientId=${id}`}
                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-secondary/30 transition-all cursor-pointer"
                  >
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Upload className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-foreground mb-1">Importar Planilha</p>
                      <p className="text-xs text-muted-foreground font-medium">Calcule automaticamente o dimensionamento a partir de uma planilha de consumo (.xlsx)</p>
                    </div>
                  </Link>

                  {/* Opção 2: Manual */}
                  <button
                    onClick={() => setNewProjectMode('manual')}
                    className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border hover:border-primary hover:bg-secondary/30 transition-all cursor-pointer text-left"
                  >
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Pencil className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-foreground mb-1">Entrada Manual</p>
                      <p className="text-xs text-muted-foreground font-medium">Informe diretamente o kWp e a quantidade de módulos de cada unidade do projeto</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Formulário manual */}
            {newProjectMode === 'manual' && (
              <div className="flex flex-col overflow-hidden">
                {/* Campos de cabeçalho do projeto */}
                <div className="p-6 border-b border-border flex-shrink-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nome do Projeto *</label>
                      <Input
                        type="text"
                        value={manualProjectName}
                        onChange={e => setManualProjectName(e.target.value)}
                        placeholder="Ex: Residência Solar 2025"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Potência do Módulo (W) *</label>
                      <Input
                        type="number"
                        value={manualModulePower}
                        onChange={e => setManualModulePower(e.target.value ? Number(e.target.value) : "")}
                        placeholder="Ex: 550"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Tabela de unidades — scroll independente */}
                <div className="overflow-y-auto flex-1 p-6">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Unidades do Projeto</p>
                    <button
                      onClick={() => setManualRows(prev => [...prev, emptyRow()])}
                      className="text-xs font-black text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + Adicionar Linha
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 border-b border-border">
                        <tr>
                          <th className="text-left px-3 py-2.5 text-xs font-black text-muted-foreground uppercase w-48">Unidade Consumidora</th>
                          <th className="text-left px-3 py-2.5 text-xs font-black text-muted-foreground uppercase">Unidade / Nome</th>
                          <th className="text-center px-3 py-2.5 text-xs font-black text-muted-foreground uppercase w-28">kWp</th>
                          <th className="text-center px-3 py-2.5 text-xs font-black text-muted-foreground uppercase w-24">Módulos</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {manualRows.map((row, idx) => (
                          <tr key={idx} className="bg-card hover:bg-secondary/30">
                            <td className="px-2 py-2">
                              <Input
                                type="text"
                                value={formatUnidadeConsumidora(row.code)}
                                onChange={e => updateManualRow(idx, 'code', formatUnidadeConsumidora(e.target.value))}
                                placeholder="0.000.000.000.000-00"
                                className="h-9 text-xs font-mono"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="text"
                                value={row.name}
                                onChange={e => updateManualRow(idx, 'name', e.target.value)}
                                placeholder="Nome da Unidade"
                                className="h-9 text-xs"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="text"
                                value={row.modules ? ((Number(row.modules) * (Number(manualModulePower) || 0)) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                                readOnly
                                className="h-9 text-xs font-mono text-center bg-secondary/30 border-border text-muted-foreground"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                type="number"
                                value={row.modules}
                                onChange={e => updateManualRow(idx, 'modules', e.target.value ? Number(e.target.value) : "")}
                                placeholder="0"
                                className="h-9 text-xs font-mono text-center"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => setManualRows(prev => prev.filter((_, i) => i !== idx))}
                                disabled={manualRows.length === 1}
                                className="text-red-400 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed p-1 rounded transition-colors"
                                title="Remover linha"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {manualRows.some(r => Number(r.modules) > 0) && (
                        <tfoot className="bg-secondary/50 border-t-2 border-border">
                          <tr>
                            <td colSpan={2} className="px-3 py-2.5 text-xs font-black text-muted-foreground uppercase">Total</td>
                            <td className="px-3 py-2.5 text-center text-sm font-black text-primary font-mono">
                              {(manualRows.reduce((acc, r) => acc + (Number(r.modules) || 0), 0) * (Number(manualModulePower) || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                            </td>
                            <td className="px-3 py-2.5 text-center text-sm font-black text-primary font-mono">
                              {manualRows.reduce((acc, r) => acc + (Number(r.modules) || 0), 0)} un.
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {manualError && (
                    <div className="mt-4 bg-red-900/10 border border-red-900/50 text-red-500 text-sm font-bold p-3 rounded-xl">
                      {manualError}
                    </div>
                  )}
                </div>

                {/* Rodapé com botões */}
                <div className="p-6 border-t border-border flex justify-between items-center flex-shrink-0 bg-card">
                  <button
                    onClick={() => setNewProjectMode('choice')}
                    className="text-sm text-muted-foreground hover:text-foreground font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={resetManualModal} className="rounded-xl h-11 px-6">
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveManualProject}
                      disabled={manualSaving}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xl shadow-primary/20 h-11 px-8 font-black disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {manualSaving ? "Salvando..." : "Salvar Projeto"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal de Re-Simulação */}
      {reSimProject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${reSimMode === 'manual' ? 'w-full max-w-4xl' : 'w-full max-w-lg'}`}>
            <div className="bg-primary p-6 text-primary-foreground flex justify-between items-center flex-shrink-0">
              <h2 className="text-xl font-black flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Refazer Simulação: {reSimProject.name}
              </h2>
              <button onClick={() => { setReSimProject(null); setReSimModulePower(""); setReSimError(""); }} className="text-white/80 hover:text-white text-2xl font-bold">&times;</button>
            </div>
            
            <div className="overflow-y-auto flex-grow p-6">
              {reSimMode === 'choice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <button 
                    onClick={() => setReSimMode('excel')}
                    className="group bg-card hover:bg-primary/5 border-2 border-border hover:border-primary/50 p-8 rounded-3xl transition-all flex flex-col items-center gap-4 text-center shadow-lg hover:shadow-primary/10"
                  >
                    <div className="bg-primary/10 group-hover:bg-primary/20 p-5 rounded-2xl transition-colors">
                      <Upload className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">Importar Planilha</h3>
                      <p className="text-sm text-muted-foreground mt-2">Atualizar consumo através de arquivo Excel (.xlsx)</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setReSimMode('manual')}
                    className="group bg-card hover:bg-primary/5 border-2 border-border hover:border-primary/50 p-8 rounded-3xl transition-all flex flex-col items-center gap-4 text-center shadow-lg hover:shadow-primary/10"
                  >
                    <div className="bg-primary/10 group-hover:bg-primary/20 p-5 rounded-2xl transition-colors">
                      <Pencil className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">Inserir Manualmente</h3>
                      <p className="text-sm text-muted-foreground mt-2">Editar unidades e quantidades de módulos manualmente</p>
                    </div>
                  </button>
                </div>
              )}

              {(reSimMode === 'excel' || reSimMode === 'manual') && (
                <div className="space-y-6">
                  <div className="bg-secondary/20 p-4 rounded-2xl border border-border">
                    <label className="block text-xs font-black text-muted-foreground mb-1.5 uppercase">Potência do Módulo (W)</label>
                    <Input
                      type="number"
                      value={reSimModulePower}
                      onChange={(e) => setReSimModulePower(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Ex: 700"
                      className="font-bold text-lg h-12"
                    />
                  </div>

                  {reSimMode === 'excel' ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-bold text-muted-foreground mb-1">Nova Planilha de Consumo (.xlsx)</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleReSimFile}
                          disabled={reSimLoading}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className={`w-full p-12 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 font-medium transition-all ${reSimLoading ? "border-primary/20 bg-primary/5 text-primary/40" : "border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"}`}>
                          <Upload className={`w-12 h-12 ${reSimLoading ? "animate-bounce" : ""}`} />
                          <div className="text-center">
                            <span className="text-lg font-black">Selecionar Arquivo Excel</span>
                            <p className="text-sm opacity-70">Clique ou arraste o arquivo aqui</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Unidades do Projeto</h3>
                        <Button 
                          onClick={() => setReSimRows(prev => [...prev, emptyRow()])}
                          variant="outline"
                          size="sm"
                          className="rounded-lg font-bold border-primary text-primary hover:bg-primary/10"
                        >
                          + Adicionar Unidade
                        </Button>
                      </div>

                      <div className="border border-border rounded-2xl overflow-hidden shadow-inner">
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-secondary/50 border-b border-border">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-black text-muted-foreground uppercase">UC</th>
                              <th className="text-left px-3 py-2 text-xs font-black text-muted-foreground uppercase">Unidade</th>
                              <th className="text-center px-3 py-2 text-xs font-black text-muted-foreground uppercase w-28">kWp</th>
                              <th className="text-center px-3 py-2 text-xs font-black text-muted-foreground uppercase w-24">Módulos</th>
                              <th className="w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {reSimRows.map((row, idx) => (
                              <tr key={idx} className="bg-card hover:bg-secondary/10 transition-colors">
                                <td className="p-2">
                                  <Input 
                                    value={formatUnidadeConsumidora(row.code)}
                                    onChange={e => updateReSimRow(idx, 'code', formatUnidadeConsumidora(e.target.value))}
                                    className="h-9 text-xs font-mono"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input 
                                    value={row.name}
                                    onChange={e => updateReSimRow(idx, 'name', e.target.value)}
                                    className="h-9 text-xs"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input 
                                    value={row.modules ? ((Number(row.modules) * (Number(reSimModulePower) || 0)) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                                    readOnly
                                    className="h-9 text-xs font-mono text-center bg-secondary/30"
                                  />
                                </td>
                                <td className="p-2">
                                  <Input 
                                    type="number"
                                    value={row.modules}
                                    onChange={e => updateReSimRow(idx, 'modules', e.target.value ? Number(e.target.value) : "")}
                                    className="h-9 text-xs font-mono text-center"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button onClick={() => setReSimRows(prev => prev.filter((_, i) => i !== idx))} disabled={reSimRows.length === 1}>
                                    <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {reSimError && (
                    <div className="bg-red-900/10 border border-red-900/50 text-red-500 text-sm font-bold p-4 rounded-2xl">
                      {reSimError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-between items-center bg-card flex-shrink-0">
              {reSimMode !== 'choice' ? (
                <button 
                  onClick={() => setReSimMode('choice')}
                  className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              ) : <div></div>}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setReSimProject(null); setReSimModulePower(""); setReSimError(""); }} className="rounded-xl h-11 px-6">
                  Cancelar
                </Button>
                {reSimMode === 'manual' && (
                  <Button 
                    onClick={handleReSimManual} 
                    disabled={reSimLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl h-11 px-8 shadow-xl shadow-primary/20"
                  >
                    {reSimLoading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura Eletrônica */}
      <SignatureCanvasModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Assinatura Eletrônica do Cliente"
        subtitle={`Coletando assinatura de ${client?.name || "cliente"}`}
        onConfirm={async (signatureDataUrl: string) => {
          setIsSaving(true);
          try {
            const res = await fetch("/api/clients", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, signatureUrl: signatureDataUrl }),
            });
            if (!res.ok) throw new Error("Erro ao salvar assinatura.");
            await mutate();
            setSaveMsg("✅ Assinatura digital coletada e salva com sucesso!");
            setTimeout(() => setSaveMsg(""), 4000);
          } catch {
            alert("Erro ao salvar a assinatura. Tente novamente.");
          } finally {
            setIsSaving(false);
          }
        }}
      />

      {/* Modal de Leitor Inteligente de Faturas (OCR) */}
      <FaturaOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onApply={handleApplyOcrData}
      />

    </div>
  );
}
