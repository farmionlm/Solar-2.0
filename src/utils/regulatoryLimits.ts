export type RegulatoryAlert = {
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
};

/**
 * Tabela de limites de enquadramento regulatório ANEEL (REN 482/2012, REN 687/2015 e Lei 14.300/2022)
 */
export const REGULATORY_LIMITS = {
  MICRO_GD_MAX_KWP: 75,       // Microgeração Distribuída: ≤ 75 kWp
  MINI_GD_MAX_KWP: 5000,     // Minigeração Distribuída: ≤ 5.000 kWp (5 MWp)
  GRUPO_B_MAX_KWP: 75,        // Baixa Tensão (Grupo B): limite usual sem troca para Grupo A
};

/**
 * Valida se a potência instalada total (kWp) requer mudança de enquadramento
 * regulatório ou contrato de demanda com a concessionária.
 */
export function validateRegulatoryLimits(
  totalKwp: number,
  grupoTarifario?: string
): RegulatoryAlert[] {
  const alerts: RegulatoryAlert[] = [];

  if (!totalKwp || totalKwp <= 0) return alerts;

  // 1. Alerta de transição de Microgeração (≤ 75 kWp) para Minigeração (> 75 kWp)
  if (totalKwp > REGULATORY_LIMITS.MICRO_GD_MAX_KWP && totalKwp <= REGULATORY_LIMITS.MINI_GD_MAX_KWP) {
    alerts.push({
      level: 'WARNING',
      title: '⚡ Enquadramento: Minigeração Distribuída (Mini-GD)',
      message: `Sistema com ${totalKwp} kWp ultrapassa 75 kWp (limite de Micro-GD). Exige estudo de rede mais detalhado, subestação própria e projeto de Minigeração.`,
    });
  }

  // 2. Alerta de limite máximo de Minigeração (> 5.000 kWp / 5 MWp)
  if (totalKwp > REGULATORY_LIMITS.MINI_GD_MAX_KWP) {
    alerts.push({
      level: 'CRITICAL',
      title: '🚨 Limite Excedido da Geração Distribuída',
      message: `Potência de ${totalKwp} kWp ultrapassa o limite legal de 5 MWp da Geração Distribuída ANEEL (Lei 14.300). Requer enquadramento no Mercado Livre (ACL) ou Usina de Geração Centralizada (GC).`,
    });
  }

  // 3. Alerta de enquadramento por Grupo Tarifário (se informado ou extraído via OCR)
  const grupoUpper = (grupoTarifario || '').toUpperCase();
  
  if (grupoUpper.includes('GRUPO B') || grupoUpper.includes('B1') || grupoUpper.includes('B2') || grupoUpper.includes('B3')) {
    if (totalKwp > 75) {
      alerts.push({
        level: 'WARNING',
        title: '⚠️ Exige Migração para Grupo A (Média Tensão)',
        message: `Cliente atualmente no Grupo B (Baixa Tensão), mas sistema de ${totalKwp} kWp exige padrão de entrada no Grupo A4 (Média Tensão) e contratação de Demanda de Potência com a concessionária.`,
      });
    }
  }

  if (grupoUpper.includes('GRUPO A') || grupoUpper.includes('A4') || grupoUpper.includes('VERDE') || grupoUpper.includes('AZUL')) {
    alerts.push({
      level: 'INFO',
      title: 'ℹ️ Cliente Grupo A (Média Tensão)',
      message: `Lembre-se de conferir se a Demanda Contratada (kW) do cliente é compatível com a potência de injeção gerada pelo inversor (${totalKwp} kWp).`,
    });
  }

  return alerts;
}
