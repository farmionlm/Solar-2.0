import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } from "docx";
import { saveAs } from "file-saver";
import { Project, ClientDetail } from "@/types";

/**
 * Gerador de Formulário Oficial de Solicitação de Acesso (Microgeração ANEEL / EDP-ES) em formato Word (.DOCX).
 */
export const generateFormularioAcessoDocx = async (client: ClientDetail, project: Project) => {
  const totalKwpNum = Number(project.totalKwp || 0);
  const totalKwpFormatted = totalKwpNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fullAddress = [
    client.address,
    client.neighborhood,
    client.city,
    client.cep ? `CEP: ${client.cep}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const techName = project.professionalName || client.user?.name || "Engenheiro Responsável";
  const techCrt = project.professionalCrt || "CREA / CRT";
  const currentDate = new Date().toLocaleDateString("pt-BR");

  const invManufacturer = project.inverterManufacturer || project.inverters?.[0]?.manufacturer || "Solis / Growatt";
  const invModel = project.inverterModel || project.inverters?.[0]?.model || "Inversor Solar";
  const invPower = project.inverterOutputPower || project.inverters?.[0]?.outputPower || 5000;
  const invQty = project.inverters?.length || 1;

  const createSectionHeader = (title: string) => {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: title, bold: true, size: 22, color: "0F172A" }),
      ],
    });
  };

  const createFieldRow = (label: string, value: string) => {
    return new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 20, color: "334155" }),
        new TextRun({ text: value || "-", size: 20, color: "0F172A" }),
      ],
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // TÍTULO
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "FORMULÁRIO DE SOLICITAÇÃO DE ACESSO À MICROGERAÇÃO", bold: true, size: 28, color: "0F172A" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "Padrão Normativo ANEEL / Distribuidora de Energia (EDP-ES e Concessionárias)", size: 18, color: "64748B" }),
            ],
          }),

          // 1. TITULAR DA UC
          createSectionHeader("1. DADOS DO TITULAR DA UNIDADE CONSUMIDORA (ACESSANTE)"),
          createFieldRow("Nome / Razão Social", client.name || "–"),
          createFieldRow("CPF / CNPJ", client.cpfCnpj || "–"),
          createFieldRow("Endereço Completo", fullAddress || "–"),
          createFieldRow("Telefone de Contato", client.phone || "–"),
          createFieldRow("E-mail", client.email || "–"),
          createFieldRow("Número da Instalação / Código da UC", project.installationNumber || project.units?.[0]?.code || client.installationNumber || "–"),
          createFieldRow("Concessionária Distribuidora", client.concessionaria || "EDP ESPÍRITO SANTO"),

          // 2. LIGAÇÃO E UC
          createSectionHeader("2. CARACTERÍSTICAS DA UNIDADE CONSUMIDORA & LIGAÇÃO"),
          createFieldRow("Potência Total Solicitada", `${totalKwpFormatted} kWp`),
          createFieldRow("Tensão de Conexão", "Baixa Tensão (BT) - 220V/127V"),
          createFieldRow("Tipo de Ligação", "Bifásico / Trifásico"),
          createFieldRow("Grupo Tarifário", "Grupo B (B1 / B3)"),

          // 3. EQUIPAMENTOS DA USINA
          createSectionHeader("3. ESPECIFICAÇÃO DOS EQUIPAMENTOS DO GERADOR FOTOVOLTAICO"),
          createFieldRow("Tecnologia de Geração", "Solar Fotovoltaica"),
          createFieldRow("Potência Instalada (kWp)", `${totalKwpFormatted} kWp`),
          createFieldRow("Total de Módulos", `${project.totalModules || 0} unidades`),
          createFieldRow("Fabricante dos Módulos", project.moduleManufacturer || "Canadian Solar / Helius"),
          createFieldRow("Modelo dos Módulos", project.moduleModel || "Módulo Fotovoltaico N-Type"),
          createFieldRow("Potência Unitária do Módulo", `${project.modulePower || 0} W`),
          createFieldRow("Fabricante do Inversor", invManufacturer || "–"),
          createFieldRow("Modelo do Inversor", invModel || "–"),
          createFieldRow("Potência Nominal do Inversor", `${invPower} W`),
          createFieldRow("Quantidade de Inversores", `${invQty} unidade(s)`),

          // 4. RESPONSABILIDADE TÉCNICA E ASSINATURA
          createSectionHeader("4. DADOS DO RESPONSÁVEL TÉCNICO E DECLARAÇÃO"),
          createFieldRow("Responsável Técnico", techName || "–"),
          createFieldRow("Registro CREA / CRT", techCrt || "–"),
          createFieldRow("Data da Solicitação", currentDate),

          new Paragraph({
            spacing: { before: 200, after: 300 },
            children: [
              new TextRun({
                text: "Declaro que as informações prestadas neste formulário são a expressão da verdade e que o projeto elétrico atende rigorosamente às normas da ANEEL e aos padrões técnicos da concessionária distribuidora.",
                italics: true,
                size: 18,
                color: "64748B",
              }),
            ],
          }),

          // Tabela de Assinaturas
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: "none" as const, size: 0, color: "FFFFFF" },
              bottom: { style: "none" as const, size: 0, color: "FFFFFF" },
              left: { style: "none" as const, size: 0, color: "FFFFFF" },
              right: { style: "none" as const, size: 0, color: "FFFFFF" },
              insideHorizontal: { style: "none" as const, size: 0, color: "FFFFFF" },
              insideVertical: { style: "none" as const, size: 0, color: "FFFFFF" },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400 },
                        children: [
                          new TextRun({ text: "____________________________________", bold: true }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: client.name || "Titular da UC", bold: true, size: 18 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: "Titular da Unidade Consumidora", size: 16, color: "64748B" }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400 },
                        children: [
                          new TextRun({ text: "____________________________________", bold: true }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: techName, bold: true, size: 18 }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: `Reg: ${techCrt}`, size: 16, color: "64748B" }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const sanitizedClient = (client.name || "Cliente").replace(/[^a-z0-9]/gi, "_");
  saveAs(blob, `Formulario_Solicitacao_Acesso_${sanitizedClient}.docx`);
};
