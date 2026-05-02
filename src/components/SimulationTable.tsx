import React from 'react';
import { ProcessedUnit } from '@/types';

interface SimulationTableProps {
  units: ProcessedUnit[];
}

export const SimulationTable: React.FC<SimulationTableProps> = ({ units }) => {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Código</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider">Nome da Unidade</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">Média (kWh)</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">Diário (kWh)</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">kWp</th>
              <th className="p-4 font-semibold text-slate-600 text-sm uppercase tracking-wider text-right">Módulos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map((unit, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-slate-700 font-medium">{unit.code}</td>
                <td className="p-4 text-slate-700">{unit.name}</td>
                <td className="p-4 text-slate-600 text-right font-mono">{unit.monthlyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-slate-600 text-right font-mono">{unit.dailyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-slate-900 font-semibold text-right font-mono">{unit.requiredKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-slate-900 font-bold text-right">{unit.requiredModules}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
