/**
 /**
  * Mapping of average electricity tariffs (R$/kWh) by Brazilian Concessionária / State UF
  * Includes TE + TUSD + average taxes (PIS/COFINS/ICMS).
  */

export const DEFAULT_TARIFF_RATE = 0.95;

export const TARIFF_RATES_BY_CONCESSIONARIA: Record<string, number> = {
  "EDP ESPÍRITO SANTO": 0.92,
  "EDP ES": 0.92,
  "EDP SÃO PAULO": 0.91,
  "CEMIG": 0.98,
  "ENEL SP": 0.89,
  "ENEL SÃO PAULO": 0.89,
  "ENEL RJ": 1.05,
  "ENEL RIO DE JANEIRO": 1.05,
  "LIGHT": 1.05,
  "CPFL PAULISTA": 0.94,
  "CPFL PIRATININGA": 0.93,
  "COPEL": 0.87,
  "CELESC": 0.84,
  "NEOENERGIA COELBA": 0.95,
  "NEOENERGIA CELPE": 0.91,
  "NEOENERGIA COSERN": 0.93,
  "NEOENERGIA ELEKTRO": 0.90,
  "EQUATORIAL GOIÁS": 0.90,
  "EQUATORIAL MARANHÃO": 0.99,
  "EQUATORIAL PARÁ": 1.02,
  "ENERGISA MATO GROSSO": 0.96,
  "ENERGISA MATO GROSSO DO SUL": 0.95,
  "ENERGISA PARAÍBA": 0.94,
  "SULGIRO / RGE": 0.92,
};

export const CONCESSIONARIAS_LIST = [
  "EDP ESPÍRITO SANTO",
  "EDP SÃO PAULO",
  "CEMIG",
  "ENEL SP",
  "ENEL RJ",
  "LIGHT",
  "CPFL PAULISTA",
  "CPFL PIRATININGA",
  "COPEL",
  "CELESC",
  "NEOENERGIA COELBA",
  "NEOENERGIA CELPE",
  "NEOENERGIA COSERN",
  "NEOENERGIA ELEKTRO",
  "EQUATORIAL GOIÁS",
  "EQUATORIAL MARANHÃO",
  "EQUATORIAL PARÁ",
  "ENERGISA MATO GROSSO",
  "ENERGISA MATO GROSSO DO SUL",
  "ENERGISA PARAÍBA",
  "SULGIRO / RGE",
];

export const TARIFF_RATES_BY_UF: Record<string, number> = {
  ES: 0.92,
  MG: 0.98,
  SP: 0.91,
  RJ: 1.05,
  PR: 0.87,
  SC: 0.84,
  RS: 0.92,
  BA: 0.95,
  PE: 0.91,
  RN: 0.93,
  CE: 0.94,
  MA: 0.99,
  PA: 1.02,
  GO: 0.90,
  MT: 0.96,
  MS: 0.95,
  DF: 0.89,
  AM: 0.97,
  PB: 0.94,
  AL: 0.96,
  SE: 0.93,
  PI: 0.98,
  TO: 0.95,
  RO: 0.93,
  AC: 0.96,
  AP: 0.94,
  RR: 0.91,
};

/**
 * Resolves the recommended electricity tariff (R$/kWh) based on distributor name or UF.
 */
export function getRecommendedTariffRate(concessionaria?: string | null, uf?: string | null): number {
  if (concessionaria) {
    const upperConc = concessionaria.trim().toUpperCase();
    for (const [key, rate] of Object.entries(TARIFF_RATES_BY_CONCESSIONARIA)) {
      if (upperConc.includes(key) || key.includes(upperConc)) {
        return rate;
      }
    }
  }

  if (uf) {
    const upperUf = uf.trim().toUpperCase();
    if (TARIFF_RATES_BY_UF[upperUf]) {
      return TARIFF_RATES_BY_UF[upperUf];
    }
  }

  return DEFAULT_TARIFF_RATE;
}
