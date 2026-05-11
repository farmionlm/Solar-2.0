"use client";

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, ShieldCheck, Users, Activity, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 bg-card border border-border px-4 py-2 rounded-xl shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          {session.user.role === 'ADMIN' ? (
            <ShieldCheck className="w-4 h-4 text-primary" />
          ) : (
            <User className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="hidden sm:block text-sm">
          <p className="font-bold text-foreground leading-none">{session.user.name}</p>
          <p className="text-xs text-muted-foreground mt-1 font-bold">
            {session.user.role === 'ADMIN' ? 'Administrador' : session.user.role === 'PARTNER' ? 'Parceiro' : 'Técnico'}
          </p>
        </div>
      </div>
      
      <div className="w-px h-8 bg-border mx-1"></div>
      
      {session.user.role === 'ADMIN' && (
        <>
          <Link href="/admin/parceiros">
            <Button 
              variant="ghost" 
              className="text-primary hover:text-primary hover:bg-primary/10 p-2 h-auto rounded-lg"
              title="Gestão de Parceiros"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline-block ml-2 font-bold">Parceiros</span>
            </Button>
          </Link>
          <div className="w-px h-8 bg-border mx-1"></div>
          <Link href="/admin/equipamentos">
            <Button 
              variant="ghost" 
              className="text-primary hover:text-primary hover:bg-primary/10 p-2 h-auto rounded-lg"
              title="Catálogo de Equipamentos"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline-block ml-2 font-bold">Catálogo</span>
            </Button>
          </Link>
          <div className="w-px h-8 bg-border mx-1"></div>
        </>
      )}

      {session.user.role === 'PARTNER' && (
        <>
          <Link href="/tecnicos">
            <Button 
              variant="ghost" 
              className="text-primary hover:text-primary hover:bg-primary/10 p-2 h-auto rounded-lg"
              title="Gestão de Técnicos"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline-block ml-2 font-bold">Técnicos</span>
            </Button>
          </Link>
          <div className="w-px h-8 bg-border mx-1"></div>
        </>
      )}

      {(session.user.role === 'ADMIN' || session.user.role === 'PARTNER') && (
        <>
          <Link href="/auditoria">
            <Button 
              variant="ghost" 
              className="text-primary hover:text-primary hover:bg-primary/10 p-2 h-auto rounded-lg"
              title="Auditoria e Logs"
            >
              <Activity className="w-5 h-5" />
              <span className="hidden sm:inline-block ml-2 font-bold">Auditoria</span>
            </Button>
          </Link>
          <div className="w-px h-8 bg-border mx-1"></div>
        </>
      )}
      
      <Button 
        variant="ghost" 
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-muted-foreground hover:text-red-400 hover:bg-red-950/30 p-2 h-auto rounded-lg"
        title="Sair da plataforma"
      >
        <LogOut className="w-5 h-5" />
        <span className="hidden sm:inline-block ml-2 font-bold">Sair</span>
      </Button>
    </div>
  );
}
