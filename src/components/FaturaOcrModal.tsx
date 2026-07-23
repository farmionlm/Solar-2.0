"use client";

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import {
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Zap, 
  Building2, 
  User, 
  Hash, 
  Gauge, 
  ArrowRight,
  ClipboardList,
  MapPin
} from 'lucide-react';
import { FaturaExtraida, HistoricoConsumoItem } from '@/utils/faturaParser';

interface FaturaOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: FaturaExtraida) => void;
}

// Badge de nível de confiança reutilizável
function ConfidenceBadge({ score }: { score?: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  if (!score || score === 'HIGH') {
    return (
      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold whitespace-nowrap">
        ✓ Alta Confiança
      </span>
    );
  }
  if (score === 'MEDIUM') {
    return (
      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold whitespace-nowrap">
        ⚠ Verificar
      </span>
    );
  }
  return (
    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold whitespace-nowrap">
      ✗ Baixa Certeza
    </span>
  );
}

export function FaturaOcrModal({ isOpen, onClose, onApply }: FaturaOcrModalProps) {
  const [activeTab, setActiveTab] = useState<'FILE' | 'TEXT'>('FILE');
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<FaturaExtraida | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleProcess = async () => {
    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (activeTab === 'FILE' && file) {
        const formData = new FormData();
        formData.append('file', file);
        res = await fetch('/api/ocr/fatura', {
          method: 'POST',
          body: formData,
        });
      } else if (activeTab === 'TEXT' && pastedText.trim()) {
        res = await fetch('/api/ocr/fatura', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText }),
        });
      } else {
        setError('Por favor, selecione um arquivo PDF/Imagem ou cole o texto da fatura.');
        setLoading(false);
        return;
      }

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || 'Erro ao ler a fatura.');
      }

      setExtractedData(result.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao processar arquivo da fatura.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onApply(extractedData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Leitor Inteligente de Faturas (OCR)</h3>
              <p className="text-xs text-muted-foreground">Importe o histórico de consumo e dados do cliente via PDF ou Texto</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Seleção de Aba */}
          {!extractedData && (
            <div className="flex bg-secondary/50 p-1 rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('FILE')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'FILE'
                    ? 'bg-card text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload className="w-4 h-4" />
                Upload do PDF da Fatura
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TEXT')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'TEXT'
                    ? 'bg-card text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" />
                Colar Texto / Copia e Cola
              </button>
            </div>
          )}

          {/* Formulário de Input ou Resultado */}
          {!extractedData ? (
            <div>
              {activeTab === 'FILE' ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center bg-secondary/10 hover:bg-secondary/30 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="fatura-file-input"
                  />
                  <label htmlFor="fatura-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    {file ? (
                      <div>
                        <p className="text-sm font-bold text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB — Clique para substituir</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-foreground">Clique para selecionar a fatura (PDF ou Imagem)</p>
                        <p className="text-xs text-muted-foreground mt-1">Suporta EDP, Light, Enel, Cemig, CPFL, Neoenergia e outras</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Copie e cole aqui o conteúdo completo do texto da sua fatura de energia..."
                    className="w-full bg-secondary/30 border border-border rounded-2xl p-4 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary custom-scrollbar"
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleProcess}
                disabled={loading || (activeTab === 'FILE' && !file) || (activeTab === 'TEXT' && !pastedText.trim())}
                className="w-full mt-5 py-3.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin" />
                    Extraindo Histórico & Dados via OCR...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Processar e Extrair Dados da Fatura
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Dados Extraídos */
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Fatura lida com sucesso! Confira os dados extraídos abaixo:</span>
              </div>

              {extractedData.alertaConsumoAtipico && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{extractedData.alertaConsumoAtipico}</span>
                </div>
              )}

              {/* Grid de Campos Extraídos (Editáveis para Ajuste Fino) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Campo: Nome do Cliente */}
                <div className={`bg-secondary/40 border rounded-xl p-3 ${
                  extractedData.confidenceScore?.clienteNome === 'LOW'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border'
                }`}>
                  <label className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px] mb-1">
                    <User className="w-3.5 h-3.5 text-primary" /> Nome do Cliente
                    <ConfidenceBadge score={extractedData.confidenceScore?.clienteNome} />
                  </label>
                  <input
                    type="text"
                    value={extractedData.clienteNome || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, clienteNome: e.target.value })}
                    placeholder="LUAN PARDIM MUNIZ..."
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Campo: CPF / CNPJ */}
                <div className={`bg-secondary/40 border rounded-xl p-3 ${
                  extractedData.confidenceScore?.cpfCnpj === 'LOW'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border'
                }`}>
                  <label className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px] mb-1">
                    <Hash className="w-3.5 h-3.5 text-primary" /> CPF / CNPJ do Cliente
                    <ConfidenceBadge score={extractedData.confidenceScore?.cpfCnpj} />
                  </label>
                  <input
                    type="text"
                    value={extractedData.cpfCnpj || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, cpfCnpj: e.target.value })}
                    placeholder="144.871.067-70"
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Campo: Nº da Instalação */}
                <div className={`bg-secondary/40 border rounded-xl p-3 ${
                  extractedData.confidenceScore?.instalacao === 'LOW'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border'
                }`}>
                  <label className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px] mb-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> Nº da Instalação (UC)
                    <ConfidenceBadge score={extractedData.confidenceScore?.instalacao} />
                  </label>
                  <input
                    type="text"
                    value={extractedData.instalacao || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, instalacao: e.target.value })}
                    placeholder="0001751212"
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="bg-secondary/40 border border-border rounded-xl p-3">
                  <label className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px] mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Concessionária
                  </label>
                  <input
                    type="text"
                    value={extractedData.concessionaria || ''}
                    onChange={(e) => setExtractedData({ ...extractedData, concessionaria: e.target.value })}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Campo: Endereço Completo */}
                <div className={`bg-secondary/40 border rounded-xl p-3 sm:col-span-2 space-y-2 ${
                  extractedData.confidenceScore?.endereco === 'LOW'
                    ? 'border-red-500/40 bg-red-500/5'
                    : 'border-border'
                }`}>
                  <label className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Endereço Completo do Cliente
                    <ConfidenceBadge score={extractedData.confidenceScore?.endereco} />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-muted-foreground font-medium block mb-0.5">Logradouro / Nº</span>
                      <input
                        type="text"
                        value={extractedData.endereco || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, endereco: e.target.value })}
                        placeholder="RUA MONTEIRO LOBATO 2137 CX 01"
                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block mb-0.5">Bairro</span>
                      <input
                        type="text"
                        value={extractedData.bairro || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, bairro: e.target.value })}
                        placeholder="INTERLAGOS"
                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground font-medium block mb-0.5">CEP</span>
                      <input
                        type="text"
                        value={extractedData.cep || ''}
                        onChange={(e) => setExtractedData({ ...extractedData, cep: e.target.value })}
                        placeholder="29903-610"
                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <span className="text-[10px] text-muted-foreground font-medium block mb-0.5">Cidade / UF</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={extractedData.cidade || ''}
                          onChange={(e) => setExtractedData({ ...extractedData, cidade: e.target.value })}
                          placeholder="LINHARES"
                          className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={extractedData.uf || ''}
                          onChange={(e) => setExtractedData({ ...extractedData, uf: e.target.value })}
                          placeholder="ES"
                          className="w-16 bg-card border border-border rounded-lg px-2.5 py-1.5 font-bold text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary uppercase text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/40 border border-border rounded-xl p-3">
                  <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                    <Gauge className="w-3.5 h-3.5 text-blue-500" /> Tipo de Ligação / Grupo
                  </span>
                  <p className="font-bold text-foreground mt-1">
                    {extractedData.tipoLigacao} — {extractedData.grupoTarifario}
                  </p>
                </div>

                {/* Campo: Consumo Médio */}
                <div className={`border rounded-xl p-3 ${
                  extractedData.confidenceScore?.consumoMedioKwh === 'LOW'
                    ? 'border-red-500/40 bg-red-500/10'
                    : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <span className={`flex items-center gap-1 font-bold text-[11px] ${
                    extractedData.confidenceScore?.consumoMedioKwh === 'LOW' ? 'text-red-400' : 'text-amber-500'
                  }`}>
                    <Zap className="w-3.5 h-3.5" /> Consumo Médio Calculado
                    <ConfidenceBadge score={extractedData.confidenceScore?.consumoMedioKwh} />
                  </span>
                  <p className={`font-black text-sm mt-1 ${
                    extractedData.confidenceScore?.consumoMedioKwh === 'LOW' ? 'text-red-400' : 'text-amber-500'
                  }`}>{extractedData.consumoMedioKwh} kWh/mês</p>
                </div>
              </div>

              {/* Gráfico de Sazonalidade do Consumo */}
              {extractedData.historicoConsumo.length > 0 && (
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <div className="px-4 py-2.5 bg-secondary/50 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-primary" />
                      Sazonalidade do Consumo ({extractedData.historicoConsumo.length} meses)
                    </span>
                    <span className="text-[11px] font-bold text-amber-500">
                      Média: {extractedData.consumoMedioKwh} kWh/mês
                    </span>
                  </div>
                  <div className="p-3 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={extractedData.historicoConsumo}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="mesAno"
                          tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const val = payload[0].value as number;
                              const label = payload[0].payload.mesAno;
                              const avg = extractedData.consumoMedioKwh;
                              const diff = val - avg;
                              return (
                                <div className="bg-card border border-border p-2 rounded-xl shadow-xl text-xs">
                                  <p className="font-bold text-foreground">{label}</p>
                                  <p className="text-foreground font-extrabold">{val} kWh</p>
                                  <p className={diff > 0 ? 'text-amber-400' : 'text-sky-400'}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(0)} kWh vs média
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={extractedData.consumoMedioKwh}
                          stroke="#10b981"
                          strokeDasharray="4 2"
                          strokeWidth={1.5}
                          label={{
                            value: `Méd.`,
                            fill: '#10b981',
                            fontSize: 9,
                            position: 'insideTopRight'
                          }}
                        />
                        <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                          {extractedData.historicoConsumo.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.kwh > extractedData.consumoMedioKwh ? '#f59e0b' : '#38bdf8'}
                              fillOpacity={0.85}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="px-4 pb-2.5 flex items-center gap-4 text-[10px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Acima da média</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" /> Abaixo da média</span>
                    <span className="flex items-center gap-1"><span className="w-4 border-t-2 border-emerald-500 border-dashed inline-block" /> Média ({extractedData.consumoMedioKwh} kWh)</span>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs rounded-xl transition-all border border-border"
                >
                  Refazer Leitura
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Aplicar Dados da Fatura</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
