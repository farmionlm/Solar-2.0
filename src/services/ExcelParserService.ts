import * as XLSX from "xlsx";
import { ProcessedUnit } from "@/types";
import { calculateUnitSolarData, calculateProjectTotals } from "@/utils/solarMath";

export class ExcelParserService {
  /**
   * Parses an Excel ArrayBuffer and returns the extracted data as a 2D array.
   */
  static parseBuffer(buffer: ArrayBuffer): any[][] {
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    return jsonData;
  }

  /**
   * Processes the raw 2D array data from Excel and calculates solar requirements.
   */
  static calculateUnits(data: any[][], modulePower: number, irradiation?: number): { units: ProcessedUnit[], totalKwp: number, totalModules: number } {
    if (data.length < 2) {
      throw new Error("A planilha parece estar vazia ou não contém dados suficientes.");
    }

    const headers = data[0].map((h) => String(h).toLowerCase());

    let codeIdx = -1;
    let nameIdx = -1;
    let consIdx = -1;

    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h.includes("cód") || h.includes("cod") || h.includes("instala")) codeIdx = codeIdx === -1 ? i : codeIdx;
      if (h.includes("nome") || h.includes("escola") || h.includes("unidade")) nameIdx = nameIdx === -1 ? i : nameIdx;
      if (h.includes("consumo") || h.includes("média") || h.includes("media") || h.includes("kwh")) consIdx = consIdx === -1 ? i : consIdx;
    }

    if (codeIdx === -1 && headers.length > 0) codeIdx = 0;
    if (nameIdx === -1 && headers.length > 1) nameIdx = 1;
    if (consIdx === -1 && headers.length > 2) consIdx = 2;

    if (codeIdx === -1 || nameIdx === -1 || consIdx === -1) {
      throw new Error("Não foi possível identificar as colunas necessárias na planilha.");
    }

    const processedUnits: ProcessedUnit[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || (!row[codeIdx] && !row[nameIdx] && !row[consIdx])) continue;

      const code = String(row[codeIdx] || "N/A");
      const name = String(row[nameIdx] || "N/A");
      const rawCons = String(row[consIdx]).replace(",", ".").replace(/[^\d.-]/g, "");
      const monthlyCons = parseFloat(rawCons);

      if (isNaN(monthlyCons) || monthlyCons <= 0) continue;

      const solarData = calculateUnitSolarData(monthlyCons, modulePower, irradiation);

      processedUnits.push({ 
        code, 
        name, 
        monthlyCons, 
        ...solarData 
      });
    }

    if (processedUnits.length === 0) {
      throw new Error("Nenhum dado numérico válido de consumo foi encontrado.");
    }

    const totals = calculateProjectTotals(processedUnits);

    return {
      units: processedUnits,
      ...totals
    };
  }

  /**
   * Generates a workbook for exporting results to Excel.
   */
  static generateExportWorkbook(
    projectName: string,
    modulePower: number,
    totalKwp: number,
    totalModules: number,
    units: ProcessedUnit[]
  ): XLSX.WorkBook {
    const exportData: any[][] = [
      ["Relatório de Dimensionamento Fotovoltaico"],
      ["Projeto:", projectName || "Dimensionamento Solar"],
      ["Potência do Módulo:", `${modulePower} W`],
      ["Total Necessário:", `${totalKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`],
      ["Total de Módulos:", `${totalModules} unid.`],
      [],
      ["Código de Instalação", "Nome da Escola / Unidade", "Média Mensal (kWh)", "Consumo Diário (kWh/dia)", "kWp Necessário", "Qtd. Módulos"]
    ];

    units.forEach(u => {
      exportData.push([u.code, u.name, u.monthlyCons, u.dailyCons, u.requiredKwp, u.requiredModules]);
    });
    
    exportData.push([
      "TOTAL", "-",
      units.reduce((acc, u) => acc + u.monthlyCons, 0),
      units.reduce((acc, u) => acc + u.dailyCons, 0),
      totalKwp,
      totalModules
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dimensionamento");

    return workbook;
  }
}
