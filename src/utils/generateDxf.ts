import { ClientListItem, Project } from "@/types";

export type DxfTemplateType = "unifilar" | "projeto_completo" | "institucional";
export type PatternType = "MONOFASICO" | "BIFASICO" | "TRIFASICO";

export interface ElectricalSizingResult {
  breakerLabel: string;
  cableLabel: string;
  cableSection: string;
  wiresCount: number;
}

export function calculateElectricalSizing(
  patternType: PatternType = "BIFASICO",
  breakerAmps: number = 63
): ElectricalSizingResult {
  let section = "16";
  let wiresCount = 2;

  if (patternType === "MONOFASICO") wiresCount = 1;
  else if (patternType === "BIFASICO") wiresCount = 2;
  else if (patternType === "TRIFASICO") wiresCount = 3;

  if (breakerAmps <= 32) {
    section = "6";
  } else if (breakerAmps <= 50) {
    section = "10";
  } else if (breakerAmps <= 63) {
    section = "16";
  } else if (breakerAmps <= 80) {
    section = "25";
  } else if (breakerAmps <= 100) {
    section = "35";
  } else {
    section = "50";
  }

  const cableLabel = `${wiresCount}#${section}(${section})MM²`;
  const patternName =
    patternType === "MONOFASICO" ? "MONOFÁSICO" : patternType === "BIFASICO" ? "BIFÁSICO" : "TRIFÁSICO";
  const breakerLabel = `DISJUNTOR ${patternName} ${breakerAmps}A`;

  return {
    breakerLabel,
    cableLabel,
    cableSection: `${section} mm²`,
    wiresCount,
  };
}

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
  templateType: DxfTemplateType = "unifilar",
  patternType: PatternType = "BIFASICO",
  breakerAmps: number = 63
): Promise<void> {
  const selectedTemplate = DXF_TEMPLATES.find((t) => t.id === templateType) || DXF_TEMPLATES[0];
  const templateUrl = `/templates/dxf/${selectedTemplate.filename}`;

  try {
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o modelo CAD ${selectedTemplate.filename}`);
    }

    let dxfContent = await response.text();

    // 1. Dimensionamento elétrico NBR 5410
    const electrical = calculateElectricalSizing(patternType, breakerAmps);

    // 2. Dados numéricos dinâmicos do projeto
    const totalKwpNum = Number(project.totalKwp || 0);
    const totalKwpFormatted = totalKwpNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalKwpStr = `${totalKwpFormatted} kWp`;
    
    const totalModulesNum = Number(project.totalModules || 0);
    const modulePowerNum = Number(project.modulePower || 0);
    const modulesStr = `${totalModulesNum} MÓDULOS DE ${modulePowerNum}W`;

    // 3. Dados do Cliente e Responsável Técnico
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
    const currentDate = new Date().toLocaleDateString("pt-BR");

    // 4. Mapeamento de substituição direta de valores no arquivo DXF
    const directReplacements: Record<string, string> = {
      // Proprietário / Selo
      "STYVEN ROCHA DOS SANTOS": clientName,
      "EMIR DE MACEDO GOMES": clientName,
      "HUMBERTO": clientName,
      "ESCOLA IZAURA DE ALMEIDA SILVA": clientName,

      // Especificações Elétricas de Cabo e Disjuntor
      "2#16(16)MM²": electrical.cableLabel,
      "2#10(10)MM²": electrical.cableLabel,
      "2#6(6)MM²": electrical.cableLabel,
      "3#95(95)MM²": electrical.cableLabel,

      // Disjuntor
      "DISJUNTOR BIFÁSICO 63A": electrical.breakerLabel,
      "DISJUNTOR MONOFÁSICO 63A": electrical.breakerLabel,
      "DISJUNTOR TRIFÁSICO 63A": electrical.breakerLabel,

      // Placeholders coringa
      "{NOME_CLIENTE}": clientName,
      "{CPF_CNPJ}": cpfCnpj,
      "{ENDERECO_COMPLETO}": address,
      "{RESPONSAVEL_TECNICO}": techName,
      "{REGISTRO_CRT}": techCrt,
      "{POTENCIA_KWP}": totalKwpStr,
      "{TOTAL_MODULOS}": `${totalModulesNum} MÓDULOS`,
      "{DATA_ATUAL}": currentDate,
    };

    // Aplicar substituições diretas
    Object.entries(directReplacements).forEach(([key, val]) => {
      if (key && val) {
        dxfContent = dxfContent.split(key).join(val);
      }
    });

    // 5. Substituições inteligentes via Regex para capturar variações no DXF (ex: "7.48 kWp", "14 MÓDULOS", etc.)
    // Substituir menções de kWp/kW no carimbo do desenho
    dxfContent = dxfContent.replace(/\b\d+[\.,]\d+\s*(?:kWp|kwp|KWP)\b/gi, totalKwpStr);
    
    // Substituir menções de MÓDULOS no desenho
    dxfContent = dxfContent.replace(/\b\d+\s*(?:MÓDULOS|MODULOS)\b/gi, `${totalModulesNum} MÓDULOS`);

    // Criar o arquivo Blob e disparar o download no navegador
    const blob = new Blob([dxfContent], { type: "application/dxf;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const sanitizedProjName = (project.name || "Projeto_Solar").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.href = url;
    link.download = `Desenho_CAD_${sanitizedProjName}_${patternType.toLowerCase()}_${breakerAmps}A.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Erro ao gerar arquivo DXF:", err);
    alert("Ocorreu um erro ao gerar o arquivo CAD (.DXF). Tente novamente.");
  }
}
