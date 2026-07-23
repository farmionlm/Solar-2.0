export interface SlaStatusResult {
  protocolDate: Date;
  dueDate: Date;
  businessDaysElapsed: number;
  daysRemaining: number;
  isOverdue: boolean;
  statusLevel: "NORMAL" | "ATTENTION" | "CRITICAL" | "OVERDUE";
  badgeText: string;
}

/**
 * Adiciona N dias úteis (descontando sábados e domingos) a uma data inicial.
 */
export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const current = new Date(startDate);
  let added = 0;

  while (added < businessDays) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  return current;
}

/**
 * Calcula a quantidade de dias úteis entre duas datas.
 */
export function countBusinessDaysBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return -countBusinessDaysBetween(end, start);

  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const target = new Date(end);
  target.setHours(0, 0, 0, 0);

  while (current < target) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  return count;
}

/**
 * Utilitário de cálculo do SLA de Parecer de Acesso da Concessionária (15 dias úteis regulatórios ANEEL).
 */
export function calculateConcessionariaSla(
  protocolDateInput: string | Date,
  targetBusinessDays: number = 15
): SlaStatusResult {
  const protocolDate = new Date(protocolDateInput);
  const now = new Date();

  const dueDate = addBusinessDays(protocolDate, targetBusinessDays);

  const businessDaysElapsed = countBusinessDaysBetween(protocolDate, now);
  const daysRemaining = targetBusinessDays - businessDaysElapsed;

  const isOverdue = daysRemaining < 0;

  let statusLevel: "NORMAL" | "ATTENTION" | "CRITICAL" | "OVERDUE" = "NORMAL";
  let badgeText = `${daysRemaining} dias úteis p/ Parecer`;

  if (isOverdue) {
    statusLevel = "OVERDUE";
    badgeText = `Prazo Estourado (${Math.abs(daysRemaining)}d em atraso)`;
  } else if (daysRemaining === 0) {
    statusLevel = "CRITICAL";
    badgeText = "Vence Hoje!";
  } else if (daysRemaining <= 3) {
    statusLevel = "ATTENTION";
    badgeText = `Atenção: Vence em ${daysRemaining}d úteis`;
  } else {
    statusLevel = "NORMAL";
    badgeText = `${daysRemaining}d úteis p/ resposta`;
  }

  return {
    protocolDate,
    dueDate,
    businessDaysElapsed,
    daysRemaining,
    isOverdue,
    statusLevel,
    badgeText,
  };
}

export interface PredictiveSlaResult extends SlaStatusResult {
  estimatedApprovalDate: Date;
  historicalAverageDays: number;
  predictiveBadgeText: string;
}

/**
 * Utilitário de SLA Preditivo baseado no tempo histórico real da concessionária (H2).
 * Compara os 15 dias regulatórios ANEEL com a média histórica real calculada dos processos.
 */
export function calculatePredictiveConcessionariaSla(
  protocolDateInput: string | Date,
  historicalAverageDays: number = 15
): PredictiveSlaResult {
  const baseSla = calculateConcessionariaSla(protocolDateInput, 15);
  const protocolDate = new Date(protocolDateInput);
  
  // Usar a média histórica real (se houver pelo menos 1 processo concluído), ou 15 como fallback
  const effectiveTargetDays = historicalAverageDays > 0 ? Math.round(historicalAverageDays) : 15;
  const estimatedApprovalDate = addBusinessDays(protocolDate, effectiveTargetDays);
  
  const daysDiff = effectiveTargetDays - 15;
  let predictiveBadgeText = `${baseSla.badgeText} (Média Histórica: ${effectiveTargetDays}d úteis)`;

  if (daysDiff > 0) {
    predictiveBadgeText = `⚠️ Histórico local: ~${effectiveTargetDays}d úteis (${daysDiff}d além do prazo ANEEL)`;
  } else if (daysDiff < 0) {
    predictiveBadgeText = `⚡ Concessionária rápida: responde em ~${effectiveTargetDays}d úteis`;
  }

  return {
    ...baseSla,
    estimatedApprovalDate,
    historicalAverageDays: effectiveTargetDays,
    predictiveBadgeText,
  };
}
