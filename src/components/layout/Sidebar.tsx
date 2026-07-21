"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Sun, 
  Users, 
  Kanban, 
  History, 
  UserCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  ShieldCheck,
  Building
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isRoleAdmin = session?.user?.role === "ADMIN";
  const isRolePartner = session?.user?.role === "PARTNER";

  const navigationItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Simulador / Automação", href: "/simulador", icon: Sun, badge: "PRO" },
    { label: "Clientes", href: "/clientes", icon: Users },
    { label: "Funil de Vendas", href: "/funil", icon: Kanban },
    { label: "Histórico de Projetos", href: "/historico", icon: History },
    ...(isRoleAdmin || isRolePartner ? [
      { label: "Equipe / Técnicos", href: "/tecnicos", icon: UserCheck }
    ] : []),
    { label: "Configurações Marca", href: "/configuracoes", icon: Settings },
    ...(isRoleAdmin ? [
      { label: "Auditoria", href: "/auditoria", icon: ShieldCheck }
    ] : []),
  ];

  return (
    <aside
      className={`relative flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out z-30 shrink-0 ${
        collapsed ? "w-20" : "w-64 md:w-72"
      }`}
    >
      {/* Botão de recolher/expandir no limite direito da sidebar */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3.5 top-7 z-40 bg-card border border-border text-foreground hover:text-primary hover:border-primary p-1.5 rounded-full shadow-md transition-all active:scale-90"
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header da Sidebar com Identidade da Marca */}
      <div className={`p-4 md:p-6 flex items-center border-b border-border/60 ${collapsed ? "justify-center" : "gap-3"}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-color-dark flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
          <Sun className="w-6 h-6 animate-pulse" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden transition-all">
            <h2 className="font-black text-lg text-foreground tracking-tight whitespace-nowrap">
              Solar 2.0
            </h2>
            <p className="text-[11px] font-bold text-muted-foreground truncate">
              Dimensionamento Inteligente
            </p>
          </div>
        )}
      </div>

      {/* Lista de navegação principal */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              } ${collapsed ? "justify-center px-0" : ""}`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-primary/80"}`} />
              
              {!collapsed && (
                <span className="truncate flex-1 font-semibold">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Tooltip quando a sidebar está recolhida */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-secondary text-foreground text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-border">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Rodapé da Sidebar - Status da Empresa & Logout */}
      <div className="p-3 border-t border-border/60 bg-secondary/20">
        {!collapsed && session?.user && (
          <div className="mb-3 p-2.5 rounded-xl bg-card border border-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
              <Building className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">
                {session.user.name || "Usuário"}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground truncate">
                {session.user.role === "ADMIN" ? "Administrador Master" : session.user.role === "PARTNER" ? "Empresa Parceira" : "Técnico"}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Sair do sistema" : undefined}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-400 hover:bg-red-950/30 hover:text-red-300 border border-transparent hover:border-red-900/30 transition-all ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </aside>
  );
}
