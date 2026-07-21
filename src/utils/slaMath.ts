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
