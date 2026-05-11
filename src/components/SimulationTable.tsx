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
    <div className="border border-border rounded-2xl overflow-x-auto shadow-xl bg-card">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="border-border">
            <TableHead className="font-bold text-muted-foreground uppercase tracking-wider h-14">Código</TableHead>
            <TableHead className="font-bold text-muted-foreground uppercase tracking-wider h-14">Nome da Unidade</TableHead>
            <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-right h-14">Média (kWh)</TableHead>
            <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-right h-14">Diário (kWh)</TableHead>
            <TableHead className="font-bold text-primary uppercase tracking-wider text-right h-14">kWp</TableHead>
            <TableHead className="font-bold text-primary uppercase tracking-wider text-right h-14">Módulos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((unit, idx) => (
            <TableRow key={idx} className="hover:bg-secondary/20 transition-colors border-border">
              <TableCell className="font-medium text-foreground py-4">{unit.code}</TableCell>
              <TableCell className="text-muted-foreground py-4">{unit.name}</TableCell>
              <TableCell className="text-muted-foreground text-right font-mono py-4">{unit.monthlyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-muted-foreground text-right font-mono py-4">{unit.dailyCons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-primary font-bold text-right font-mono py-4">{unit.requiredKwp.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
              <TableCell className="text-primary font-black text-right py-4 text-lg">{unit.requiredModules}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
