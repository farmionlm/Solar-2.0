/**
 * Constantes globais de dimensionamento
 */
export const SOLAR_CONSTANTS = {
  DEFAULT_IRRADIATION: 4.0, // Horas de Sol Pleno (HSP)
  DAYS_IN_MONTH: 30,
};

/**
 * Calcula os dados de dimensionamento para uma única unidade consumidora.
 */
export function calculateUnitSolarData(
  monthlyCons: number, 
  modulePowerW: number, 
  irradiation: number = SOLAR_CONSTANTS.DEFAULT_IRRADIATION
) {
  const dailyCons = monthlyCons / SOLAR_CONSTANTS.DAYS_IN_MONTH;
  const requiredKwp = dailyCons / irradiation;
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
