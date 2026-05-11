"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Sun, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Ocorreu um erro ao fazer login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-accent-color-dark/10 blur-[100px]" />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent-color-dark rounded-2xl flex items-center justify-center shadow-2xl shadow-black/50">
            <Sun className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-foreground tracking-tight">
          Solar 2.0
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground font-bold">
          Acesse a plataforma de dimensionamento
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-card/80 backdrop-blur-2xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-muted-foreground mb-2">
                E-mail de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 focus:bg-secondary border-border"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-muted-foreground mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 focus:bg-secondary border-border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button type="button" onClick={() => alert("Função em desenvolvimento na próxima etapa!")} className="font-bold text-primary hover:text-primary/80 transition-colors">
                  Esqueceu a senha?
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
                <p className="text-sm text-red-400 text-center font-bold">{error}</p>
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-black rounded-xl shadow-lg shadow-primary/20 transition-all group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar na Plataforma
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
        
        <p className="mt-8 text-center text-xs text-slate-400">
          Uso exclusivo para parceiros autorizados.<br/>© {new Date().getFullYear()} Plataforma Solar.
        </p>
      </div>
    </div>
  );
}
