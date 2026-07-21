"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  HelpCircle, 
  Menu, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  ExternalLink,
  Check
} from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { calculateConcessionariaSla } from "@/utils/slaMath";
import { AppNotification } from "@/types";

interface NavbarProps {
  onOpenMobileSidebar?: () => void;
}

export function Navbar({ onOpenMobileSidebar }: NavbarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [slaAlerts, setSlaAlerts] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carregar Notificações do Banco + Calcular alertas de SLA
  const fetchNotificationsAndSla = async () => {
    if (!session?.user) return;
    setLoading(true);

    try {
      // 1. Buscar Notificações do Banco
      const resNotif = await fetch('/api/notifications');
      let dbNotifs: AppNotification[] = [];
      if (resNotif.ok) {
        dbNotifs = await resNotif.json();
      }

      // 2. Buscar Clientes para alerta dinâmico de SLA
      const resClients = await fetch('/api/clients');
      const dynamicSlaAlerts: AppNotification[] = [];

      if (resClients.ok) {
        const clients = await resClients.json();
        clients.forEach((client: any) => {
          if (client.protocolDate) {
            const sla = calculateConcessionariaSla(client.protocolDate);
            if (sla.statusLevel === "OVERDUE" || sla.statusLevel === "CRITICAL" || sla.statusLevel === "ATTENTION") {
              const type = sla.statusLevel === "OVERDUE" ? "CRITICAL" : sla.statusLevel === "CRITICAL" ? "CRITICAL" : "WARNING";
              dynamicSlaAlerts.push({
                id: `sla-${client.id}`,
                createdAt: new Date().toISOString(),
                title: sla.isOverdue 
                  ? `🚨 SLA Estourado — ${client.name}` 
                  : sla.daysRemaining === 0 
                  ? `⚡ SLA Vence Hoje — ${client.name}` 
                  : `⚠️ SLA em Atenção — ${client.name}`,
                message: `${sla.badgeText}. Concessionária: ${client.concessionaria || "Não informada"}.`,
                type,
                read: false,
                link: `/clientes/${client.id}`,
                clientId: client.id,
                clientName: client.name,
                userId: session.user.id,
              });
            }
          }
        });
      }

      setNotifications(dbNotifs);
      setSlaAlerts(dynamicSlaAlerts);
    } catch (err) {
      console.error("Erro ao carregar notificações/SLA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationsAndSla();
    const interval = setInterval(fetchNotificationsAndSla, 30000); // Polling a cada 30s
    return () => clearInterval(interval);
  }, [session]);

  // Lista unificada
  const allNotifications = [...slaAlerts, ...notifications];
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setSlaAlerts(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.read && !notif.id.startsWith('sla-')) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notif.id }),
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      } catch (err) {
        console.error(err);
      }
    }
    if (notif.link) {
      setShowNotifications(false);
      router.push(notif.link);
    }
  };

  const getIconComponent = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
            title="Notificações e Alertas SLA"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 px-1.5 min-w-[18px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 md:w-96 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">Central de Alertas</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
                      {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Lidas
                  </button>
                )}
              </div>

              <div className="py-3 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {loading && allNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Carregando notificações...
                  </div>
                ) : allNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                    <p className="font-medium text-foreground">Tudo em dia!</p>
                    <p className="text-[11px]">Nenhum alerta de SLA ou notificação pendente.</p>
                  </div>
                ) : (
                  allNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        notif.read 
                          ? 'bg-secondary/20 border-transparent hover:bg-secondary/40' 
                          : notif.type === 'CRITICAL'
                          ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                          : notif.type === 'WARNING'
                          ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                          : 'bg-primary/10 border-primary/20 hover:bg-primary/20'
                      }`}
                    >
                      {getIconComponent(notif.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-foreground truncate">{notif.title}</p>
                          {notif.link && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground/80 font-medium">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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

