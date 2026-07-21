/**
 * Constantes globais de dimensionamento fotovoltaico
 */
export const SOLAR_CONSTANTS = {
  DEFAULT_IRRADIATION: 4.0, // Horas de Sol Pleno (HSP)
  DAYS_IN_MONTH: 30,
  /** Margem de segurança de 10% para compensar meses com menor incidência solar */
  GENERATION_SAFETY_MARGIN: 1.10,
  /** Taxa de degradação anual padrão dos painéis solares (0,5%/ano) */
  ANNUAL_DEGRADATION_RATE: 0.005,
  /** Fator de perdas globais padrão (15% por inclinação, orientação e sujidade) */
  DEFAULT_LOSS_FACTOR_PERCENT: 15,
};

/**
 * Retorna a porcentagem de cobrança do Fio B (Lei 14.300) para cada ano de projeto
 */
export function getFioBTaxPercentage(yearOffset: number): number {
  const currentYear = new Date().getFullYear() + yearOffset;
  if (currentYear <= 2022) return 0;
  if (currentYear === 2023) return 0.15;
  if (currentYear === 2024) return 0.30;
  if (currentYear === 2025) return 0.45;
  if (currentYear === 2026) return 0.60;
  if (currentYear === 2027) return 0.75;
  if (currentYear === 2028) return 0.90;
  return 1.00; // 2029 em diante
}

export type OversizingStatus = {
  ratioPercent: number;
  status: 'SUBDIMENSIONADO' | 'IDEAL' | 'OVERLOAD_RISK';
  label: string;
  badgeColor: string;
};

/**
 * Valida a relação de Oversizing CC/CA (Painéis vs Inversor)
 */
export function calculateOversizingRatio(totalKwpCC: number, inverterOutputPowerKwCA: number): OversizingStatus {
  if (!totalKwpCC || !inverterOutputPowerKwCA || inverterOutputPowerKwCA <= 0) {
    return {
      ratioPercent: 100,
      status: 'IDEAL',
      label: '100% (Ajustado)',
      badgeColor: 'bg-secondary text-muted-foreground'
    };
  }

  const ratio = (totalKwpCC / inverterOutputPowerKwCA) * 100;
  const ratioPercent = Math.round(ratio);

  if (ratioPercent < 110) {
    return {
      ratioPercent,
      status: 'SUBDIMENSIONADO',
      label: `${ratioPercent}% — Subdimensionado (Potência CC baixa)`,
      badgeColor: 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
    };
  }
  if (ratioPercent <= 150) {
    return {
      ratioPercent,
      status: 'IDEAL',
      label: `${ratioPercent}% — Relação CC/CA Ideal (Excelente dimensionamento)`,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
    };
  }
  return {
    ratioPercent,
    status: 'OVERLOAD_RISK',
    label: `${ratioPercent}% — Alerta: Risco de Clipping / Sobrecarga no Inversor (> 150%)`,
    badgeColor: 'bg-red-500/10 text-red-400 border border-red-500/30'
  };
}

/**
 * Calcula os dados de dimensionamento para uma única unidade consumidora.
 * Suporta o parâmetro ajustável de perdas globais (%) por sombreamento e orientação.
 */
export function calculateUnitSolarData(
  monthlyCons: number, 
  modulePowerW: number, 
  irradiation: number = SOLAR_CONSTANTS.DEFAULT_IRRADIATION,
  lossFactorPercent: number = SOLAR_CONSTANTS.DEFAULT_LOSS_FACTOR_PERCENT
) {
  const dailyCons = monthlyCons / SOLAR_CONSTANTS.DAYS_IN_MONTH;
  const efficiencyFactor = 1 - (lossFactorPercent / 100);
  const effectiveIrradiation = irradiation * efficiencyFactor;
  const requiredKwp = (dailyCons / Math.max(0.1, effectiveIrradiation)) * SOLAR_CONSTANTS.GENERATION_SAFETY_MARGIN;
  const modulePowerKwp = modulePowerW / 1000;
  const requiredModules = Math.ceil(requiredKwp / modulePowerKwp);

  return {
    dailyCons,
    requiredKwp,
    requiredModules
  };
}

/**
 * Soma os totais de um conjunto de unidades processadas.
 */
export function calculateProjectTotals(units: { requiredKwp: number; requiredModules: number }[]) {
  return units.reduce(
    (acc, unit) => ({
      totalKwp: acc.totalKwp + unit.requiredKwp,
      totalModules: acc.totalModules + unit.requiredModules,
    }),
    { totalKwp: 0, totalModules: 0 }
  );
}

/**
 * Calcula a projeção financeira de 25 anos considerando:
 * - Degradação anual da produção do sistema (0.5%/ano)
 * - Escalonamento do Fio B (Lei 14.300)
 * - Retorno Acumulado (ROI) e ano de Payback
 */
export function calculateAdvancedFinancials({
  totalKwp,
  tariffPerKwh = 0.95,
  fioBBaseTariff = 0.28,
  initialInvestmentCost = 0,
  lossFactorPercent = 15,
  irradiation = 4.0
}: {
  totalKwp: number;
  tariffPerKwh?: number;
  fioBBaseTariff?: number;
  initialInvestmentCost?: number;
  lossFactorPercent?: number;
  irradiation?: number;
}) {
  const annualCashflow: { year: number; generationKwh: number; grossSavings: number; fioBCost: number; netSavings: number; accumulatedCashflow: number }[] = [];
  
  const dailyGeneration = totalKwp * irradiation * (1 - lossFactorPercent / 100);
  const baseMonthlyGeneration = dailyGeneration * SOLAR_CONSTANTS.DAYS_IN_MONTH;
  const baseAnnualGeneration = baseMonthlyGeneration * 12;

  let accumulated = -initialInvestmentCost;
  let paybackYear = 25;

  for (let year = 1; year <= 25; year++) {
    // Aplicar degradação anual dos módulos (0.5%/ano a partir do ano 2)
    const degradationMultiplier = Math.pow(1 - SOLAR_CONSTANTS.ANNUAL_DEGRADATION_RATE, year - 1);
    const generationKwh = baseAnnualGeneration * degradationMultiplier;
    
    const grossSavings = generationKwh * tariffPerKwh;
    const fioBTaxPercent = getFioBTaxPercentage(year - 1);
    const fioBCost = generationKwh * fioBBaseTariff * fioBTaxPercent;
    const netSavings = Math.max(0, grossSavings - fioBCost);

    accumulated += netSavings;

    if (accumulated >= 0 && paybackYear === 25) {
      paybackYear = year;
    }

    annualCashflow.push({
      year,
      generationKwh: Math.round(generationKwh),
      grossSavings: Math.round(grossSavings),
      fioBCost: Math.round(fioBCost),
      netSavings: Math.round(netSavings),
      accumulatedCashflow: Math.round(accumulated)
    });
  }

  const total25YearSavings = annualCashflow.reduce((acc, item) => acc + item.netSavings, 0);

  return {
    baseMonthlyGeneration: Math.round(baseMonthlyGeneration),
    baseAnnualGeneration: Math.round(baseAnnualGeneration),
    paybackYear,
    total25YearSavings: Math.round(total25YearSavings),
    annualCashflow
  };
}
