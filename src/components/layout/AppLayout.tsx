"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { HelpCircle, X } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Se estiver na tela de login, renderiza apenas o conteúdo original sem a shell de navegação
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex h-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop escuro */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-72 max-w-full bg-card h-full z-10 animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar collapsed={false} />
          </div>
        </div>
      )}

      {/* Conteúdo Principal (Navbar + Main Page Area) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Navbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar relative">
          {children}
        </main>
      </div>

      {/* Widget Flutuante de Suporte / Ajuda no canto inferior direito */}
      <button
        onClick={() => alert("Assistente de Automação Solar 2.0:\nPrecisa de ajuda com o dimensionamento ou relatórios?\nEnvie sua dúvida para suporte@solarcalc.pro")}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group border-2 border-background"
        title="Suporte Técnico"
      >
        <HelpCircle className="w-6 h-6" />
        <span className="absolute right-full mr-3 bg-card border border-border text-foreground px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Precisa de Ajuda?
        </span>
      </button>
    </div>
  );
}
