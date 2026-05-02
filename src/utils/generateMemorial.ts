import jsPDF from "jspdf";
import "jspdf-autotable";
import { Project, ClientDetail } from "@/types";

export const generateMemorialPDF = (client: ClientDetail, project: Project) => {
  const doc = new jsPDF();
  let yPos = 20;

  // Helpers
  const addTitle = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(text, 105, yPos, { align: "center" });
    yPos += 15;
  };

  const addSectionTitle = (text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(text, 14, yPos);
    yPos += 8;
  };

  const addLine = (label: string, value: string | number | undefined | null) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}`, 14, yPos);
    
    // Calcula largura do label para colocar o valor logo à frente
    const labelWidth = doc.getTextWidth(`${label} `);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(value ? String(value) : "Não informado", 14 + labelWidth, yPos);
    yPos += 6;
  };

  // --- CABEÇALHO ---
  addTitle("MEMORIAL DESCRITIVO E TÉCNICO");
  
  // --- 1. DADOS DO RESPONSÁVEL TÉCNICO ---
  addSectionTitle("1. RESPONSÁVEL TÉCNICO");
  addLine("Nome:", project.professionalName);
  addLine("Registro (CRT/CREA):", project.professionalCrt);
  yPos += 5;

  // --- 2. DADOS DO CLIENTE E INSTALAÇÃO ---
  addSectionTitle("2. DADOS DO CLIENTE E INSTALAÇÃO");
  addLine("Proprietário:", client.name);
  addLine("CPF/CNPJ:", client.cpfCnpj);
  addLine("Endereço:", client.address);
  addLine("CEP:", client.cep);
  addLine("Telefone:", client.phone);
  addLine("E-mail:", client.email);
  addLine("Número da Instalação:", client.installationNumber);
  yPos += 5;

  // --- 3. DADOS DO SISTEMA FOTOVOLTAICO ---
  addSectionTitle("3. DADOS DO SISTEMA FOTOVOLTAICO");
  addLine("Nome do Projeto:", project.name);
  addLine("Potência Total Instalada (kWp):", project.totalKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  addLine("Geração Mensal Estimada (kWh/mês):", project.generationKwh);
  addLine("Redução Estimada na Fatura (%):", project.reductionPercent);
  addLine("Área Total Ocupada (m²):", project.areaOccupied);
  yPos += 5;

  // Verifica se precisa mudar de página
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  // --- 4. EQUIPAMENTOS ---
  addSectionTitle("4. ESPECIFICAÇÕES DOS EQUIPAMENTOS");
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text("4.1. Módulos Fotovoltaicos", 14, yPos);
  yPos += 6;
  addLine("Fabricante:", project.moduleManufacturer);
  addLine("Modelo:", project.moduleModel);
  addLine("Quantidade Total:", project.totalModules);
  addLine("Potência Unitária (W):", project.modulePower);
  addLine("Área Unitária (m²):", project.moduleArea);
  addLine("Corrente de Máx. Potência - Imp (A):", project.moduleCurrent);
  yPos += 4;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text("4.2. Inversores", 14, yPos);
  yPos += 6;
  addLine("Fabricante:", project.inverterManufacturer);
  addLine("Modelo:", project.inverterModel);
  addLine("Potência de Saída (kW):", project.inverterOutputPower);
  addLine("Corrente Máxima de Saída (A):", project.inverterOutputCurrent);
  yPos += 10;

  // --- 5. UNIDADES CONSUMIDORAS ---
  addSectionTitle("5. RATEIO POR UNIDADES CONSUMIDORAS");
  
  const tableData = project.units.map(u => [
    u.code,
    u.name,
    u.monthlyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    u.requiredKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    u.requiredModules.toString()
  ]);

  tableData.push([
    "TOTAL",
    "-",
    project.units.reduce((acc, u) => acc + u.monthlyCons, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    project.totalKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    project.totalModules.toString()
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [['Código', 'Nome da Unidade', 'Média (kWh)', 'kWp', 'Módulos']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237] }, // violet-600
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  });

  // Salva o arquivo
  const projName = project.name || "SemNome";
  const fileName = `Memorial_${client.name.replace(/[^a-z0-9]/gi, "_")}_${projName.replace(/[^a-z0-9]/gi, "_")}.pdf`;
  doc.save(fileName);
};
