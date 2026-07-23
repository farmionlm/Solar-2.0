"use client";

import React from "react";
import { Clock, AlertTriangle, CheckCircle2, AlertOctagon, TrendingUp } from "lucide-react";
import { calculatePredictiveConcessionariaSla } from "@/utils/slaMath";

interface SlaCountdownBadgeProps {
  protocolDate?: string | Date | null;
  targetDays?: number;
  historicalAverageDays?: number;
  className?: string;
}

export const SlaCountdownBadge: React.FC<SlaCountdownBadgeProps> = ({
  protocolDate,
  targetDays = 15,
  historicalAverageDays,
  className = "",
}) => {
  if (!protocolDate) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/40 text-muted-foreground border border-border ${className}`}>
        <Clock className="w-3.5 h-3.5" /> Aguardando Protocolo
      </span>
    );
  }

  const sla = calculatePredictiveConcessionariaSla(protocolDate, historicalAverageDays || targetDays);

  if (sla.statusLevel === "OVERDUE") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-950/80 text-red-400 border border-red-500/50 animate-pulse shadow-lg shadow-red-500/10 ${className}`}>
        <AlertOctagon className="w-3.5 h-3.5" /> {sla.badgeText}
      </span>
    );
  }

  if (sla.statusLevel === "CRITICAL") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-950/90 text-amber-300 border border-amber-500/50 animate-bounce ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5" /> {sla.badgeText}
      </span>
    );
  }

  if (sla.statusLevel === "ATTENTION") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-900/30 text-amber-400 border border-amber-500/30 ${className}`}>
        <Clock className="w-3.5 h-3.5" /> {sla.badgeText}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 ${className}`}>
      <CheckCircle2 className="w-3.5 h-3.5" /> {sla.badgeText}
    </span>
  );
};
