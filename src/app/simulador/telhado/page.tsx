"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Grid,
  Search,
  MapPin,
  Compass,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Map,
  ZoomIn,
  ZoomOut,
  Loader2,
  Sliders,
  ChevronRight,
  Maximize2
} from "lucide-react";
import {
  LatLngPoint,
  Point2D,
  AutoFillResult,
  autoFillRoofLayout,
  calculatePolygonAreaMeters,
} from "@/utils/roofLayoutMath";
import { fetchAddressByCep } from "@/utils/cepApi";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function RoofStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCep = searchParams.get("cep") || "";
  const initialRequiredModules = Number(searchParams.get("required")) || 0;

  // Busca do Catálogo de Módulos do banco
  const { data: dbModules } = useSWR("/api/equipments/modules", fetcher);

  // Estados de localização e foto de satélite
  const [searchQuery, setSearchQuery] = useState<string>(initialCep);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>("");
  const [centerLat, setCenterLat] = useState<number>(-20.3155); // Vitória, ES
  const [centerLng, setCenterLng] = useState<number>(-40.3128);
  const [zoomLevel, setZoomLevel] = useState<number>(19); // 18, 19, 20 (Ultra Sharp)
  const [mapMode, setMapMode] = useState<'SATELLITE' | 'VECTOR'>('SATELLITE');

  // Estados de Engenharia do Telhado
  const [marginMeters, setMarginMeters] = useState<number>(0.5);
  const [azimuthDegrees, setAzimuthDegrees] = useState<number>(0);
  const [pitchDegrees, setPitchDegrees] = useState<number>(15);
  const [moduleOrientation, setModuleOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [selectedModulePowerW, setSelectedModulePowerW] = useState<number>(550);
  const [moduleWidthMeters, setModuleWidthMeters] = useState<number>(1.13);
  const [moduleHeightMeters, setModuleHeightMeters] = useState<number>(2.28);

  // Vértices do telhado em pixels no canvas amplo (800x600)
  const [polygonVertices, setPolygonVertices] = useState<Point2D[]>([
    { x: 150, y: 120 },
    { x: 650, y: 120 },
    { x: 650, y: 480 },
    { x: 150, y: 480 },
  ]);

  const [activePreset, setActivePreset] = useState<'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID'>('RECTANGLE');
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Efeito para buscar CEP inicial se passado via query params
  useEffect(() => {
    if (initialCep) {
      handleSearchAddress(initialCep);
    }
  }, [initialCep]);

  const handleSearchAddress = async (queryToSearch?: string) => {
    const q = queryToSearch || searchQuery;
    if (!q.trim()) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const cleanCep = q.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        const cepResult = await fetchAddressByCep(cleanCep);
        if (cepResult && cepResult.localidade) {
          const queryStr = `${cepResult.logradouro || ""}, ${cepResult.localidade} - ${cepResult.uf}, Brasil`;
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            setCenterLat(parseFloat(geoData[0].lat));
            setCenterLng(parseFloat(geoData[0].lon));
            setMapMode("SATELLITE");
          }
        }
      } else {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ", Brasil")}`
        );
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          setCenterLat(parseFloat(geoData[0].lat));
          setCenterLng(parseFloat(geoData[0].lon));
          setMapMode("SATELLITE");
        } else {
          setSearchError("Endereço não localizado no mapa.");
        }
      }
    } catch (err) {
      console.error("Erro na busca de endereço:", err);
      setSearchError("Falha ao buscar localização.");
    } finally {
      setIsSearching(false);
    }
  };

  // Preset Shapes para canvas 800x600
  const applyPresetShape = (shape: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID') => {
    setActivePreset(shape);
    if (shape === 'RECTANGLE') {
      setPolygonVertices([
        { x: 150, y: 120 },
        { x: 650, y: 120 },
        { x: 650, y: 480 },
        { x: 150, y: 480 },
      ]);
    } else if (shape === 'L_SHAPE') {
      setPolygonVertices([
        { x: 150, y: 120 },
        { x: 650, y: 120 },
        { x: 650, y: 300 },
        { x: 400, y: 300 },
        { x: 400, y: 520 },
        { x: 150, y: 520 },
      ]);
    } else if (shape === 'TRAPEZOID') {
      setPolygonVertices([
        { x: 220, y: 120 },
        { x: 580, y: 120 },
        { x: 720, y: 480 },
        { x: 80, y: 480 },
      ]);
    }
  };

  const PIXELS_PER_METER = 25; // 25px = 1m para maior nitidez gráfica

  // Converte vértices do canvas para coordenadas simuladas em metros
  const roofMeters: Point2D[] = useMemo(() => {
    return polygonVertices.map((v) => ({
      x: (v.x - 400) / PIXELS_PER_METER,
      y: (v.y - 300) / PIXELS_PER_METER,
    }));
  }, [polygonVertices]);

  // Converter metros locais para LatLng reais relativos à localização pesquisada
  const latLngPoints: LatLngPoint[] = useMemo(() => {
    return roofMeters.map((m) => ({
      lat: centerLat + (m.y / 111000),
      lng: centerLng + (m.x / (111000 * Math.cos((centerLat * Math.PI) / 180))),
    }));
  }, [roofMeters, centerLat, centerLng]);

  // Motor de auto-fill
  const autoFillResult: AutoFillResult = useMemo(() => {
    return autoFillRoofLayout({
      roofPolygon: latLngPoints,
      moduleWidthMeters,
      moduleHeightMeters,
      azimuthDegrees,
      pitchDegrees,
      marginMeters,
      panelSpacingMeters: 0.05,
      orientation: moduleOrientation,
    });
  }, [
    latLngPoints,
    moduleWidthMeters,
    moduleHeightMeters,
    azimuthDegrees,
    pitchDegrees,
    marginMeters,
    moduleOrientation,
  ]);

  const maxFitCount = autoFillResult.maxPanelsCount;
  const isDeficit = initialRequiredModules > 0 && maxFitCount < initialRequiredModules;

  // Cálculo da grade de tiles de Satélite Esri 3x3 Ultra HD (Nível de zoom 19)
  const tileGrid = useMemo(() => {
    const z = zoomLevel;
    const latRad = (centerLat * Math.PI) / 180;
    const n = Math.pow(2, z);
    const xtile = Math.floor(((centerLng + 180) / 360) * n);
    const ytile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

    const tiles = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        tiles.push({
          url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ytile + dy}/${xtile + dx}`,
          key: `${z}-${ytile + dy}-${xtile + dx}`,
        });
      }
    }
    return tiles;
  }, [centerLat, centerLng, zoomLevel]);

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingVertexIndex === null) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(20, Math.min(780, (e.clientX - rect.left) * (800 / rect.width)));
    const y = Math.max(20, Math.min(580, (e.clientY - rect.top) * (600 / rect.height)));

    setPolygonVertices((prev) => {
      const updated = [...prev];
      updated[draggingVertexIndex] = { x: Math.round(x), y: Math.round(y) };
      return updated;
    });
  };

  const handleSvgMouseUp = () => {
    setDraggingVertexIndex(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-foreground flex flex-col font-sans select-none">
      
      {/* 1. Header de Controle Superior */}
      <header className="relative z-30 h-16 bg-card/90 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-lg">
        
        {/* Lado Esquerdo: Voltar & Título */}
        <div className="flex items-center gap-3">
          <Link
            href="/simulador"
            className="p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors flex items-center gap-2 text-xs font-extrabold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao Simulador</span>
          </Link>

          <div className="h-6 w-px bg-border hidden sm:block"></div>

          <div>
            <h1 className="text-sm sm:text-base font-black text-foreground flex items-center gap-2">
              <Grid className="w-5 h-5 text-primary animate-pulse" />
              Estudo de Telhado & Arranjo Espacial 2D
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Ultra HD Satélite
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground hidden md:block">
              Área de trabalho expandida em tela cheia para desenho preciso do telhado.
            </p>
          </div>
        </div>

        {/* Centro: Barra de Busca de CEP / Endereço */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress()}
                placeholder="Busque o CEP ou Endereço do cliente para carregar foto Ultra HD..."
                className="w-full h-10 pl-9 pr-3 text-xs font-semibold bg-secondary/60 border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="button"
              onClick={() => handleSearchAddress()}
              disabled={isSearching}
              className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              <span className="hidden sm:inline">Localizar Imóvel</span>
            </button>
          </div>
        </div>

        {/* Lado Direito: Modos Visuais & Painel Lateral Toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-secondary/60 p-1 rounded-xl border border-border flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMapMode('SATELLITE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                mapMode === 'SATELLITE'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Satélite HD
            </button>
            <button
              type="button"
              onClick={() => setMapMode('VECTOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                mapMode === 'VECTOR'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Diagrama 2D
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary text-foreground border border-border transition-colors"
            title="Alternar Painel de Controle"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Área Principal de Trabalho (Canvas 100vh Fullscreen) */}
      <div className="relative flex-1 w-full h-[calc(100vh-64px)] flex overflow-hidden">
        
        {/* Workspace do Desenho (Takes entire remaining space) */}
        <div className="relative flex-1 h-full bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Fundo 1: Imagem de Satélite Multi-Tile 3x3 Ultra HD (Esri World Imagery) */}
          {mapMode === 'SATELLITE' && (
            <div className="absolute inset-0 z-0 grid grid-cols-3 grid-rows-3 w-full h-full pointer-events-none opacity-90 scale-110 filter brightness-95 contrast-105">
              {tileGrid.map((tile) => (
                <img
                  key={tile.key}
                  src={tile.url}
                  alt="Satélite HD do Telhado"
                  className="w-full h-full object-cover border-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://static-maps.yandex.ru/1.x/?l=sat&ll=${centerLng},${centerLat}&z=18&size=450,450`;
                  }}
                />
              ))}
              <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
            </div>
          )}

          {/* Fundo 2: Moldura de Grid Vetorial Blueprint (Modo Diagrama) */}
          {mapMode === 'VECTOR' && (
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-50"></div>
          )}

          {/* Canvas SVG Interativo para Telhado e Módulos */}
          <svg
            className="w-full h-full relative z-10 cursor-crosshair select-none"
            viewBox="0 0 800 600"
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleSvgMouseUp}
          >
            <defs>
              <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
              </linearGradient>
              <pattern id="solarGrid" width="10" height="14" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 14" fill="none" stroke="#60a5fa" strokeWidth="0.6" opacity="0.45" />
              </pattern>
            </defs>

            {/* Polígono do Telhado (Perímetro Exterior) */}
            <polygon
              points={polygonVertices.map((v) => `${v.x},${v.y}`).join(" ")}
              fill="rgba(15, 23, 42, 0.65)"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeDasharray="none"
            />

            {/* Margem de Segurança Interna (Recuo) */}
            {polygonVertices.length >= 3 && (
              <polygon
                points={polygonVertices.map((v) => {
                  const cx = polygonVertices.reduce((a, b) => a + b.x, 0) / polygonVertices.length;
                  const cy = polygonVertices.reduce((a, b) => a + b.y, 0) / polygonVertices.length;
                  const factor = 1 - (marginMeters * 0.05);
                  const vx = cx + (v.x - cx) * factor;
                  const vy = cy + (v.y - cy) * factor;
                  return `${vx},${vy}`;
                }).join(" ")}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            )}

            {/* Módulos Encaixados no Telhado */}
            {autoFillResult.panels.map((panel, idx) => {
              const pxX = 400 + panel.center.x * PIXELS_PER_METER;
              const pxY = 300 + panel.center.y * PIXELS_PER_METER;
              const pWidth = panel.widthMeters * PIXELS_PER_METER;
              const pHeight = panel.heightMeters * PIXELS_PER_METER;

              return (
                <g key={panel.id} transform={`rotate(${azimuthDegrees}, ${pxX}, ${pxY})`}>
                  <rect
                    x={pxX - pWidth / 2}
                    y={pxY - pHeight / 2}
                    width={pWidth}
                    height={pHeight}
                    rx="3"
                    fill="url(#panelGrad)"
                    stroke="#93c5fd"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={pxX - pWidth / 2}
                    y={pxY - pHeight / 2}
                    width={pWidth}
                    height={pHeight}
                    rx="3"
                    fill="url(#solarGrid)"
                  />
                  <text
                    x={pxX}
                    y={pxY + 4}
                    fontSize="10"
                    fontWeight="bold"
                    fill="#ffffff"
                    textAnchor="middle"
                  >
                    {idx + 1}
                  </text>
                </g>
              );
            })}

            {/* Vértices Editáveis do Telhado (Arrastáveis) */}
            {polygonVertices.map((v, i) => (
              <circle
                key={i}
                cx={v.x}
                cy={v.y}
                r={draggingVertexIndex === i ? "9" : "7"}
                fill={draggingVertexIndex === i ? "#f59e0b" : "#38bdf8"}
                stroke="#ffffff"
                strokeWidth="2"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingVertexIndex(i);
                }}
                className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
              />
            ))}
          </svg>

          {/* Rosa dos Ventos & Indicador de Orientação */}
          <div className="absolute top-4 right-4 z-20 bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl text-center shadow-xl">
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-foreground mb-1">
              <Compass className="w-4 h-4 text-primary" /> Azimute
            </div>
            <span className="font-black text-primary text-base">{azimuthDegrees}°</span>
            <span className="block text-[10px] text-muted-foreground font-bold mt-0.5">
              {azimuthDegrees === 0 ? "Norte (0°)" : azimuthDegrees === 90 ? "Leste (90°)" : azimuthDegrees === 180 ? "Sul (180°)" : azimuthDegrees === 270 ? "Oeste (270°)" : "Personalizado"}
            </span>
          </div>

          {/* Controle de Zoom do Satélite */}
          <div className="absolute bottom-6 left-6 z-20 bg-card/90 backdrop-blur-md border border-border p-1.5 rounded-2xl shadow-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel(Math.min(20, zoomLevel + 1))}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              title="Aumentar Zoom Satélite"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-black px-2 text-primary">{zoomLevel}x</span>
            <button
              type="button"
              onClick={() => setZoomLevel(Math.max(17, zoomLevel - 1))}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              title="Diminuir Zoom Satélite"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* 3. Painel Lateral de Engenharia & Parâmetros (Collapsible Workspace Sidebar) */}
        {showSidebar && (
          <aside className="w-80 sm:w-96 h-full bg-card/95 backdrop-blur-md border-l border-border p-5 overflow-y-auto flex flex-col justify-between shadow-2xl z-20 animate-in slide-in-from-right duration-200">
            
            <div className="space-y-5">
              
              {/* Presets de Formatos Rápidos */}
              <div>
                <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Geometria do Telhado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetShape('RECTANGLE')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                      activePreset === 'RECTANGLE'
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    Retangular
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetShape('L_SHAPE')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                      activePreset === 'L_SHAPE'
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    Em "L"
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetShape('TRAPEZOID')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                      activePreset === 'TRAPEZOID'
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    Trapezoidal
                  </button>
                </div>
              </div>

              {/* Ajustes Técnicos (Sliders) */}
              <div className="space-y-4 bg-secondary/30 p-4 rounded-2xl border border-border">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Ajustes de Engenharia
                </h4>

                {/* Recuo de Segurança */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-muted-foreground">Recuo das Bordas:</span>
                    <span className="text-primary">{marginMeters} m</span>
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
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Afastamento de cumeeiras e rufos</span>
                </div>

                {/* Orientação (Azimute) */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-muted-foreground">Orientação (Azimute):</span>
                    <span className="text-primary">{azimuthDegrees}°</span>
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

                {/* Inclinação */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-muted-foreground">Inclinação do Telhado:</span>
                    <span className="text-primary">{pitchDegrees}°</span>
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

                {/* Orientação do Módulo */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Orientação das Placas</label>
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
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      Paisagem (Deitada)
                    </button>
                  </div>
                </div>

              </div>

              {/* Card de Resumo da Capacidade Física */}
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground block">Capacidade Física Máxima</span>
                    <span className="text-3xl font-black text-primary">{maxFitCount} Placas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-muted-foreground block">Área Útil Real</span>
                    <span className="text-sm font-extrabold text-foreground">{autoFillResult.usableAreaM2} m²</span>
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
                        {isDeficit ? 'Espaço Físico Insuficiente!' : 'Capacidade Confirmada!'}
                      </span>
                      <span>
                        {isDeficit
                          ? `Necessidade por consumo: ${initialRequiredModules} placas. Telhado comporta até ${maxFitCount} placas.`
                          : `Suporta as ${initialRequiredModules} placas necessárias pelo consumo.`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Botão de Ação para Salvar e Voltar */}
            <div className="pt-4 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  router.push(`/simulador?roofLimit=${maxFitCount}`);
                }}
                className="w-full py-4 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Aplicar {maxFitCount} Placas ao Simulador</span>
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

          </aside>
        )}

      </div>

    </div>
  );
}

export default function RoofStudioPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-slate-950 flex items-center justify-center text-primary font-extrabold text-sm gap-2">
        <Loader2 className="w-6 h-6 animate-spin" /> Carregando Estudo de Telhado Ultra HD...
      </div>
    }>
      <RoofStudioContent />
    </Suspense>
  );
}
