"use client";

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, User, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-4 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
          {session.user.role === 'ADMIN' ? (
            <ShieldCheck className="w-4 h-4 text-violet-600" />
          ) : (
            <User className="w-4 h-4 text-violet-600" />
          )}
        </div>
        <div className="hidden sm:block text-sm">
          <p className="font-bold text-slate-800 leading-none">{session.user.name}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">{session.user.role === 'ADMIN' ? 'Administrador' : 'Parceiro'}</p>
        </div>
      </div>
      
      <div className="w-px h-8 bg-slate-200 mx-1"></div>
      
      {session.user.role === 'ADMIN' && (
        <>
          <Link href="/admin/parceiros">
            <Button 
              variant="ghost" 
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 p-2 h-auto rounded-lg"
              title="Gestão de Parceiros"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline-block ml-2 font-semibold">Parceiros</span>
            </Button>
          </Link>
          <div className="w-px h-8 bg-slate-200 mx-1"></div>
        </>
      )}
      
      <Button 
        variant="ghost" 
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 h-auto rounded-lg"
        title="Sair da plataforma"
      >
        <LogOut className="w-5 h-5" />
        <span className="hidden sm:inline-block ml-2 font-semibold">Sair</span>
      </Button>
    </div>
  );
}
