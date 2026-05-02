import jsPDF from "jspdf";
import { Project, ClientDetail } from "@/types";

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
  doc.text("Número da Instalação: ", 30, 220);
  setFontNormal();
  doc.text(client.installationNumber || "", 75, 220);

  setFontBold();
  doc.text("Endereço/Município: ", 30, 230);
  setFontNormal();
  const fullAddress = [client.address, client.neighborhood, client.city].filter(Boolean).join(', ');
  doc.text(fullAddress || "", 75, 230);

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
  yPos += addParagraph(
    `Geração de ${project.totalKwp?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kW de potência de pico com fornecimento de ${project.generationKwh || 0} kWh/mês de energia elétrica. Redução em torno de ${project.reductionPercent || 0}% na fatura de energia elétrica.`,
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
  const fullLocation = [client.address, client.neighborhood, client.city].filter(Boolean).join(', ');
  yPos += addParagraph(
    `A instalação fotovoltaica será realizada sobre estrutura no telhado, situada em: ${fullLocation || "Endereço não informado"}${client.cep ? `, CEP: ${client.cep}` : ""}.`,
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
  doc.text(`Área dos arranjos (m2): ${project.moduleArea || "-"}`, 14, yPos); yPos += 5;
  doc.text(`Potência máxima: ${project.modulePower || 0} WP`, 14, yPos); yPos += 5;
  doc.text(`Corrente máxima: ${project.moduleCurrent || "-"} A`, 14, yPos); yPos += 10;

  setFontBold();
  doc.text("4.2 – Inversor 01", 14, yPos);
  yPos += 8;
  setFontNormal();
  doc.text(`Fabricante: ${project.inverterManufacturer || "-"}`, 14, yPos); yPos += 5;
  doc.text(`Modelo: ${project.inverterModel || "-"}`, 14, yPos); yPos += 5;
  doc.text(`Quantidade de inversores: 1`, 14, yPos); yPos += 5;
  doc.text(`Potência máxima de saída: ${project.inverterOutputPower || "-"} W`, 14, yPos); yPos += 5;
  doc.text(`Corrente máxima de saída: ${project.inverterOutputCurrent || "-"} A`, 14, yPos); yPos += 5;
  doc.text(`Fator de potência: 0,8 capacitivo a 0,8 indutivo`, 14, yPos); yPos += 10;

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
  doc.text(`Área mínima que o sistema ocupará é de ${project.areaOccupied || "-"} m².`, 14, yPos); yPos += 10;

  doc.text("Arranjo dos painéis:", 14, yPos); yPos += 5;
  yPos += addParagraph(
    `Os ${project.totalModules || 0} módulos serão conectados e divididos em strings de acordo com os limites de tensão e corrente das entradas MPPT do inversor especificado.`,
    14, yPos, 180
  );
  yPos += 5;

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

  doc.text("Inversor:", 14, yPos); yPos += 5;
  yPos += addParagraph(
    `Serão utilizados um inversor da marca ${project.inverterManufacturer?.toUpperCase() || "-"} operando em ${project.inverterOutputCurrent || "-"}A (CA) com potência de ${project.inverterOutputPower || "-"} W, modelo ${project.inverterModel || "-"}. Não será utilizado transformador, pois a conexão da unidade consumidora é 220V.`,
    14, yPos, 180
  );
  yPos += 30;

  // Assinatura
  const today = new Date();
  const dateString = `${client.city || "Local"}, ${today.getDate()} de ${today.toLocaleString('pt-BR', { month: 'long' })} de ${today.getFullYear()}.`;
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
