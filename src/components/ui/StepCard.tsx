"use client";

import React from "react";

interface StepCardProps {
  stepNumber: number;
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function StepCard({
  stepNumber,
  title,
  subtitle,
  actionButton,
  statusBadge,
  children,
  className = "",
}: StepCardProps) {
  return (
    <div className={`bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8 mb-6 relative overflow-hidden transition-all hover:border-primary/40 ${className}`}>
      {/* Cabeçalho da Etapa */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-border/60">
        <div className="flex items-start sm:items-center gap-3.5">
          {/* Círculo do Número da Etapa */}
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
            {stepNumber}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black tracking-wider text-foreground uppercase">
                {title}
              </h3>
              {statusBadge}
            </div>
            {subtitle && (
              <p className="text-xs font-medium text-muted-foreground mt-0.5 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actionButton && (
          <div className="shrink-0 self-end sm:self-center">
            {actionButton}
          </div>
        )}
      </div>

      {/* Conteúdo Interno da Etapa */}
      <div>{children}</div>
    </div>
  );
}
