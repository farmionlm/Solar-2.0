"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Layers,
  Compass,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Grid,
  Info,
  Trash2,
  Plus
} from "lucide-react";
import {
  LatLngPoint,
  Point2D,
  AutoFillResult,
  autoFillRoofLayout,
  calculatePolygonAreaMeters,
} from "@/utils/roofLayoutMath";

interface RoofLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCapacity: (maxPanelsCount: number, usableAreaM2: number) => void;
  initialRequiredModules?: number;
  selectedModuleDimensions?: { widthMeters: number; heightMeters: number; powerW: number };
}

export function RoofLayoutModal({
  isOpen,
  onClose,
  onApplyCapacity,
  initialRequiredModules = 0,
  selectedModuleDimensions = { widthMeters: 1.13, heightMeters: 2.28, powerW: 550 },
}: RoofLayoutModalProps) {
  // Configuração dos parâmetros do telhado
  const [marginMeters, setMarginMeters] = useState<number>(0.5);
  const [azimuthDegrees, setAzimuthDegrees] = useState<number>(0); // 0° Norte, 90° Leste, 180° Sul, 270° Oeste
  const [pitchDegrees, setPitchDegrees] = useState<number>(15);
  const [moduleOrientation, setModuleOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  
  // Vértices do polígono do telhado em coordenadas locais Canvas (2D)
  const [polygonVertices, setPolygonVertices] = useState<Point2D[]>([
    { x: 50, y: 50 },
    { x: 350, y: 50 },
    { x: 350, y: 250 },
    { x: 50, y: 250 },
  ]);

  const [activePreset, setActivePreset] = useState<'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID'>('RECTANGLE');
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingVertexIndex === null) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(10, Math.min(390, (e.clientX - rect.left) * (400 / rect.width)));
    const y = Math.max(10, Math.min(290, (e.clientY - rect.top) * (300 / rect.height)));

    setPolygonVertices((prev) => {
      const updated = [...prev];
      updated[draggingVertexIndex] = { x: Math.round(x), y: Math.round(y) };
      return updated;
    });
  };

  const handleSvgMouseUp = () => {
    setDraggingVertexIndex(null);
  };

  // Carregar preset de formato de telhado
  const applyPresetShape = (shape: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID') => {
    setActivePreset(shape);
    if (shape === 'RECTANGLE') {
      setPolygonVertices([
        { x: 50, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 250 },
        { x: 50, y: 250 },
      ]);
    } else if (shape === 'L_SHAPE') {
      setPolygonVertices([
        { x: 50, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 150 },
        { x: 200, y: 150 },
        { x: 200, y: 280 },
        { x: 50, y: 280 },
      ]);
    } else if (shape === 'TRAPEZOID') {
      setPolygonVertices([
        { x: 100, y: 50 },
        { x: 300, y: 50 },
        { x: 380, y: 250 },
        { x: 20, y: 250 },
      ]);
    }
  };

  // Fator de escala: 10px no canvas = 1 metro real
  const PIXELS_PER_METER = 20;

  // Converter vértices do canvas para coordenadas simuladas em metros para o algoritmo
  const roofMeters: Point2D[] = useMemo(() => {
    return polygonVertices.map((v) => ({
      x: v.x / PIXELS_PER_METER,
      y: v.y / PIXELS_PER_METER,
    }));
  }, [polygonVertices]);

  // Converter metros fictícios para LatLng fictícios (para alimentar a função autoFillRoofLayout)
  const latLngPoints: LatLngPoint[] = useMemo(() => {
    const originLat = -20.3155;
    const originLng = -40.3128;
    return roofMeters.map((m) => ({
      lat: originLat + (m.y / 111000),
      lng: originLng + (m.x / (111000 * Math.cos((originLat * Math.PI) / 180))),
    }));
  }, [roofMeters]);

  // Executar o motor de auto-fill
  const autoFillResult: AutoFillResult = useMemo(() => {
    return autoFillRoofLayout({
      roofPolygon: latLngPoints,
      moduleWidthMeters: selectedModuleDimensions.widthMeters,
      moduleHeightMeters: selectedModuleDimensions.heightMeters,
      azimuthDegrees,
      pitchDegrees,
      marginMeters,
      panelSpacingMeters: 0.05,
      orientation: moduleOrientation,
    });
  }, [
    latLngPoints,
    selectedModuleDimensions,
    azimuthDegrees,
    pitchDegrees,
    marginMeters,
    moduleOrientation,
  ]);

  const maxFitCount = autoFillResult.maxPanelsCount;
  const isDeficit = initialRequiredModules > 0 && maxFitCount < initialRequiredModules;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
              <Grid className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                Simulador de Arranjo & Espaço Físico do Telhado
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Sem API Pago (100% Grátis)
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Desenhe o formato do telhado para calcular a capacidade máxima física de placas solares.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 custom-scrollbar">
          
          {/* Coluna Esquerda: Editor Visual (Canvas SVG de Telhado & Módulos) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Toolbar de Formatos Rápidos */}
            <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-xl border border-border text-xs">
              <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" /> Formato do Telhado:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPresetShape('RECTANGLE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activePreset === 'RECTANGLE'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Retangular
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetShape('L_SHAPE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activePreset === 'L_SHAPE'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Em "L"
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetShape('TRAPEZOID')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activePreset === 'TRAPEZOID'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Trapezoidal
                </button>
              </div>
            </div>

            {/* Canvas de Renderização SVG */}
            <div className="relative w-full h-[340px] sm:h-[380px] bg-slate-950 border border-border rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              
              {/* Moldura de Fundo do Telhado */}
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

              <svg
                className="w-full h-full relative z-10 cursor-crosshair select-none"
                viewBox="0 0 400 300"
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
              >
                <defs>
                  <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
                  </linearGradient>
                  <pattern id="solarGrid" width="8" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 8 0 L 0 0 0 12" fill="none" stroke="#60a5fa" strokeWidth="0.5" opacity="0.4" />
                  </pattern>
                </defs>

                {/* Polígono do Telhado (Perímetro Exterior) */}
                <polygon
                  points={polygonVertices.map((v) => `${v.x},${v.y}`).join(" ")}
                  fill="rgba(30, 41, 59, 0.7)"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="none"
                />

                {/* Margem de Segurança Interna (Recuo) */}
                {polygonVertices.length >= 3 && (
                  <polygon
                    points={polygonVertices.map((v) => {
                      // Offset simples em direção ao centro para visualização
                      const cx = polygonVertices.reduce((a, b) => a + b.x, 0) / polygonVertices.length;
                      const cy = polygonVertices.reduce((a, b) => a + b.y, 0) / polygonVertices.length;
                      const factor = 1 - (marginMeters * 0.08);
                      const vx = cx + (v.x - cx) * factor;
                      const vy = cy + (v.y - cy) * factor;
                      return `${vx},${vy}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                )}

                {/* Módulos Encaixados no Telhado */}
                {autoFillResult.panels.map((panel, idx) => {
                  // Converter centro em metros para pixels no SVG
                  const pxX = 200 + panel.center.x * PIXELS_PER_METER;
                  const pxY = 150 + panel.center.y * PIXELS_PER_METER;
                  const pWidth = panel.widthMeters * PIXELS_PER_METER;
                  const pHeight = panel.heightMeters * PIXELS_PER_METER;

                  return (
                    <g key={panel.id} transform={`rotate(${azimuthDegrees}, ${pxX}, ${pxY})`}>
                      <rect
                        x={pxX - pWidth / 2}
                        y={pxY - pHeight / 2}
                        width={pWidth}
                        height={pHeight}
                        rx="2"
                        fill="url(#panelGrad)"
                        stroke="#93c5fd"
                        strokeWidth="1"
                      />
                      <rect
                        x={pxX - pWidth / 2}
                        y={pxY - pHeight / 2}
                        width={pWidth}
                        height={pHeight}
                        rx="2"
                        fill="url(#solarGrid)"
                      />
                      <text
                        x={pxX}
                        y={pxY + 3}
                        fontSize="8"
                        fontWeight="bold"
                        fill="#ffffff"
                        textAnchor="middle"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}

                {/* Vértices Editáveis no SVG (Arrastáveis) */}
                {polygonVertices.map((v, i) => (
                  <circle
                    key={i}
                    cx={v.x}
                    cy={v.y}
                    r={draggingVertexIndex === i ? "7" : "5"}
                    fill={draggingVertexIndex === i ? "#f59e0b" : "#38bdf8"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingVertexIndex(i);
                    }}
                    className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                  />
                ))}
              </svg>

              {/* Rosa dos Ventos / Indicador de Orientação */}
              <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border p-2 rounded-xl text-center shadow-lg text-[10px]">
                <div className="flex items-center gap-1 font-bold text-foreground mb-1">
                  <Compass className="w-3.5 h-3.5 text-primary" /> Azimute
                </div>
                <span className="font-extrabold text-primary text-xs">{azimuthDegrees}°</span>
                <span className="block text-[9px] text-muted-foreground">
                  {azimuthDegrees === 0 ? "Norte (0°)" : azimuthDegrees === 90 ? "Leste (90°)" : azimuthDegrees === 180 ? "Sul (180°)" : azimuthDegrees === 270 ? "Oeste (270°)" : "Personalizado"}
                </span>
              </div>
            </div>

            {/* Legenda do SVG */}
            <div className="flex flex-wrap items-center justify-between text-[11px] font-semibold text-muted-foreground gap-2 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400 inline-block"></span> Módulos Fotovoltaicos ({selectedModuleDimensions.powerW}W)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400 inline-block"></span> Margem de Recuo ({marginMeters}m)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-sky-400 inline-block"></span> Limite do Telhado
              </span>
            </div>

          </div>

          {/* Coluna Direita: Controles de Engenharia & Métricas Espaciais */}
          <div className="space-y-5">
            
            {/* Controles de Parâmetros */}
            <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/60 pb-2">
                <Sparkles className="w-4 h-4 text-primary" /> Ajustes Técnicos do Telhado
              </h4>

              {/* Margem de Recuo de Segurança */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Recuo das Bordas (Margem):</span>
                  <span className="text-primary font-bold">{marginMeters} metros</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.1}
                  value={marginMeters}
                  onChange={(e) => setMarginMeters(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">Afastamento obrigatório de beirais, cumeeiras e rufos</span>
              </div>

              {/* Orientação / Azimute */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Orientação (Azimute):</span>
                  <span className="text-primary font-bold">{azimuthDegrees}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={350}
                  step={10}
                  value={azimuthDegrees}
                  onChange={(e) => setAzimuthDegrees(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Inclinação do Telhado */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Inclinação do Telhado:</span>
                  <span className="text-primary font-bold">{pitchDegrees}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={5}
                  value={pitchDegrees}
                  onChange={(e) => setPitchDegrees(Number(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Orientação do Módulo (Retrato / Paisagem) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Orientação das Placas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModuleOrientation('PORTRAIT')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      moduleOrientation === 'PORTRAIT'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    Retrato (Em pé)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModuleOrientation('LANDSCAPE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      moduleOrientation === 'LANDSCAPE'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    Paisagem (Deitada)
                  </button>
                </div>
              </div>
            </div>

            {/* Quadro de Resultados Espaciais & Comparação */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-2">
                Resumo da Capacidade Física
              </h4>

              <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground block">Capacidade Física Máxima</span>
                  <span className="text-2xl font-black text-primary">{maxFitCount} Placas</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-muted-foreground block">Área Útil</span>
                  <span className="text-sm font-extrabold text-foreground">{autoFillResult.usableAreaM2} m²</span>
                </div>
              </div>

              {/* Comparativo de Demanda vs Espaço Físico */}
              {initialRequiredModules > 0 && (
                <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
                  isDeficit
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  {isDeficit ? <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />}
                  <div>
                    <span className="font-bold block text-foreground mb-0.5">
                      {isDeficit ? 'Atenção: Espaço Limitado' : 'Espaço Físico Suficiente!'}
                    </span>
                    <span>
                      {isDeficit
                        ? `Necessidade por consumo: ${initialRequiredModules} placas. Porém cabem apenas ${maxFitCount} placas nesta água do telhado. Sugere-se dividir em 2 águas ou usar módulos de maior potência.`
                        : `O telhado suporta com folga as ${initialRequiredModules} placas necessárias pelo consumo do cliente.`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Ação */}
            <button
              type="button"
              onClick={() => {
                onApplyCapacity(maxFitCount, autoFillResult.usableAreaM2);
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span>Aplicar Limite de {maxFitCount} Placas ao Simulador</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}
