import { ClientListItem, Project } from "@/types";

export type DxfTemplateType = "unifilar" | "projeto_completo" | "institucional";

export const DXF_TEMPLATES = [
  {
    id: "unifilar" as DxfTemplateType,
    title: "Diagrama Unifilar Padrão",
    description: "Modelo ideal para entradas de microgeração residencial e comercial.",
    filename: "unifilar.dxf",
  },
  {
    id: "projeto_completo" as DxfTemplateType,
    title: "Projeto Fotovoltaico Completo",
    description: "Planta baixa, diagramas e detalhes para aprovação na concessionária.",
    filename: "projeto_completo.dxf",
  },
  {
    id: "institucional" as DxfTemplateType,
    title: "Projeto Institucional / Escolas",
    description: "Gabarito preparado para projetos de grande porte e múltiplas unidades.",
    filename: "institucional.dxf",
  },
];

export async function generateDxfProject(
  client: ClientListItem,
  project: Project,
  templateType: DxfTemplateType = "unifilar"
): Promise<void> {
  const selectedTemplate = DXF_TEMPLATES.find((t) => t.id === templateType) || DXF_TEMPLATES[0];
  const templateUrl = `/templates/dxf/${selectedTemplate.filename}`;

  try {
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o modelo CAD ${selectedTemplate.filename}`);
    }

    let dxfContent = await response.text();

    // Dados preparados do cliente e projeto
    const clientName = (client.name || "CLIENTE NÃO INFORMADO").toUpperCase();
    const cpfCnpj = (client.cpfCnpj || "-").toUpperCase();
    const address = [
      client.address,
      client.neighborhood,
      client.city,
      client.cep ? `CEP: ${client.cep}` : "",
    ]
      .filter(Boolean)
      .join(", ")
      .toUpperCase() || "ENDEREÇO NÃO INFORMADO";

    const techName = (project.professionalName || client.user?.name || "ENGENHEIRO RESPONSÁVEL").toUpperCase();
    const techCrt = (project.professionalCrt || "CRT / CREA").toUpperCase();
    const kwpStr = `${Number(project.totalKwp || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KWP`;
    const modulesStr = `${project.totalModules || 0} MÓDULOS (${project.modulePower || 0}W)`;
    const currentDate = new Date().toLocaleDateString("pt-BR");

    // Dicionário de substituições dinâmicas no DXF
    const replacements: Record<string, string> = {
      // Tags diretas do CAD encontradas nos selos dos modelos
      "STYVEN ROCHA DOS SANTOS": clientName,
      "EMIR DE MACEDO GOMES": clientName,
      "HUMBERTO": clientName,
      "ESCOLA IZAURA DE ALMEIDA SILVA": clientName,
      
      // Placeholders coringa para personalização
      "{NOME_CLIENTE}": clientName,
      "{CPF_CNPJ}": cpfCnpj,
      "{ENDERECO_COMPLETO}": address,
      "{RESPONSAVEL_TECNICO}": techName,
      "{REGISTRO_CRT}": techCrt,
      "{POTENCIA_KWP}": kwpStr,
      "{TOTAL_MODULOS}": modulesStr,
      "{DATA_ATUAL}": currentDate,
    };

    // Aplicar substituição de dados no conteúdo do texto ASCII do DXF
    Object.entries(replacements).forEach(([key, val]) => {
      if (key && val) {
        dxfContent = dxfContent.split(key).join(val);
      }
    });

    // Criar o arquivo Blob e disparar o download no navegador
    const blob = new Blob([dxfContent], { type: "application/dxf;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const sanitizedProjName = (project.name || "Projeto_Solar").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.href = url;
    link.download = `Desenho_CAD_${sanitizedProjName}_${templateType}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Erro ao gerar arquivo DXF:", err);
    alert("Ocorreu um erro ao gerar o arquivo CAD (.DXF). Tente novamente.");
  }
}
