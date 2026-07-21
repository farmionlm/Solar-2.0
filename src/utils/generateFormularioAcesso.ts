import jsPDF from "jspdf";
import { Project, ClientDetail } from "@/types";

/**
 * Gerador de Formulário Oficial de Solicitação de Acesso (Microgeração ANEEL / EDP-ES) em formato PDF.
 */
export const generateFormularioAcessoPDF = (client: ClientDetail, project: Project) => {
  const doc = new jsPDF();
  let y = 15;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 280) {
      doc.addPage();
      y = 15;
    }
  };

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(10, 10, 190, 22, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("FORMULÁRIO DE SOLICITAÇÃO DE ACESSO À MICROGERAÇÃO", 105, 18, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Padrão Normativo ANEEL / Distribuidora de Energia (EDP-ES e Concessionárias)", 105, 26, { align: "center" });

    doc.setTextColor(0, 0, 0);
    y = 38;
  };

  const drawSectionTitle = (title: string) => {
    checkPageBreak(12);
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(10, y, 190, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, y + 5);

    y += 11;
  };

  const drawRowField = (label: string, value: string, x: number = 14) => {
    checkPageBreak(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(label, x, y);

    const labelWidth = doc.getTextWidth(label);
    const valueX = x + labelWidth + 2;
    const maxValueWidth = 200 - valueX; // Margem direita em 200

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);

    const valueText = value || "-";
    const valueLines = doc.splitTextToSize(valueText, maxValueWidth);
    doc.text(valueLines, valueX, y);

    // Avança proporcionalmente ao número de linhas do valor
    y += 6 * (valueLines.length || 1);
  };


  drawHeader();

  // =========================================================
  // 1. DADOS DO ACESSANTE / TITULAR DA UNIDADE CONSUMIDORA
  // =========================================================
  drawSectionTitle("1. DADOS DO TITULAR DA UNIDADE CONSUMIDORA (ACESSANTE)");

  drawRowField("Nome / Razão Social: ", client.name || "-");
  drawRowField("CPF / CNPJ: ", client.cpfCnpj || "-");
  
  const fullAddress = [
    client.address,
    client.neighborhood,
    client.city,
    client.cep ? `CEP: ${client.cep}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  
  drawRowField("Endereço Completo: ", fullAddress || "-");
  drawRowField("Telefone de Contato: ", client.phone || "-");
  drawRowField("E-mail: ", client.email || "-");
  drawRowField("Número da Instalação / Código da UC: ", project.installationNumber || project.units?.[0]?.code || client.installationNumber || "-");
  drawRowField("Concessionária Distribuidora: ", client.concessionaria || "EDP ESPÍRITO SANTO");

  y += 4;

  // =========================================================
  // 2. DADOS DA UNIDADE CONSUMIDORA & PADRÃO DE ENTRADA
  // =========================================================
  drawSectionTitle("2. CARACTERÍSTICAS DA UNIDADE CONSUMIDORA & LIGAÇÃO");

  const totalKwpNum = Number(project.totalKwp || 0);
  const totalKwpFormatted = totalKwpNum.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  drawRowField("Potência Total Solicitada: ", `${totalKwpFormatted} kWp`);
  drawRowField("Tensão de Conexão: ", "Baixa Tensão (BT) - 220V/127V");
  drawRowField("Tipo de Ligação: ", "Bifásico / Trifásico");
  drawRowField("Grupo Tarifário: ", "Grupo B (B1 / B3)");

  y += 4;

  // =========================================================
  // 3. DADOS DO SISTEMA DE GERAÇÃO FOTOVOLTAICA (USINA)
  // =========================================================
  drawSectionTitle("3. ESPECIFICAÇÃO DOS EQUIPAMENTOS DO GERADOR FOTOVOLTAICO");

  drawRowField("Tecnologia de Geração: ", "Solar Fotovoltaica");
  drawRowField("Potência Instalada (kWp): ", `${totalKwpFormatted} kWp`);
  drawRowField("Total de Módulos: ", `${project.totalModules || 0} unidades`);
  drawRowField("Fabricante dos Módulos: ", project.moduleManufacturer || "Canadian Solar / Helius");
  drawRowField("Modelo dos Módulos: ", project.moduleModel || "Módulo Fotovoltaico N-Type");
  drawRowField("Potência Unitária do Módulo: ", `${project.modulePower || 0} W`);

  y += 3;

  const invManufacturer = project.inverterManufacturer || project.inverters?.[0]?.manufacturer || "Solis / Growatt";
  const invModel = project.inverterModel || project.inverters?.[0]?.model || "Inversor Solar";
  const invPower = project.inverterOutputPower || project.inverters?.[0]?.outputPower || 5000;
  const invQty = project.inverters?.length || 1;

  drawRowField("Fabricante do Inversor: ", invManufacturer);
  drawRowField("Modelo do Inversor: ", invModel);
  drawRowField("Potência Nominal do Inversor: ", `${invPower} W`);
  drawRowField("Quantidade de Inversores: ", `${invQty} unidade(s)`);

  y += 4;

  // =========================================================
  // 4. RESPONSABILIDADE TÉCNICA E DECLARAÇÃO
  // =========================================================
  drawSectionTitle("4. DADOS DO RESPONSÁVEL TÉCNICO E DECLARAÇÃO");

  const techName = project.professionalName || client.user?.name || "Engenheiro Responsável";
  const techCrt = project.professionalCrt || "CREA / CRT";
  const currentDate = new Date().toLocaleDateString("pt-BR");

  drawRowField("Responsável Técnico: ", techName);
  drawRowField("Registro CREA / CRT: ", techCrt);
  drawRowField("Data da Solicitação: ", currentDate);

  y += 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const declText = "Declaro que as informações prestadas neste formulário são a expressão da verdade e que o projeto elétrico atende rigorosamente às normas da ANEEL e aos padrões técnicos da concessionária distribuidora.";
  const lines = doc.splitTextToSize(declText, 186);
  doc.text(lines, 14, y);
  y += lines.length * 4 + 14;

  // Linhas de Assinatura
  checkPageBreak(30);
  doc.setLineWidth(0.5);
  doc.setDrawColor(15, 23, 42);

  // Assinatura do Cliente
  doc.line(20, y, 90, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(client.name || "Assinatura do Titular", 55, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Titular da UC", 55, y + 9, { align: "center" });

  // Assinatura do Responsável Técnico
  doc.line(115, y, 185, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(techName, 150, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Reg: ${techCrt}`, 150, y + 9, { align: "center" });

  const sanitizedClient = (client.name || "Cliente").replace(/[^a-z0-9]/gi, "_");
  doc.save(`Formulario_Solicitacao_Acesso_${sanitizedClient}.pdf`);
};
