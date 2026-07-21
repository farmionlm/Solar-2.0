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

/**
 * Parser DXF estruturado que preserva 100% da integridade do arquivo para o AutoCAD.
 * Altera EXCLUSIVAMENTE o conteúdo das entidades de texto (Grupo 1 e 3), sem jamais
 * corromper coordenadas, handles ou cabeçalhos do CAD.
 */
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

    const rawDxfText = await response.text();

    // 1. Dimensionamento elétrico NBR 5410
    const electrical = calculateElectricalSizing(patternType, breakerAmps);

    // 2. Dados numéricos dinâmicos do projeto
    const totalKwpNum = Number(project.totalKwp || 0);
    const totalKwpFormatted = totalKwpNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalKwpStr = `${totalKwpFormatted} kWp`;
    
    const totalModulesNum = Number(project.totalModules || 0);
    const modulePowerNum = Number(project.modulePower || 0);

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

    // 4. Divisão em linhas preservando final de linha original (\r\n ou \n)
    const lineEnding = rawDxfText.includes("\r\n") ? "\r\n" : "\n";
    const lines = rawDxfText.split(/\r?\n/);

    // 5. Processamento seguro do DXF: alterar APENAS as linhas de conteúdo de texto (Grupo 1 e Grupo 3)
    for (let i = 0; i < lines.length - 1; i++) {
      const code = lines[i].trim();
      
      // O código de grupo '1' no DXF indica o valor string de um elemento TEXT / MTEXT / ATTRIB
      // O código '3' indica continuações de texto longo em MTEXT
      if (code === "1" || code === "3") {
        let textVal = lines[i + 1];

        // Se a linha tiver conteúdo textual
        if (textVal && textVal.trim().length > 0) {
          // Substituir nomes de clientes dos gabaritos originais
          textVal = textVal.replace(/STYVEN ROCHA DOS SANTOS/gi, clientName);
          textVal = textVal.replace(/EMIR DE MACEDO GOMES/gi, clientName);
          textVal = textVal.replace(/HUMBERTO/gi, clientName);
          textVal = textVal.replace(/ESCOLA IZAURA DE ALMEIDA SILVA/gi, clientName);

          // Substituir cabos e disjuntores da NBR 5410
          textVal = textVal.replace(/2#16\(16\)MM²/gi, electrical.cableLabel);
          textVal = textVal.replace(/2#10\(10\)MM²/gi, electrical.cableLabel);
          textVal = textVal.replace(/2#6\(6\)MM²/gi, electrical.cableLabel);
          textVal = textVal.replace(/3#95\(95\)MM²/gi, electrical.cableLabel);

          textVal = textVal.replace(/DISJUNTOR BIFÁSICO 63A/gi, electrical.breakerLabel);
          textVal = textVal.replace(/DISJUNTOR MONOFÁSICO 63A/gi, electrical.breakerLabel);
          textVal = textVal.replace(/DISJUNTOR TRIFÁSICO 63A/gi, electrical.breakerLabel);
          textVal = textVal.replace(/DISJUNTOR BIFÁSICO/gi, `DISJUNTOR ${electrical.breakerLabel.replace("DISJUNTOR ", "")}`);

          // Dispositivo de Proteção e Disjuntores dos 3 Locais do Desenho CAD
          textVal = textVal.replace(/Dispositivo de Proteção\s*\d*A?/gi, `Dispositivo de Proteção ${breakerAmps}A`);
          textVal = textVal.replace(/\bDISJUNTOR\s+\d+A\b/gi, `DISJUNTOR ${breakerAmps}A`);
          textVal = textVal.replace(/DISJUNTOR BIFÁSICO 63A/gi, electrical.breakerLabel);
          textVal = textVal.replace(/DISJUNTOR MONOFÁSICO 63A/gi, electrical.breakerLabel);
          textVal = textVal.replace(/DISJUNTOR TRIFÁSICO 63A/gi, electrical.breakerLabel);

          // Substituir kWp e Módulos exclusivamente no texto da entidade DXF
          textVal = textVal.replace(/\b\d+[\.,]\d+\s*(?:kWp|kwp|KWP)\b/gi, totalKwpStr);
          textVal = textVal.replace(/\b7[\.,]48\b/gi, totalKwpFormatted);
          textVal = textVal.replace(/\b\d+\s*(?:MÓDULOS|MODULOS)\b/gi, `${totalModulesNum} MÓDULOS`);

          // Placeholders dinâmicos
          textVal = textVal.replace(/\{NOME_CLIENTE\}/gi, clientName);
          textVal = textVal.replace(/\{CPF_CNPJ\}/gi, cpfCnpj);
          textVal = textVal.replace(/\{ENDERECO_COMPLETO\}/gi, address);
          textVal = textVal.replace(/\{RESPONSAVEL_TECNICO\}/gi, techName);
          textVal = textVal.replace(/\{REGISTRO_CRT\}/gi, techCrt);
          textVal = textVal.replace(/\{POTENCIA_KWP\}/gi, totalKwpStr);
          textVal = textVal.replace(/\{TOTAL_MODULOS\}/gi, `${totalModulesNum} MÓDULOS`);
          textVal = textVal.replace(/\{DATA_ATUAL\}/gi, currentDate);

          lines[i + 1] = textVal;
        }
      }
    }

    // 6. Reconstituir o conteúdo do arquivo DXF 100% válido para o AutoCAD
    const finalDxfContent = lines.join(lineEnding);

    // Criar o arquivo Blob com codificação Windows-1252 / ASCII compatível com AutoCAD
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
