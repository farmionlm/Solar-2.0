"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Bell, 
  HelpCircle, 
  Moon, 
  Sun, 
  Menu, 
  Search, 
  CheckCircle2, 
  User, 
  Building 
} from "lucide-react";
import { UserMenu } from "@/components/UserMenu";

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export function Navbar({ onOpenMobileSidebar }: NavbarProps) {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(3);

  return (
    <header className="h-16 md:h-20 bg-card border-b border-border px-4 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-sm">
      {/* Esquerda: Botão Menu Mobile + Busca / Título */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-md">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary border border-border"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar projetos, clientes ou simuladores..."
            className="w-full bg-secondary/50 focus:bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Direita: Controles de Utilidade + Notificações + UserMenu */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Botão de Ajuda */}
        <button
          onClick={() => alert("Central de Suporte Solar 2.0:\nDúvidas ou assistência técnica? Entre em contato com suporte@solarcalc.pro")}
          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
          title="Ajuda e Suporte"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Central de Notificações */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {notificationsCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <h4 className="font-bold text-sm text-foreground">Notificações</h4>
                <button
                  onClick={() => setNotificationsCount(0)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Marcar como lidas
                </button>
              </div>
              <div className="py-3 space-y-3 max-h-64 overflow-y-auto">
                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Novo projeto dimensionado</p>
                    <p className="text-[11px] text-muted-foreground">O projeto "Escolas Municipais" foi salvo no histórico com 45 kWp.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Funil de Vendas atualizado</p>
                    <p className="text-[11px] text-muted-foreground">Simulação movida para etapa de Negociação.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-border my-auto mx-1" />

        {/* Componente de Perfil do Usuário com avatar, nome e empresa */}
        <UserMenu />
      </div>
    </header>
  );
}
