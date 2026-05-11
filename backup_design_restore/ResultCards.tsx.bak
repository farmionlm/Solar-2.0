import React from 'react';
import { Sun } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ResultCardsProps {
  modulePower: number | "";
  totalKwp: number;
  totalModules: number;
}

export const ResultCards: React.FC<ResultCardsProps> = ({ modulePower, totalKwp, totalModules }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-lg relative overflow-hidden border-0">
        <CardContent className="p-6">
          <div className="absolute -right-4 -top-4 opacity-10"><Sun className="w-32 h-32" /></div>
          <h3 className="text-slate-400 font-medium mb-1 relative z-10">Módulo Base</h3>
          <div className="text-4xl font-bold relative z-10">{modulePower} <span className="text-xl text-slate-400 font-normal">W</span></div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 border-0">
        <CardContent className="p-6">
          <h3 className="text-blue-200 font-medium mb-1">Total kWp Necessário</h3>
          <div className="text-4xl font-bold">{totalKwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-xl text-blue-200 font-normal">kWp</span></div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0">
        <CardContent className="p-6">
          <h3 className="text-emerald-100 font-medium mb-1">Total de Módulos</h3>
          <div className="text-4xl font-bold">{totalModules} <span className="text-xl text-emerald-100 font-normal">unid.</span></div>
        </CardContent>
      </Card>
    </div>
  );
};
