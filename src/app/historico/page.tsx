"use client";

import React from "react";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/utils/fetcher";
import { ArrowLeft, Calendar, Zap, LayoutGrid, Sun, Download, Trash2, Users, Home } from "lucide-react";
import * as XLSX from "xlsx";

import { Project } from "@/types";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Historico() {
  const { data: projects, error: swrError, isLoading, mutate } = useSWR<Project[]>("/api/calculations", fetcher);

  const exportToExcel = (project: Project) => {
    const projName = project.name || "Projeto_Salvo";
    const client = project.client;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportData: any[][] = [
      ["RELATÓRIO DE DIMENSIONAMENTO FOTOVOLTAICO"],
      [],
      ["1. DADOS DO CLIENTE"],
      ["Nome:", client?.name || "Não informado"],
      ["CPF/CNPJ:", client?.cpfCnpj || "-"],
      ["Telefone:", client?.phone || "-"],
      ["E-mail:", client?.email || "-"],
      ["Endereço:", client?.address || "-"],
      [],
      ["2. EQUIPAMENTOS SUGERIDOS"],
      ["Modelo do Módulo:", project.moduleModel || "Não definido"],
      ["Modelo do Inversor:", project.inverterModel || "Não definido"],
      ["Potência do Módulo Base:", `${project.modulePower} W`],
      [],
      ["3. RESUMO DO PROJETO"],
      ["Nome do Projeto:", projName],
      ["Data de Criação:", new Date(project.createdAt).toLocaleDateString("pt-BR")],
      ["Potência Total Necessária:", `${project.totalKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`],
      ["Quantidade de Módulos:", `${project.totalModules} unid.`],
      [],
      ["4. DETALHAMENTO POR UNIDADE"],
      ["Código de Instalação", "Nome da Unidade", "Média Mensal (kWh)", "Consumo Diário (kWh/dia)", "kWp Necessário", "Qtd. Módulos"]
    ];

    // Captura o índice da 1ª linha de dados (base-0) ANTES de inserir as unidades
    const dataStartRow = exportData.length;

    project.units.forEach(u => {
      exportData.push([
        u.code, 
        u.name, 
        u.monthlyCons, 
        u.dailyCons, 
        u.requiredKwp, 
        u.requiredModules
      ]);
    });

    exportData.push([
      "TOTAL CONSOLIDADO", 
      "-", 
      project.units.reduce((acc, u) => acc + u.monthlyCons, 0),
      project.units.reduce((acc, u) => acc + u.dailyCons, 0),
      project.totalKwp,
      project.totalModules
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    
    // Ajuste de largura das colunas
    worksheet["!cols"] = [
      { wch: 25 }, // Código
      { wch: 45 }, // Nome
      { wch: 20 }, // Média
      { wch: 22 }, // Diário
      { wch: 20 }, // kWp
      { wch: 15 }  // Módulos
    ];
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:F1");
    
    // Formatação de números — linha de início calculada dinamicamente
    // dataStartRow foi capturado antes do forEach, portanto aponta para a 1ª linha de dados
    for (let R = dataStartRow; R <= range.e.r; ++R) {
      for (let C = 2; C <= 4; ++C) {
        const cell_ref = XLSX.utils.encode_cell({c:C, r:R});
        if(worksheet[cell_ref]) worksheet[cell_ref].z = "#,##0.00";
      }
      const cell_ref_F = XLSX.utils.encode_cell({c:5, r:R});
      if(worksheet[cell_ref_F]) worksheet[cell_ref_F].z = "#,##0";
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dimensionamento");
    
    const fileName = projName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(workbook, `Projeto_${fileName}.xlsx`);
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este projeto do histórico?")) return;
    
    try {
      const res = await fetch(`/api/calculations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro ao deletar");
      
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Não foi possível deletar o projeto.");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <HistoryIcon className="w-4 h-4" /> Histórico de Simulações
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Projetos Salvos</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Consulte todos os seus dimensionamentos fotovoltaicos salvos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Link href="/simulador" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md shadow-primary/20">
            <Sun className="w-4 h-4" /> Nova Simulação
          </Link>
          <Link href="/clientes" className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 text-foreground px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm">
            <Users className="w-4 h-4 text-primary" /> Clientes
          </Link>
        </div>
      </header>

        {swrError && <div className="bg-red-900/20 text-red-400 p-4 rounded-xl mb-6 border border-red-900/50 font-medium">{swrError?.message}</div>}

        {isLoading && !projects ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-xl border border-border p-12 text-center">
            <Sun className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Nenhum projeto salvo</h3>
            <p className="text-muted-foreground mb-6">Você ainda não salvou nenhuma simulação fotovoltaica.</p>
            <Link href="/" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20">
              Criar meu primeiro projeto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-card hover:shadow-black/50 transition-all border-border flex flex-col h-full group overflow-hidden shadow-xl">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{project.name}</h3>
                    <div className="flex flex-col gap-1 mt-1">
                      {project.client && (
                        <Link href={`/clientes/${project.client.id}`} className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider hover:underline">
                          <Users className="w-3.5 h-3.5" />
                          {project.client.name}
                        </Link>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground text-sm font-medium">
                        <Calendar className="w-4 h-4" />
                        {new Date(project.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 flex-grow">
                    <div className="bg-secondary/40 rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs uppercase font-bold mb-1 tracking-wider">
                        <Zap className="w-3 h-3 text-primary" />
                        Potência Total
                      </div>
                      <div className="text-lg font-bold text-foreground">{project.totalKwp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-muted-foreground">kWp</span></div>
                    </div>
                    
                    <div className="bg-secondary/40 rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-1 text-muted-foreground text-xs uppercase font-bold mb-1 tracking-wider">
                        <LayoutGrid className="w-3 h-3 text-primary" />
                        Qtd Módulos
                      </div>
                      <div className="text-lg font-bold text-foreground">{project.totalModules} <span className="text-xs font-normal text-muted-foreground">unid.</span></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">
                      {project._count?.units || 0} {project._count?.units === 1 ? "unidade" : "unidades"}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => exportToExcel(project)}
                        title="Baixar Planilha"
                        className="text-primary bg-primary/10 hover:bg-primary/20"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteProject(project.id)}
                        title="Apagar Projeto"
                        className="text-red-400 bg-red-950/30 hover:bg-red-900/50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <span className="text-primary font-bold flex items-center bg-primary/5 px-2 py-1 rounded-md border border-primary/20">
                        {project.modulePower}W
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
