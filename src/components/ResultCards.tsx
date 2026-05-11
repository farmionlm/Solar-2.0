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
      <Card className="bg-gradient-to-br from-card to-background text-foreground shadow-xl border border-border relative overflow-hidden">
        <CardContent className="p-6">
          <div className="absolute -right-4 -top-4 opacity-5 text-primary"><Sun className="w-32 h-32" /></div>
          <h3 className="text-muted-foreground font-medium mb-1 relative z-10">Módulo Base</h3>
          <div className="text-4xl font-bold relative z-10 text-foreground">{modulePower} <span className="text-xl text-muted-foreground font-normal">W</span></div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-secondary/80 to-card text-foreground shadow-xl border border-border">
        <CardContent className="p-6">
          <h3 className="text-primary font-medium mb-1">Total kWp Necessário</h3>
          <div className="text-4xl font-bold text-foreground">{totalKwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-xl text-muted-foreground font-normal">kWp</span></div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary to-accent-color-dark text-primary-foreground shadow-lg shadow-primary/20 border-0">
        <CardContent className="p-6">
          <h3 className="text-primary-foreground/80 font-medium mb-1">Total de Módulos</h3>
          <div className="text-4xl font-bold">{totalModules} <span className="text-xl text-primary-foreground/70 font-normal">unid.</span></div>
        </CardContent>
      </Card>
    </div>
  );
};
