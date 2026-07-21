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

export function calculateMpptDistribution(
  totalModules: number,
  numMppts: number = 2,
  customStringLayout?: string | null
): number[] {
  if (customStringLayout && customStringLayout.trim()) {
    const parts = customStringLayout
      .split(",")
      .map((p) => parseInt(p.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);
    if (parts.length > 0) {
      return parts;
    }
  }

  const activeMppts = Math.max(1, Math.min(numMppts, 4));
  const baseCount = Math.floor(totalModules / activeMppts);
  const remainder = totalModules % activeMppts;

  const distribution: number[] = [];
  for (let i = 0; i < activeMppts; i++) {
    distribution.push(baseCount + (i < remainder ? 1 : 0));
  }
  return distribution;
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

/**
 * Parser DXF estruturado por grupos (Grupo 1 e 3) que preserva 100% da integridade do arquivo para o AutoCAD.
 * Preenche sem cortar o modelo completo do módulo e distribui as strings por MPPT sem sobreposição.
 */
export async function generateDxfProject(
  client: ClientListItem,
  project: Project,
  templateType: DxfTemplateType = "unifilar",
  patternType: PatternType = "BIFASICO",
  breakerAmps: number = 63,
  customMpptsCount?: number,
  customStringLayout?: string
): Promise<void> {
  const selectedTemplate = DXF_TEMPLATES.find((t) => t.id === templateType) || DXF_TEMPLATES[0];
  const templateUrl = `/templates/dxf/${selectedTemplate.filename}`;

  try {
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o modelo CAD ${selectedTemplate.filename}`);
    }

    const rawDxfText = await response.text();

    // 1. Dimensionamento elétrico NBR 5410
    const electrical = calculateElectricalSizing(patternType, breakerAmps);

    // 2. Dados numéricos dinâmicos do projeto
    const totalKwpNum = Number(project.totalKwp || 0);
    const totalKwpFormatted = totalKwpNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalKwpStr = `${totalKwpFormatted} kWp`;
    
    const totalModulesNum = Number(project.totalModules || 0);
    const modulePowerNum = Number(project.modulePower || 0);

    // 3. Distribuição de MPPTs e Strings
    const numMppts = customMpptsCount || project.inverters?.[0]?.numMppts || 2;
    const layoutStr = customStringLayout || project.inverters?.[0]?.stringLayout;
    const mpptDistribution = calculateMpptDistribution(totalModulesNum, numMppts, layoutStr);

    const mppt1Count = mpptDistribution[0] || Math.ceil(totalModulesNum / 2);
    const mppt2Count = mpptDistribution.length > 1 ? mpptDistribution[1] : Math.floor(totalModulesNum / 2);

    const mppt1CountStr = String(mppt1Count).padStart(2, "0");
    const mppt2CountStr = numMppts >= 2 && mppt2Count > 0 ? String(mppt2Count).padStart(2, "0") : "  ";

    // 4. Dados dos Equipamentos (Nome completo sem truncamento)
    const rawModuleModel = project.moduleModel || "Módulo Fotovoltaico";
    const fullModuleModel = rawModuleModel.toUpperCase().trim();

    const moduleManufacturer = (project.moduleManufacturer || "SOLAR").toUpperCase();
    
    const inverterManufacturer = (
      project.inverterManufacturer ||
      project.inverters?.[0]?.manufacturer ||
      "GROWATT"
    ).toUpperCase();

    const inverterModel = (
      project.inverterModel ||
      project.inverters?.[0]?.model ||
      "INVERSOR SOLAR"
    ).toUpperCase().trim();

    // 5. Dados do Cliente e Responsável Técnico
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

    // 6. Divisão em linhas do DXF
    const lineEnding = rawDxfText.includes("\r\n") ? "\r\n" : "\n";
    const lines = rawDxfText.split(/\r?\n/);

    // 7. Processamento em passagem única com regex seguro
    for (let i = 0; i < lines.length - 1; i++) {
      const code = lines[i].trim();
      
      if (code === "1" || code === "3") {
        let textVal = lines[i + 1];

        if (textVal && textVal.trim().length > 0) {
          let updated = false;

          // A. Nomes de Proprietário e Selo
          if (/STYVEN ROCHA DOS SANTOS|EMIR DE MACEDO GOMES|HUMBERTO|ESCOLA IZAURA DE ALMEIDA SILVA/i.test(textVal)) {
            textVal = clientName;
            updated = true;
          }

          // B. Fiação NBR 5410
          if (!updated && /2#16\(16\)MM²|2#10\(10\)MM²|2#6\(6\)MM²|3#95\(95\)MM²/i.test(textVal)) {
            textVal = electrical.cableLabel;
            updated = true;
          }

          // C. Disjuntores dos 3 Locais (Entrada, Seccionamento, Cargas Internas)
          if (!updated && /DISJUNTOR BIFÁSICO 63A|DISJUNTOR MONOFÁSICO 63A|DISJUNTOR TRIFÁSICO 63A|DISJUNTOR BIFÁSICO/i.test(textVal)) {
            textVal = electrical.breakerLabel;
            updated = true;
          }

          if (!updated && /Dispositivo de Proteção\s*\d*A?/i.test(textVal)) {
            textVal = `Dispositivo de Proteção ${breakerAmps}A`;
            updated = true;
          }

          if (!updated && /\bDISJUNTOR\s+\d+A\b/i.test(textVal)) {
            textVal = `DISJUNTOR ${breakerAmps}A`;
            updated = true;
          }

          // D. Marca e Modelo do Inversor (Ex: Solis S6-GR1P7.5K2)
          if (!updated && /CSI-5K-S2203A-E|S6-GR1P7|MIN 5000TL/i.test(textVal)) {
            textVal = inverterModel;
            updated = true;
          }

          if (!updated && /CANADIANSOLAR|CANADIAN|SOLIS|GROWATT/i.test(textVal)) {
            textVal = inverterManufacturer;
            updated = true;
          }

          // E. Marca e Modelo Completo de Módulos (Sem Truncar)
          if (!updated && /HMB132T12R/i.test(textVal)) {
            textVal = fullModuleModel;
            updated = true;
          }

          if (!updated && /HELIUS/i.test(textVal)) {
            textVal = moduleManufacturer;
            updated = true;
          }

          // F. Quantidades reais de módulos por String/MPPT no Fluxograma (Gerador P1 e P2)
          if (!updated && (/\b06\b/.test(textVal) || /\b11\b/.test(textVal)) && i > 8200 && i < 19500) {
            textVal = textVal.replace(/\b(06|11)\b/, mppt1CountStr);
            updated = true;
          }

          if (!updated && (/\b05\b/.test(textVal) || /\b10\b/.test(textVal)) && i > 8200 && i < 19500) {
            textVal = textVal.replace(/\b(05|10)\b/, mppt2CountStr);
            updated = true;
          }

          // G. Substituir kWp e Totais gerais
          if (!updated && /\b\d+[\.,]\d+\s*(?:kWp|kwp|KWP)\b/i.test(textVal)) {
            textVal = totalKwpStr;
            updated = true;
          }

          if (!updated && /\b7[\.,]48\b|\b13[\.,]02\b/i.test(textVal)) {
            textVal = totalKwpFormatted;
            updated = true;
          }

          // H. Placeholders genéricos
          if (!updated) {
            textVal = textVal.replace(/\{NOME_CLIENTE\}/gi, clientName);
            textVal = textVal.replace(/\{CPF_CNPJ\}/gi, cpfCnpj);
            textVal = textVal.replace(/\{ENDERECO_COMPLETO\}/gi, address);
            textVal = textVal.replace(/\{RESPONSAVEL_TECNICO\}/gi, techName);
            textVal = textVal.replace(/\{REGISTRO_CRT\}/gi, techCrt);
            textVal = textVal.replace(/\{POTENCIA_KWP\}/gi, totalKwpStr);
            textVal = textVal.replace(/\{TOTAL_MODULOS\}/gi, `${totalModulesNum} MÓDULOS`);
            textVal = textVal.replace(/\{DATA_ATUAL\}/gi, currentDate);
          }

          lines[i + 1] = textVal;
        }
      }
    }

    // 8. Reconstituir arquivo DXF
    const finalDxfContent = lines.join(lineEnding);

    const blob = new Blob([finalDxfContent], { type: "image/vnd.dxf;charset=utf-8" });
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
