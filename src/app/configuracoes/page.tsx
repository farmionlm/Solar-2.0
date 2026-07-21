"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Settings, Palette, Upload, Globe, Phone, Building, Save, CheckCircle } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRESET_COLORS = [
  "#2563eb", // Blue (default)
  "#0891b2", // Cyan
  "#16a34a", // Green
  "#d97706", // Amber
  "#dc2626", // Red
  "#7c3aed", // Purple
  "#db2777", // Pink
  "#0f172a", // Slate dark
];

export default function ConfiguracoesPage() {
  const { data: settings, mutate, isLoading } = useSWR("/api/settings", fetcher);

  const [form, setForm] = useState({
    name: "",
    brandColor: "#2563eb",
    logoUrl: "",
    companyPhone: "",
    companyWebsite: "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || "",
        brandColor: settings.brandColor || "#2563eb",
        logoUrl: settings.logoUrl || "",
        companyPhone: settings.companyPhone || "",
        companyWebsite: settings.companyWebsite || "",
      });
    }
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError("Imagem muito grande. Use uma imagem com menos de 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, logoUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao salvar.");
      } else {
        setSaved(true);
        mutate();
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-1">
            <Settings className="w-4 h-4" /> Branding & Personalização
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Configurações da Marca</h1>
          <p className="text-sm text-muted-foreground font-medium mt-0.5">Personalize o logotipo, cores e dados que aparecem nos memoriais descritivos</p>
        </div>
      </header>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {error && (
              <div className="bg-red-900/20 text-red-400 p-4 rounded-xl border border-red-900/50 font-medium">
                {error}
              </div>
            )}
            {saved && (
              <div className="bg-emerald-900/20 text-emerald-400 p-4 rounded-xl border border-emerald-900/50 font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5" /> Configurações salvas com sucesso!
              </div>
            )}

            {/* Company Info */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" /> Informações da Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">Nome da Empresa</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: SolarTech Brasil"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">Telefone Comercial</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={form.companyPhone}
                      onChange={e => setForm(p => ({ ...p, companyPhone: e.target.value }))}
                      placeholder="(00) 90000-0000"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-muted-foreground mb-1">Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={form.companyWebsite}
                      onChange={e => setForm(p => ({ ...p, companyWebsite: e.target.value }))}
                      placeholder="https://www.suaempresa.com.br"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Identidade Visual (White-Label)
              </h2>

              {/* Color Picker */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-muted-foreground mb-3">Cor Principal da Marca</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, brandColor: color }))}
                      className="w-10 h-10 rounded-xl border-4 transition-all hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: color,
                        borderColor: form.brandColor === color ? 'white' : 'transparent',
                        boxShadow: form.brandColor === color ? `0 0 0 2px ${color}` : 'none'
                      }}
                      title={color}
                    />
                  ))}
                  {/* Custom color picker */}
                  <div className="relative">
                    <input
                      type="color"
                      value={form.brandColor}
                      onChange={e => setForm(p => ({ ...p, brandColor: e.target.value }))}
                      className="w-10 h-10 rounded-xl cursor-pointer border-2 border-border p-0.5 bg-card"
                      title="Cor personalizada"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.brandColor }}></div>
                  <code className="text-sm font-mono text-muted-foreground">{form.brandColor}</code>
                  <div
                    className="ml-auto px-4 py-1.5 rounded-lg text-white text-sm font-bold"
                    style={{ backgroundColor: form.brandColor }}
                  >
                    Prévia do botão
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-3">Logo da Empresa</label>
                <div className="flex gap-4 items-start">
                  {form.logoUrl ? (
                    <div className="w-20 h-20 rounded-xl border border-border flex items-center justify-center bg-secondary/20 overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/20 shrink-0">
                      <Building className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors mb-2"
                    >
                      <Upload className="w-4 h-4" /> Selecionar Logo
                    </button>
                    <p className="text-xs text-muted-foreground">PNG, JPG, SVG ou WebP. Máx. 500KB.</p>
                    <p className="text-xs text-muted-foreground mt-1">A logo aparecerá nas Propostas Comerciais geradas.</p>
                    {form.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, logoUrl: "" }))}
                        className="text-xs text-red-400 hover:underline mt-1 font-medium"
                      >
                        Remover logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-8 shadow-lg shadow-primary/20 font-bold active:scale-95 transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
