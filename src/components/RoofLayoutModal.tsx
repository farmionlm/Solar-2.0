"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Layers,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Grid,
  Trash2,
  Plus,
  Search,
  Map,
  Eye,
  MapPin,
  Loader2,
  Edit3,
  Layers3,
} from "lucide-react";
import {
  LatLngPoint,
  Point2D,
  AutoFillResult,
  autoFillRoofLayout,
} from "@/utils/roofLayoutMath";
import { fetchAddressByCep } from "@/utils/cepApi";

export interface RoofSectionModal {
  id: string;
  name: string;
  polygonVertices: Point2D[];
  azimuthDegrees: number;
  pitchDegrees: number;
  marginMeters: number;
  moduleOrientation: 'PORTRAIT' | 'LANDSCAPE';
  activePreset: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID';
}

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
  // Lista de Águas / Áreas do Telhado (Multi-Seção)
  const [sections, setSections] = useState<RoofSectionModal[]>([
    {
      id: "sec-1",
      name: "Água 1",
      polygonVertices: [
        { x: 50, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 250 },
        { x: 50, y: 250 },
      ],
      azimuthDegrees: 0,
      pitchDegrees: 15,
      marginMeters: 0.5,
      moduleOrientation: "PORTRAIT",
      activePreset: "RECTANGLE",
    },
  ]);

  const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Seção Ativa Atual
  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === activeSectionId) || sections[0];
  }, [sections, activeSectionId]);

  // Atualizador Auxiliar da Seção Ativa
  const updateActiveSection = (data: Partial<RoofSectionModal>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === activeSectionId ? { ...s, ...data } : s))
    );
  };

  // Adicionar Nova Área / Água de Telhado
  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    const newNum = sections.length + 1;
    const offset = (sections.length % 3) * 30;

    const newSection: RoofSectionModal = {
      id: newId,
      name: `Água ${newNum}`,
      polygonVertices: [
        { x: 70 + offset, y: 70 + offset },
        { x: 330 + offset, y: 70 + offset },
        { x: 330 + offset, y: 230 + offset },
        { x: 70 + offset, y: 230 + offset },
      ],
      azimuthDegrees: 0,
      pitchDegrees: 15,
      marginMeters: 0.5,
      moduleOrientation: "PORTRAIT",
      activePreset: "RECTANGLE",
    };
    setSections((prev) => [...prev, newSection]);
    setActiveSectionId(newId);
  };

  // Remover Área / Água do Telhado
  const removeSection = (id: string) => {
    if (sections.length <= 1) return;
    const filtered = sections.filter((s) => s.id !== id);
    setSections(filtered);
    if (activeSectionId === id) {
      setActiveSectionId(filtered[0].id);
    }
  };

  // Estados da Busca por Endereço/CEP e Satélite HD Real
  const [mapMode, setMapMode] = useState<'SATELLITE' | 'VECTOR'>('SATELLITE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [centerLat, setCenterLat] = useState<number>(-20.3155); // Vitória, ES (default)
  const [centerLng, setCenterLng] = useState<number>(-40.3128);

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError('');
    try {
      const cleanCep = searchQuery.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        const cepResult = await fetchAddressByCep(cleanCep);
        if (cepResult && cepResult.localidade) {
          const queryStr = `${cepResult.logradouro || ''}, ${cepResult.localidade} - ${cepResult.uf}, Brasil`;
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            setCenterLat(parseFloat(geoData[0].lat));
            setCenterLng(parseFloat(geoData[0].lon));
            setMapMode('SATELLITE');
          }
        }
      } else {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Brasil')}`
        );
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          setCenterLat(parseFloat(geoData[0].lat));
          setCenterLng(parseFloat(geoData[0].lon));
          setMapMode('SATELLITE');
        } else {
          setSearchError('Endereço não localizado no mapa.');
        }
      }
    } catch (err) {
      console.error('Erro na busca de endereço:', err);
      setSearchError('Falha ao buscar localização.');
    } finally {
      setIsSearching(false);
    }
  };

  const getUnrotatedPoint = (
    screenX: number,
    screenY: number,
    originX: number,
    originY: number,
    angleDegrees: number
  ) => {
    const rad = (angleDegrees * Math.PI) / 180;
    const dx = screenX - originX;
    const dy = screenY - originY;
    return {
      x: originX + (dx * Math.cos(rad) + dy * Math.sin(rad)),
      y: originY + (-dx * Math.sin(rad) + dy * Math.cos(rad)),
    };
  };

  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingVertexIndex === null || !activeSection) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = (e.clientX - rect.left) * (400 / rect.width);
    const clientY = (e.clientY - rect.top) * (300 / rect.height);

    const cx = activeSection.polygonVertices.reduce((a, b) => a + b.x, 0) / activeSection.polygonVertices.length;
    const cy = activeSection.polygonVertices.reduce((a, b) => a + b.y, 0) / activeSection.polygonVertices.length;

    const unrotated = getUnrotatedPoint(
      clientX,
      clientY,
      cx,
      cy,
      activeSection.azimuthDegrees
    );

    const x = Math.max(10, Math.min(390, unrotated.x));
    const y = Math.max(10, Math.min(290, unrotated.y));

    const updatedVertices = [...activeSection.polygonVertices];
    updatedVertices[draggingVertexIndex] = { x: Math.round(x), y: Math.round(y) };
    updateActiveSection({ polygonVertices: updatedVertices });
  };

  const handleSvgMouseUp = () => {
    setDraggingVertexIndex(null);
  };

  // Carregar preset de formato de telhado para a área ativa
  const applyPresetShape = (shape: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID') => {
    if (!activeSection) return;
    let newVertices: Point2D[] = [];
    if (shape === 'RECTANGLE') {
      newVertices = [
        { x: 50, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 250 },
        { x: 50, y: 250 },
      ];
    } else if (shape === 'L_SHAPE') {
      newVertices = [
        { x: 50, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 150 },
        { x: 200, y: 150 },
        { x: 200, y: 280 },
        { x: 50, y: 280 },
      ];
    } else if (shape === 'TRAPEZOID') {
      newVertices = [
        { x: 100, y: 50 },
        { x: 300, y: 50 },
        { x: 380, y: 250 },
        { x: 20, y: 250 },
      ];
    }
    updateActiveSection({ activePreset: shape, polygonVertices: newVertices });
  };

  const PIXELS_PER_METER = 20;

  // Motor de Auto-Fill por Seção Modal
  const sectionCalculations = useMemo(() => {
    return sections.map((sec) => {
      const roofMeters: Point2D[] = sec.polygonVertices.map((v) => ({
        x: v.x / PIXELS_PER_METER,
        y: v.y / PIXELS_PER_METER,
      }));

      const latLngPoints: LatLngPoint[] = roofMeters.map((m) => ({
        lat: centerLat + m.y / 111000,
        lng: centerLng + m.x / (111000 * Math.cos((centerLat * Math.PI) / 180)),
      }));

      const autoFill: AutoFillResult = autoFillRoofLayout({
        roofPolygon: latLngPoints,
        moduleWidthMeters: selectedModuleDimensions.widthMeters,
        moduleHeightMeters: selectedModuleDimensions.heightMeters,
        azimuthDegrees: sec.azimuthDegrees,
        pitchDegrees: sec.pitchDegrees,
        marginMeters: sec.marginMeters,
        panelSpacingMeters: 0.05,
        orientation: sec.moduleOrientation,
      });

      return {
        section: sec,
        autoFill,
      };
    });
  }, [sections, centerLat, centerLng, selectedModuleDimensions]);

  // Totais Acumulados
  const totalMaxPanelsCount = useMemo(() => {
    return sectionCalculations.reduce((acc, curr) => acc + curr.autoFill.maxPanelsCount, 0);
  }, [sectionCalculations]);

  const totalUsableAreaM2 = useMemo(() => {
    return Number(sectionCalculations.reduce((acc, curr) => acc + curr.autoFill.usableAreaM2, 0).toFixed(2));
  }, [sectionCalculations]);

  const isDeficit = initialRequiredModules > 0 && totalMaxPanelsCount < initialRequiredModules;

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
                Simulador do Telhado Multi-Águas
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {sections.length} {sections.length === 1 ? 'Área' : 'Áreas'}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Desenhe o formato de múltiplas áreas de telhado para calcular a capacidade máxima combinada.
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
          
          {/* Coluna Esquerda: Editor Visual (Canvas SVG de Telhado & Módulos com Foto de Satélite) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Barra de Busca de CEP / Endereço */}
            <div className="bg-secondary/40 border border-border p-3 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                    placeholder="Digite o CEP ou Endereço do cliente para carregar foto de Satélite..."
                    className="w-full h-10 pl-9 pr-3 text-xs font-semibold bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isSearching}
                  className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  <span>Localizar</span>
                </button>
              </div>

              {searchError && (
                <p className="text-[11px] font-bold text-red-400 pl-1">{searchError}</p>
              )}
            </div>

            {/* Seletor de Águas / Áreas */}
            <div className="bg-secondary/30 p-3 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Layers3 className="w-4 h-4 text-primary" /> Águas do Telhado
                </span>
                <button
                  type="button"
                  onClick={addSection}
                  className="px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nova Área
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {sections.map((sec, idx) => {
                  const secCalc = sectionCalculations.find((sc) => sc.section.id === sec.id);
                  const count = secCalc?.autoFill.maxPanelsCount || 0;
                  const isSel = sec.id === activeSectionId;

                  return (
                    <div
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 cursor-pointer shrink-0 transition-all ${
                        isSel
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card hover:bg-secondary border-border text-muted-foreground"
                      }`}
                    >
                      <span>{sec.name} ({count} p.)</span>
                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(sec.id);
                          }}
                          className="hover:text-red-400 p-0.5 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canvas SVG */}
            <div className="relative w-full h-[340px] sm:h-[380px] bg-slate-950 border border-border rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
              
              {mapMode === 'SATELLITE' && (
                <div className="absolute inset-0 z-0">
                  <img
                    src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/${Math.floor(
                      ((1 -
                        Math.log(
                          Math.tan((centerLat * Math.PI) / 180) +
                            1 / Math.cos((centerLat * Math.PI) / 180)
                        ) /
                          Math.PI) /
                        2) *
                        Math.pow(2, 18)
                    )}/${Math.floor(((centerLng + 180) / 360) * Math.pow(2, 18))}`}
                    alt="Foto de Satélite do Telhado"
                    className="w-full h-full object-cover scale-150 filter brightness-90 contrast-110"
                  />
                  <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
                </div>
              )}

              {mapMode === 'VECTOR' && (
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              )}

              <svg
                className="w-full h-full relative z-10 cursor-crosshair select-none"
                viewBox="0 0 400 300"
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onMouseLeave={handleSvgMouseUp}
              >
                <defs>
                  <linearGradient id="panelGradActive" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="panelGradInactive" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#475569" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#334155" stopOpacity="0.85" />
                  </linearGradient>
                  <pattern id="solarGrid" width="8" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 8 0 L 0 0 0 12" fill="none" stroke="#60a5fa" strokeWidth="0.5" opacity="0.4" />
                  </pattern>
                </defs>

                {sectionCalculations.map((sc) => {
                  const { section, autoFill } = sc;
                  const isActive = section.id === activeSectionId;

                  return (
                    <g key={section.id} onClick={() => setActiveSectionId(section.id)} className="cursor-pointer">
                      
                      {/* Polígono */}
                      <polygon
                        points={section.polygonVertices.map((v) => `${v.x},${v.y}`).join(" ")}
                        fill={isActive ? "rgba(30, 41, 59, 0.7)" : "rgba(15, 23, 42, 0.4)"}
                        stroke={isActive ? "#38bdf8" : "#64748b"}
                        strokeWidth={isActive ? "2.5" : "1.5"}
                      />

                      {/* Recuo de Segurança */}
                      {isActive && section.polygonVertices.length >= 3 && (
                        <polygon
                          points={section.polygonVertices.map((v) => {
                            const cx = section.polygonVertices.reduce((a, b) => a + b.x, 0) / section.polygonVertices.length;
                            const cy = section.polygonVertices.reduce((a, b) => a + b.y, 0) / section.polygonVertices.length;
                            const factor = 1 - (section.marginMeters * 0.08);
                            return `${cx + (v.x - cx) * factor},${cy + (v.y - cy) * factor}`;
                          }).join(" ")}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                      )}

                      {/* Módulos */}
                      {autoFill.panels.map((panel, idx) => {
                        const pxX = 200 + panel.center.x * PIXELS_PER_METER;
                        const pxY = 150 + panel.center.y * PIXELS_PER_METER;
                        const pWidth = panel.widthMeters * PIXELS_PER_METER;
                        const pHeight = panel.heightMeters * PIXELS_PER_METER;

                        return (
                          <g key={panel.id} transform={`rotate(${section.azimuthDegrees}, ${pxX}, ${pxY})`}>
                            <rect
                              x={pxX - pWidth / 2}
                              y={pxY - pHeight / 2}
                              width={pWidth}
                              height={pHeight}
                              rx="2"
                              fill={isActive ? "url(#panelGradActive)" : "url(#panelGradInactive)"}
                              stroke={isActive ? "#93c5fd" : "#94a3b8"}
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

                      {/* Vértices Editáveis se For Ativa */}
                      {isActive && section.polygonVertices.map((v, i) => (
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

                      {/* Pílula / Rótulo Flutuante Externo (Fora do Desenho dos Módulos) */}
                      <g
                        transform={`translate(${section.polygonVertices.reduce((a,b)=>a+b.x,0)/section.polygonVertices.length}, ${Math.min(...section.polygonVertices.map(v=>v.y)) - 14}) rotate(${-section.azimuthDegrees})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSectionId(section.id);
                        }}
                        className="cursor-pointer hover:scale-105 transition-transform"
                      >
                        <rect
                          x="-34"
                          y="-9"
                          width="68"
                          height="18"
                          rx="9"
                          fill={isActive ? "rgba(15, 23, 42, 0.92)" : "rgba(30, 41, 59, 0.85)"}
                          stroke={isActive ? "#38bdf8" : "#64748b"}
                          strokeWidth="1.2"
                          className="shadow-md"
                        />
                        <text
                          x="0"
                          y="3"
                          fontSize="8.5"
                          fontWeight="black"
                          fill={isActive ? "#38bdf8" : "#e2e8f0"}
                          textAnchor="middle"
                        >
                          {section.name}: {autoFill.maxPanelsCount}p.
                        </text>
                      </g>

                    </g>
                  );
                })}
              </svg>

              <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border p-2 rounded-xl text-center shadow-lg text-[10px]">
                <div className="flex items-center gap-1 font-bold text-foreground mb-1">
                  <Compass className="w-3.5 h-3.5 text-primary" /> Azimute
                </div>
                <span className="font-extrabold text-primary text-xs">{activeSection.azimuthDegrees}°</span>
              </div>
            </div>

          </div>

          {/* Coluna Direita: Controles de Engenharia & Métricas Espaciais */}
          <div className="space-y-5">
            
            {/* Controles de Parâmetros */}
            <div className="bg-secondary/30 border border-border rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/60 pb-2">
                <Sparkles className="w-4 h-4 text-primary" /> Ajustes: {activeSection.name}
              </h4>

              {/* Recuo */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Recuo das Bordas:</span>
                  <span className="text-primary font-bold">{activeSection.marginMeters} m</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.5}
                  step={0.1}
                  value={activeSection.marginMeters}
                  onChange={(e) => updateActiveSection({ marginMeters: Number(e.target.value) })}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Azimute */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Orientação (Azimute):</span>
                  <span className="text-primary font-bold">{activeSection.azimuthDegrees}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={350}
                  step={10}
                  value={activeSection.azimuthDegrees}
                  onChange={(e) => updateActiveSection({ azimuthDegrees: Number(e.target.value) })}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Inclinação */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-muted-foreground">Inclinação:</span>
                  <span className="text-primary font-bold">{activeSection.pitchDegrees}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={45}
                  step={5}
                  value={activeSection.pitchDegrees}
                  onChange={(e) => updateActiveSection({ pitchDegrees: Number(e.target.value) })}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Orientação Placa */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Orientação Placas</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveSection({ moduleOrientation: 'PORTRAIT' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      activeSection.moduleOrientation === 'PORTRAIT'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    Retrato
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveSection({ moduleOrientation: 'LANDSCAPE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      activeSection.moduleOrientation === 'LANDSCAPE'
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    Paisagem
                  </button>
                </div>
              </div>
            </div>

            {/* Resumo Combinado */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-2">
                Resumo da Capacidade Física Combinada
              </h4>

              <div className="bg-primary/10 border border-primary/20 p-3.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground block">Capacidade Total</span>
                  <span className="text-2xl font-black text-primary">{totalMaxPanelsCount} Placas</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-muted-foreground block">Área Útil Total</span>
                  <span className="text-sm font-extrabold text-foreground">{totalUsableAreaM2} m²</span>
                </div>
              </div>

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
                        ? `Necessidade por consumo: ${initialRequiredModules} placas. Telhado comporta até ${totalMaxPanelsCount} placas em ${sections.length} águas.`
                        : `O telhado suporta com folga as ${initialRequiredModules} placas necessárias.`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Ação */}
            <button
              type="button"
              onClick={() => {
                onApplyCapacity(totalMaxPanelsCount, totalUsableAreaM2);
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span>Aplicar Limite de {totalMaxPanelsCount} Placas ao Simulador</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}
