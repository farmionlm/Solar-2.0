import React from 'react';
import { ProcessedUnit } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SimulationTableProps {
  units: ProcessedUnit[];
}

export const SimulationTable: React.FC<SimulationTableProps> = ({ units }) => {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-semibold text-slate-600 uppercase tracking-wider h-12">Código</TableHead>
            <TableHead className="font-semibold text-slate-600 uppercase tracking-wider h-12">Nome da Unidade</TableHead>
            <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-right h-12">Média (kWh)</TableHead>
            <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-right h-12">Diário (kWh)</TableHead>
            <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-right h-12">kWp</TableHead>
            <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-right h-12">Módulos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit, idx) => (
            <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
              <TableCell className="font-medium text-slate-700 py-4">{unit.code}</TableCell>
              <TableCell className="text-slate-700 py-4">{unit.name}</TableCell>
              <TableCell className="text-slate-600 text-right font-mono py-4">{unit.monthlyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-slate-600 text-right font-mono py-4">{unit.dailyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-slate-900 font-semibold text-right font-mono py-4">{unit.requiredKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-slate-900 font-bold text-right py-4">{unit.requiredModules}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
