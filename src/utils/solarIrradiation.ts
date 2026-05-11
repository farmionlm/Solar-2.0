/**
 * Tabela de Irradiação Solar Média Anual por Estado (UF) do Brasil.
 * Os valores representam a média em Horas de Sol Pleno (HSP).
 * Estes são valores aproximados e conservadores, adequados para uma estimativa inicial.
 */
export const HSP_BY_UF: Record<string, number> = {
  "AC": 4.5,
  "AL": 5.2,
  "AP": 4.5,
  "AM": 4.5,
  "BA": 5.4,
  "CE": 5.5,
  "DF": 5.2,
  "ES": 4.8,
  "GO": 5.2,
  "MA": 5.1,
  "MT": 5.2,
  "MS": 5.0,
  "MG": 5.2,
  "PA": 4.8,
  "PB": 5.5,
  "PR": 4.5,
  "PE": 5.4,
  "PI": 5.5,
  "RJ": 4.7,
  "RN": 5.5,
  "RS": 4.4,
  "RO": 4.8,
  "RR": 4.8,
  "SC": 4.3,
  "SP": 4.6,
  "SE": 5.1,
  "TO": 5.2,
};

/**
 * Irradiação média padrão de segurança (4.0 HSP) 
 * usada quando o UF não for fornecido ou for inválido.
 */
export const DEFAULT_HSP = 4.0;
