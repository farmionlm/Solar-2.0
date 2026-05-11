"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { 
  LogOut, User, ShieldCheck, Users, Activity, Settings, 
  LayoutDashboard, ChevronDown, Building
} from 'lucide-react';
import Link from 'next/link';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!session?.user) return null;

  const role = session.user.role;
  const roleLabel = role === 'ADMIN' ? 'Administrador' : role === 'PARTNER' ? 'Parceiro' : 'Técnico';

  // Build nav items based on role
  const navItems: NavItem[] = [
    { href: '/funil', label: 'Funil de Vendas', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  if (role === 'ADMIN') {
    navItems.push(
      { href: '/admin/parceiros', label: 'Parceiros', icon: <Building className="w-4 h-4" /> },
      { href: '/admin/equipamentos', label: 'Catálogo de Equipamentos', icon: <Settings className="w-4 h-4" /> },
      { href: '/auditoria', label: 'Auditoria e Logs', icon: <Activity className="w-4 h-4" /> },
    );
  }

  if (role === 'PARTNER') {
    navItems.push(
      { href: '/tecnicos', label: 'Meus Técnicos', icon: <Users className="w-4 h-4" /> },
      { href: '/configuracoes', label: 'Configurações da Empresa', icon: <Settings className="w-4 h-4" /> },
      { href: '/auditoria', label: 'Auditoria e Logs', icon: <Activity className="w-4 h-4" /> },
    );
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 sm:gap-3 bg-card border border-border hover:border-primary/50 px-3 py-2 rounded-xl shadow-md transition-all group"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          {role === 'ADMIN' ? (
            <ShieldCheck className="w-4 h-4 text-primary" />
          ) : (
            <User className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="hidden sm:block text-left">
          <p className="font-bold text-foreground text-sm leading-none">{session.user.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-semibold">{roleLabel}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <p className="font-black text-foreground text-sm truncate">{session.user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            <span className="mt-1 inline-block bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>
          </div>

          {/* Nav links */}
          <div className="py-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <span className="text-muted-foreground">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-border py-1">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-red-950/30 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair da plataforma
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
