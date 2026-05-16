import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, PageBreak } from "docx";
import { saveAs } from "file-saver";
import { Project, ClientDetail, Inverter } from "@/types";

export const generateMemorialDocx = async (client: ClientDetail, project: Project) => {
  const finalAddress = project.address || client.address;
  const finalNeighborhood = project.neighborhood || client.neighborhood;
  const finalCity = project.city || client.city;
  const finalCep = project.cep || client.cep;
  const fullLocation = [finalAddress, finalNeighborhood, finalCity].filter(Boolean).join(', ');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // ==========================================
          // CAPA
          // ==========================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1200, after: 400 },
            children: [
              new TextRun({ text: "Memorial Descritivo para Conexão de", bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 1200 },
            children: [
              new TextRun({ text: "Microgerador", bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 2400 },
            children: [
              new TextRun({ text: "Fonte de Geração Fotovoltaica", bold: true, size: 28 }),
            ],
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "Nome do Cliente: ", bold: true }),
              new TextRun({ text: client.name || "" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "CPF/CNPJ: ", bold: true }),
              new TextRun({ text: client.cpfCnpj || "" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Unidade Consumidora: ", bold: true }),
              new TextRun({ text: project.installationNumber || project.units?.[0]?.code || client.installationNumber || "" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Município: ", bold: true }),
              new TextRun({ text: finalCity || "" }),
            ],
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // 1 - FINALIDADE
          // ==========================================
          new Paragraph({
            children: [new TextRun({ text: "1 – FINALIDADE", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "O presente memorial tem por finalidade indicar os materiais e serviços a serem aplicados na instalação de sistema fotovoltaico, seguindo os critérios das resoluções ANEEL 482/2011 e 687/2015, Norma de Fornecimento da concessionária local e Especificações Técnicas de Materiais e Serviços.",
              }),
            ],
            spacing: { after: 400 },
          }),

          // ==========================================
          // 2 - CAPACIDADE INSTALADA
          // ==========================================
          new Paragraph({
            children: [new TextRun({ text: "2 – CAPACIDADE INSTALADA", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Geração de ${project.totalKwp?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kW de potência de pico com fornecimento de ${project.generationKwh || 0} kWh/mês de energia elétrica. Redução em torno de ${project.reductionPercent || 0}% na fatura de energia elétrica.`,
              }),
            ],
            spacing: { after: 400 },
          }),

          // ==========================================
          // 3 - ESPECIFICAÇÃO
          // ==========================================
          new Paragraph({
            children: [new TextRun({ text: "3 – ESPECIFICAÇÃO DA UNIDADE CONSUMIDORA", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "3.1 – Localização da Instalação", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `A instalação fotovoltaica será realizada sobre estrutura no telhado, situada em: ${fullLocation || "Endereço não informado"}${finalCep ? `, CEP: ${finalCep}` : ""}.`,
              }),
            ],
            spacing: { after: 400 },
          }),

          // ==========================================
          // 4 - EQUIPAMENTOS
          // ==========================================
          new Paragraph({
            children: [new TextRun({ text: "4 – EQUIPAMENTOS", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [new TextRun({ text: "4.1 – Módulo Fotovoltaico", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({ children: [new TextRun({ text: `Fabricante: ${project.moduleManufacturer || "-"}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Modelo: ${project.moduleModel || "-"}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Quantidade de módulos: ${project.totalModules || 0}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Área Total (m2): ${project.areaOccupied || "-"}` })] }),
          new Paragraph({ children: [new TextRun({ text: `Potência máxima: ${project.modulePower || 0} WP` })] }),
          new Paragraph({
            children: [new TextRun({ text: `Corrente máxima: ${project.moduleCurrent || "-"} A` })],
            spacing: { after: 400 },
          }),

          // Inversores
          ...((project.inverters && project.inverters.length > 0)
            ? project.inverters.flatMap((inv, idx) => [
                new Paragraph({
                  children: [new TextRun({ text: `4.2 – Inversor ${String(idx + 1).padStart(2, "0")}`, bold: true })],
                  spacing: { before: 200, after: 100 },
                }),
                new Paragraph({ children: [new TextRun({ text: `Fabricante: ${inv.manufacturer || "-"}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Modelo: ${inv.model || "-"}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Quantidade de inversores: ${inv.quantity || 1}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Potência máxima de saída: ${inv.outputPower || "-"} kW` })] }),
                new Paragraph({ children: [new TextRun({ text: `Corrente máxima de saída: ${inv.outputCurrent || "-"} A` })] }),
              ])
            : [
                new Paragraph({
                  children: [new TextRun({ text: "4.2 – Inversor 01", bold: true })],
                  spacing: { before: 200, after: 100 },
                }),
                new Paragraph({ children: [new TextRun({ text: `Fabricante: ${project.inverterManufacturer || "-"}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Modelo: ${project.inverterModel || "-"}` })] }),
                new Paragraph({ children: [new TextRun({ text: `Quantidade de inversores: 1` })] }),
                new Paragraph({ children: [new TextRun({ text: `Potência máxima de saída: ${project.inverterOutputPower || "-"} kW` })] }),
                new Paragraph({ children: [new TextRun({ text: `Corrente máxima de saída: ${project.inverterOutputCurrent || "-"} A` })] }),
              ]
          ),
          new Paragraph({
            children: [new TextRun({ text: "Fator de potência: 0,8 capacitivo a 0,8 indutivo" })],
            spacing: { before: 200, after: 400 },
          }),

          new Paragraph({ children: [new PageBreak()] }),

          // ==========================================
          // 5 - ESCOPO DA OBRA
          // ==========================================
          new Paragraph({
            children: [new TextRun({ text: "5 – ESCOPO DA OBRA", bold: true, size: 28 })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: "Sobre o local:", bold: true })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Área mínima que o sistema ocupará é de ${project.areaOccupied || "-"} m².` })],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [new TextRun({ text: "Arranjo dos painéis:", bold: true })],
            spacing: { after: 100 },
          }),

          // Tabelas de Inversores no Word
          ...(project.inverters && project.inverters.length > 0
            ? project.inverters.flatMap((inv, idx) => {
                const mpptsCount = Number(inv.numMppts || 1);
                const mpptInputsArray = (inv.mpptInputs || "").split(",").map(n => Number(n) || 1);
                const normalizedInputs = Array.from({ length: mpptsCount }).map((_, i) => mpptInputsArray[i] || 1);
                const totalEntries = normalizedInputs.reduce((a, b) => a + b, 0);

                const totalModulesToDistribute = project.totalModules || 0;
                const defaultModulesPerEntry = Math.floor(totalModulesToDistribute / totalEntries);
                const remainder = totalModulesToDistribute % totalEntries;

                let currentModulesArray: number[] = [];
                if (inv.stringLayout) {
                  currentModulesArray = inv.stringLayout.split(",").map(n => Number(n) || 0);
                } else {
                  currentModulesArray = Array.from({ length: totalEntries }).map((_, i) => 
                    defaultModulesPerEntry + (i < remainder ? 1 : 0)
                  );
                }

                return [
                  new Paragraph({ 
                    children: [new TextRun({ text: `Inversor ${String(idx + 1).padStart(2, "0")}:`, bold: true })], 
                    spacing: { before: 200, after: 100 } 
                  }),
                  ...currentModulesArray.map((modCount, i) => 
                    new Paragraph({ children: [new TextRun({ text: `  - 01 string com ${String(modCount).padStart(2, "0")} módulos em série ligada à entrada ${String(i + 1).padStart(2, "0")} do inversor;` })] })
                  ),
                  new Paragraph({ 
                    children: [new TextRun({ text: `Total: ${currentModulesArray.reduce((acc, c) => acc + c, 0)} módulos.` })], 
                    spacing: { after: 200 } 
                  }),
                  
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: `INVERSOR ${String(idx + 1).padStart(2, "0")} - ${inv.model || "MODELO"}`.toUpperCase(), bold: true })],
                              alignment: AlignmentType.CENTER 
                            })],
                            columnSpan: mpptsCount + 1,
                            shading: { fill: "EBEBEB" },
                          }),
                        ],
                      }),
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "ENTRADAS", bold: true })],
                              alignment: AlignmentType.CENTER 
                            })],
                            shading: { fill: "F5F5F5" },
                          }),
                          ...Array.from({ length: mpptsCount }).map((_, m) => 
                            new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ text: `MPPT${m + 1}`, bold: true })],
                                alignment: AlignmentType.CENTER 
                              })],
                              shading: { fill: "F5F5F5" },
                            })
                          ),
                        ],
                      }),
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph({ 
                              children: [new TextRun({ text: "Nº DE PLACAS" })],
                              alignment: AlignmentType.CENTER 
                            })],
                          }),
                          ...Array.from({ length: mpptsCount }).map((_, m) => {
                            let mpptTotalModules = 0;
                            const numInputs = normalizedInputs[m];
                            let globalEntryCounter = normalizedInputs.slice(0, m).reduce((a, b) => a + b, 0);
                            for (let entryIdx = 0; entryIdx < numInputs; entryIdx++) {
                              mpptTotalModules += currentModulesArray[globalEntryCounter] || 0;
                              globalEntryCounter++;
                            }
                            return new TableCell({
                              children: [new Paragraph({ 
                                children: [new TextRun({ text: String(mpptTotalModules) })],
                                alignment: AlignmentType.CENTER 
                              })],
                            });
                          }),
                        ],
                      }),
                    ],
                  }),
                  new Paragraph({ children: [new TextRun({ text: "" })], spacing: { after: 400 } }),
                ];
              })
            : [
                new Paragraph({ children: [new TextRun({ text: `Os ${project.totalModules || 0} módulos serão conectados e divididos em strings de acordo com os limites de tensão e corrente das entradas MPPT do inversor especificado.` })] })
              ]
          ),

          new Paragraph({ children: [new TextRun({ text: "Estruturas de fixação dos painéis fotovoltaicos:", bold: true })], spacing: { before: 200, after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "Serão utilizados estruturas metálicas para fixação dos painéis no telhado da área." })], spacing: { after: 200 } }),

          new Paragraph({ children: [new TextRun({ text: "Cabos e conexões:", bold: true })], spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "Serão utilizados cabos solares com proteção UV de 4,0 mm². As conexões serão feitas por conectores MC4 com proteção UV e resistência a amoníaco." })], spacing: { after: 200 } }),

          new Paragraph({ children: [new TextRun({ text: "String Box:", bold: true })], spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "Não haverá String Box externa. O DPS e as proteções são integradas ao inversor." })], spacing: { after: 400 } }),

          // Assinatura
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 1200 },
            children: [
              new TextRun({
                text: `${finalCity || "Local"}, ${new Date().getDate()} de ${new Date().toLocaleString('pt-BR', { month: 'long' })} de ${new Date().getFullYear()}.`,
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 2400 },
            children: [new TextRun({ text: "________________________________________________" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: project.professionalName || "Responsável Técnico Não Informado", bold: true })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `CRT/CREA: ${project.professionalCrt || "Não Informado"}` })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const projName = project.name || "SemNome";
  const cliName = client.name || "Cliente";
  const fileName = `Memorial_${cliName.replace(/[^a-z0-9]/gi, "_")}_${projName.replace(/[^a-z0-9]/gi, "_")}.docx`;
  saveAs(blob, fileName);
};
