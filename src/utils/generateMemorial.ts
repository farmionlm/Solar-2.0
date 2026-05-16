import jsPDF from "jspdf";
import { Project, ClientDetail, Inverter } from "@/types";

export const generateMemorialPDF = (client: ClientDetail, project: Project) => {
  const doc = new jsPDF();
  let yPos = 20;

  const setFontNormal = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
  };

  const setFontBold = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
  };

  const setFontTitle = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
  };

  const addParagraph = (text: string, x: number, y: number, maxWidth: number) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return lines.length * 5; // retorna espaço ocupado
  };

  // ==========================================
  // PÁGINA 1: CAPA
  // ==========================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Memorial Descritivo para Conexão de", 105, 40, { align: "center" });
  doc.text("Microgerador", 105, 48, { align: "center" });

  doc.text("Fonte de Geração Fotovoltaica", 105, 120, { align: "center" });

  setFontBold();
  doc.text("Nome do Cliente: ", 30, 200);
  setFontNormal();
  doc.text(client.name || "", 65, 200);

  setFontBold();
  doc.text("CPF/CNPJ: ", 30, 210);
  setFontNormal();
  doc.text(client.cpfCnpj || "", 55, 210);

  setFontBold();
  doc.text("Unidade Consumidora: ", 30, 220);
  setFontNormal();
  doc.text(project.installationNumber || project.units?.[0]?.code || client.installationNumber || "", 75, 220);

  setFontBold();
  doc.text("Município: ", 30, 230);
  setFontNormal();
  doc.text(project.city || client.city || "", 52, 230);

  doc.addPage();
  yPos = 20;

  // ==========================================
  // PÁGINA 2: ESPECIFICAÇÕES
  // ==========================================
  setFontTitle();
  doc.text("1 – FINALIDADE", 14, yPos);
  yPos += 8;
  setFontNormal();
  yPos += addParagraph(
    "O presente memorial tem por finalidade indicar os materiais e serviços a serem aplicados na instalação de sistema fotovoltaico, seguindo os critérios das resoluções ANEEL 482/2011 e 687/2015, Norma de Fornecimento da concessionária local e Especificações Técnicas de Materiais e Serviços.",
    14, yPos, 180
  );

  yPos += 8;
  setFontTitle();
  doc.text("2 – CAPACIDADE INSTALADA", 14, yPos);
  yPos += 8;
  setFontNormal();
  const finalGen = project.generationKwh || Math.round((project.totalKwp || 0) * 120);
  const finalRed = project.reductionPercent || 90;
  yPos += addParagraph(
    `Geração de ${project.totalKwp?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kW de potência de pico com fornecimento de ${finalGen} kWh/mês de energia elétrica. Redução em torno de ${finalRed}% na fatura de energia elétrica.`,
    14, yPos, 180
  );

  yPos += 8;
  setFontTitle();
  doc.text("3 – ESPECIFICAÇÃO DA UNIDADE CONSUMIDORA", 14, yPos);
  yPos += 8;
  setFontBold();
  doc.text("3.1 – Localização da Instalação", 14, yPos);
  yPos += 8;
  setFontNormal();
  
  const finalAddress = project.address || client.address;
  const finalNeighborhood = project.neighborhood || client.neighborhood;
  const finalCity = project.city || client.city;
  const finalCep = project.cep || client.cep;

  const fullLocation = [finalAddress, finalNeighborhood, finalCity].filter(Boolean).join(', ');
  yPos += addParagraph(
    `A instalação fotovoltaica será realizada sobre estrutura no telhado, situada em: ${fullLocation || "Endereço não informado"}${finalCep ? `, CEP: ${finalCep}` : ""}.`,
    14, yPos, 180
  );

  yPos += 8;
  setFontTitle();
  doc.text("4 – EQUIPAMENTOS", 14, yPos);
  yPos += 8;
  
  setFontBold();
  doc.text("4.1 – Módulo Fotovoltaico", 14, yPos);
  yPos += 8;
  setFontNormal();
  doc.text(`Fabricante: ${project.moduleManufacturer || "-"}`, 14, yPos); yPos += 5;
  doc.text(`Modelo: ${project.moduleModel || "-"}`, 14, yPos); yPos += 5;
  doc.text(`Quantidade de módulos: ${project.totalModules || 0}`, 14, yPos); yPos += 5;
  const calculatedArea = (project.totalModules || 0) * 3;
  doc.text(`Área Total (m2): ${calculatedArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, yPos); yPos += 5;
  doc.text(`Potência máxima: ${project.modulePower || 0} WP`, 14, yPos); yPos += 5;
  doc.text(`Corrente máxima: ${project.moduleCurrent || "-"} A`, 14, yPos); yPos += 10;

  if (project.inverters && project.inverters.length > 0) {
    project.inverters.forEach((inv: Inverter, index: number) => {
      setFontBold();
      doc.text(`4.2 – Inversor ${String(index + 1).padStart(2, "0")}`, 14, yPos);
      yPos += 8;
      setFontNormal();
      doc.text(`Fabricante: ${inv.manufacturer || "-"}`, 14, yPos); yPos += 5;
      doc.text(`Modelo: ${inv.model || "-"}`, 14, yPos); yPos += 5;
      doc.text(`Quantidade de inversores: ${inv.quantity || 1}`, 14, yPos); yPos += 5;
      doc.text(`Potência máxima de saída: ${inv.outputPower || "-"} kW`, 14, yPos); yPos += 5;
      doc.text(`Corrente máxima de saída: ${inv.outputCurrent || "-"} A`, 14, yPos); yPos += 5;
      yPos += 5;
    });
    setFontNormal();
    doc.text(`Fator de potência: 0,8 capacitivo a 0,8 indutivo`, 14, yPos); yPos += 10;
  } else {
    setFontBold();
    doc.text("4.2 – Inversor 01", 14, yPos);
    yPos += 8;
    setFontNormal();
    doc.text(`Fabricante: ${project.inverterManufacturer || "-"}`, 14, yPos); yPos += 5;
    doc.text(`Modelo: ${project.inverterModel || "-"}`, 14, yPos); yPos += 5;
    doc.text(`Quantidade de inversores: 1`, 14, yPos); yPos += 5;
    doc.text(`Potência máxima de saída: ${project.inverterOutputPower || "-"} kW`, 14, yPos); yPos += 5;
    doc.text(`Corrente máxima de saída: ${project.inverterOutputCurrent || "-"} A`, 14, yPos); yPos += 5;
    doc.text(`Fator de potência: 0,8 capacitivo a 0,8 indutivo`, 14, yPos); yPos += 10;
  }

  doc.addPage();
  yPos = 20;

  // ==========================================
  // PÁGINA 3: ESCOPO DA OBRA
  // ==========================================
  setFontTitle();
  doc.text("5 – ESCOPO DA OBRA", 14, yPos);
  yPos += 8;

  setFontNormal();
  doc.text("Sobre o local:", 14, yPos); yPos += 5;
  const calculatedArea2 = (project.totalModules || 0) * 3;
  doc.text(`Área mínima que o sistema ocupará é de ${calculatedArea2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m².`, 14, yPos); yPos += 10;

  doc.text("Arranjo dos painéis:", 14, yPos); yPos += 6;
  if (project.inverters && project.inverters.length > 0) {
    project.inverters.forEach((inv, idx) => {
      const mpptsCount = Number(inv.numMppts || 1);
      const mpptInputsArray = (inv.mpptInputs || "").split(",").map(n => Number(n) || 1);
      const normalizedInputs = Array.from({ length: mpptsCount }).map((_, i) => mpptInputsArray[i] || 1);
      const totalEntries = normalizedInputs.reduce((a, b) => a + b, 0);

      const defaultModulesPerEntry = Math.floor(project.totalModules / totalEntries);

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

      doc.setFont("helvetica", "bold");
      doc.text(`Inversor ${String(idx + 1).padStart(2, "0")}:`, 14, yPos); yPos += 5;
      doc.setFont("helvetica", "normal");
      
      for (let i = 0; i < totalEntries; i++) {
        const modCount = currentModulesArray[i];
        doc.text(`  - 01 string com ${String(modCount).padStart(2, "0")} módulos em série ligada à entrada ${String(i + 1).padStart(2, "0")} do inversor;`, 14, yPos);
        yPos += 5;
      }
      doc.text(`Total: ${currentModulesArray.reduce((acc, c) => acc + c, 0)} módulos.`, 14, yPos); yPos += 6;

      // Desenha a tabela de arranjo
      const titleText = `INVERSOR ${String(idx + 1).padStart(2, "0")} - ${inv.model || "MODELO"}`.toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(235, 235, 235);
      doc.rect(40, yPos, 130, 6, "FD");
      doc.text(titleText, 105, yPos + 4.5, { align: "center" });
      yPos += 6;

      doc.setFillColor(245, 245, 245);
      doc.rect(40, yPos, 50, 6, "FD");
      doc.text("ENTRADAS", 65, yPos + 4.5, { align: "center" });

      const colWidth = 80 / mpptsCount;
      for (let m = 0; m < mpptsCount; m++) {
        doc.setFillColor(245, 245, 245);
        doc.rect(90 + m * colWidth, yPos, colWidth, 6, "FD");
        doc.text(`MPPT${m + 1}`, 90 + m * colWidth + colWidth / 2, yPos + 4.5, { align: "center" });
      }
      yPos += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.rect(40, yPos, 50, 6);
      doc.text("Nº DE PLACAS", 65, yPos + 4.5, { align: "center" });

      let globalEntryCounter = 0;
      for (let m = 0; m < mpptsCount; m++) {
        let mpptTotalModules = 0;
        const numInputs = normalizedInputs[m];
        for (let entryIdx = 0; entryIdx < numInputs; entryIdx++) {
          mpptTotalModules += currentModulesArray[globalEntryCounter] || 0;
          globalEntryCounter++;
        }
        doc.rect(90 + m * colWidth, yPos, colWidth, 6);
        doc.text(String(mpptTotalModules), 90 + m * colWidth + colWidth / 2, yPos + 4.5, { align: "center" });
      }
      yPos += 12;
    });
    setFontNormal();
  } else {
    yPos += addParagraph(
      `Os ${project.totalModules || 0} módulos serão conectados e divididos em strings de acordo com os limites de tensão e corrente das entradas MPPT do inversor especificado.`,
      14, yPos, 180
    );
    yPos += 5;
  }



  doc.text("Estruturas de fixação dos painéis fotovoltaicos:", 14, yPos); yPos += 5;
  yPos += addParagraph(
    "Serão utilizados estruturas metálicas para fixação dos painéis no telhado da área.",
    14, yPos, 180
  );
  yPos += 5;

  doc.text("Cabos e conexões:", 14, yPos); yPos += 5;
  yPos += addParagraph(
    "Serão utilizados cabos solares com proteção UV de 4,0 mm². As conexões serão feitas por conectores MC4 com proteção UV e resistência a amoníaco.",
    14, yPos, 180
  );
  yPos += 5;

  doc.text("String Box:", 14, yPos); yPos += 5;
  yPos += addParagraph(
    "Não haverá String Box externa. O DPS e as proteções são integradas ao inversor.",
    14, yPos, 180
  );
  yPos += 5;

  let invMan = project.inverterManufacturer || "-";
  let invOutCur = project.inverterOutputCurrent || "-";
  let invOutPow = project.inverterOutputPower || "-";
  let invMod = project.inverterModel || "-";

  if (project.inverters && project.inverters.length > 0) {
    const firstInv = project.inverters[0];
    invMan = firstInv.manufacturer || invMan;
    invOutCur = firstInv.outputCurrent || invOutCur;
    invOutPow = firstInv.outputPower || invOutPow;
    invMod = firstInv.model || invMod;
  }

  doc.text("Inversor:", 14, yPos); yPos += 5;
  yPos += addParagraph(
    `Serão utilizados um inversor da marca ${String(invMan).toUpperCase()} operando em ${invOutCur}A (CA) com potência de ${invOutPow} kW, modelo ${invMod}. Não será utilizado transformador, pois a conexão da unidade consumidora é 220V.`,
    14, yPos, 180
  );
  yPos += 30;


  // Assinatura
  const today = new Date();
  const dateString = `${project.city || client.city || "Local"}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}.`;
  doc.text(dateString, 196, yPos, { align: "right" });
  yPos += 30;

  doc.text("________________________________________________", 105, yPos, { align: "center" });
  yPos += 6;
  doc.text(project.professionalName || "Responsável Técnico Não Informado", 105, yPos, { align: "center" });
  yPos += 6;
  doc.text(`CRT/CREA: ${project.professionalCrt || "Não Informado"}`, 105, yPos, { align: "center" });

  // Salva o arquivo
  const projName = project.name || "SemNome";
  const cliName = client.name || "Cliente";
  const fileName = `Memorial_${cliName.replace(/[^a-z0-9]/gi, "_")}_${projName.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  doc.save(fileName);
};
