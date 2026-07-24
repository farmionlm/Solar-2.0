"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
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

  // Vértices do telhado em pixels no canvas amplo (800x600) — tamanho compacto inicial
  const [polygonVertices, setPolygonVertices] = useState<Point2D[]>([
    { x: 275, y: 210 },
    { x: 525, y: 210 },
    { x: 525, y: 390 },
    { x: 275, y: 390 },
  ]);

  const [activePreset, setActivePreset] = useState<'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID'>('RECTANGLE');
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point2D | null>(null);
  const [initialVerticesOnDrag, setInitialVerticesOnDrag] = useState<Point2D[]>([]);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Provedor de Imagem de Satélite
  const [tileProvider, setTileProvider] = useState<'GOOGLE_SAT' | 'GOOGLE_HYBRID' | 'ESRI'>('GOOGLE_SAT');

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
          let queryStr = `${cepResult.logradouro || ""}, ${cepResult.bairro || ""}, ${cepResult.localidade} - ${cepResult.uf}, Brasil`;
          let geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`
          );
          let geoData = await geoRes.json();

          if (!geoData || geoData.length === 0) {
            queryStr = `${cepResult.bairro || ""}, ${cepResult.localidade} - ${cepResult.uf}, Brasil`;
            geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`
            );
            geoData = await geoRes.json();
          }

          if (!geoData || geoData.length === 0) {
            queryStr = `${cepResult.localidade} - ${cepResult.uf}, Brasil`;
            geoRes = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`
            );
            geoData = await geoRes.json();
          }

          if (geoData && geoData.length > 0) {
            setCenterLat(parseFloat(geoData[0].lat));
            setCenterLng(parseFloat(geoData[0].lon));
            setMapMode("SATELLITE");
          } else {
            setSearchError("Endereço não localizado no mapa.");
          }
        } else {
          setSearchError("CEP não encontrado.");
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

  // Preset Shapes compactos e centralizados
  const applyPresetShape = (shape: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID') => {
    setActivePreset(shape);
    if (shape === 'RECTANGLE') {
      setPolygonVertices([
        { x: 275, y: 210 },
        { x: 525, y: 210 },
        { x: 525, y: 390 },
        { x: 275, y: 390 },
      ]);
    } else if (shape === 'L_SHAPE') {
      setPolygonVertices([
        { x: 275, y: 210 },
        { x: 525, y: 210 },
        { x: 525, y: 300 },
        { x: 400, y: 300 },
        { x: 400, y: 390 },
        { x: 275, y: 390 },
      ]);
    } else if (shape === 'TRAPEZOID') {
      setPolygonVertices([
        { x: 320, y: 210 },
        { x: 480, y: 210 },
        { x: 540, y: 390 },
        { x: 260, y: 390 },
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

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<any>(null);

  // Carregador Dinâmico do Mapa de Satélite Leaflet Contínuo (Sem cortes nem emendas)
  useEffect(() => {
    if (typeof window === "undefined" || mapMode !== "SATELLITE") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const loadLeaflet = async () => {
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }

      const map = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: zoomLevel,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });

      let tileUrl = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
      if (tileProvider === "GOOGLE_HYBRID") {
        tileUrl = "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";
      } else if (tileProvider === "ESRI") {
        tileUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      }

      L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        setCenterLat(c.lat);
        setCenterLng(c.lng);
      });

      leafletInstanceRef.current = map;
    };

    loadLeaflet();
  }, [centerLat, centerLng, zoomLevel, tileProvider, mapMode]);

  // Movimentação do Telhado Inteiro (Pan Polygon)
  const handlePolygonPointerDown = (e: React.PointerEvent<SVGPolygonElement>) => {
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const svg = target.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (800 / rect.width);
    const y = (e.clientY - rect.top) * (600 / rect.height);
    setDragStartPos({ x, y });
    setInitialVerticesOnDrag([...polygonVertices]);
  };

  const handlePolygonPointerMove = (e: React.PointerEvent<SVGPolygonElement>) => {
    if (!dragStartPos) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const currX = (e.clientX - rect.left) * (800 / rect.width);
    const currY = (e.clientY - rect.top) * (600 / rect.height);
    const dx = currX - dragStartPos.x;
    const dy = currY - dragStartPos.y;

    setPolygonVertices(
      initialVerticesOnDrag.map((v) => ({
        x: Math.round(Math.max(10, Math.min(790, v.x + dx))),
        y: Math.round(Math.max(10, Math.min(590, v.y + dy))),
      }))
    );
  };

  const handlePolygonPointerUp = (e: React.PointerEvent<SVGPolygonElement>) => {
    if (dragStartPos) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setDragStartPos(null);
    }
  };

  // Arraste Sem Flickering das Arestas/Vértices (Pointer Capture)
  const handleVertexPointerDown = (index: number, e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingVertexIndex(index);
  };

  const handleVertexPointerMove = (index: number, e: React.PointerEvent<SVGCircleElement>) => {
    if (draggingVertexIndex !== index) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(10, Math.min(790, (e.clientX - rect.left) * (800 / rect.width)));
    const y = Math.max(10, Math.min(590, (e.clientY - rect.top) * (600 / rect.height)));

    setPolygonVertices((prev) => {
      const updated = [...prev];
      updated[index] = { x: Math.round(x), y: Math.round(y) };
      return updated;
    });
  };

  const handleVertexPointerUp = (index: number, e: React.PointerEvent<SVGCircleElement>) => {
    if (draggingVertexIndex === index) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setDraggingVertexIndex(null);
    }
  };

  // Centroide (Centro de Gravidade) do Polígono do Telhado em Pixels
  const polygonCentroid = useMemo(() => {
    if (!polygonVertices || polygonVertices.length === 0) return { x: 400, y: 300 };
    const sumX = polygonVertices.reduce((acc, v) => acc + v.x, 0);
    const sumY = polygonVertices.reduce((acc, v) => acc + v.y, 0);
    return {
      x: Math.round(sumX / polygonVertices.length),
      y: Math.round(sumY / polygonVertices.length),
    };
  }, [polygonVertices]);

  const [isRotating, setIsRotating] = useState(false);

  // Rotação Interativa da Estrutura Completa do Telhado (Alça ↻)
  const handleRotatePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsRotating(true);
  };

  const handleRotatePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!isRotating) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (800 / rect.width);
    const mouseY = (e.clientY - rect.top) * (600 / rect.height);

    const dx = mouseX - polygonCentroid.x;
    const dy = mouseY - polygonCentroid.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    setAzimuthDegrees(Math.round(angle));
  };

  const handleRotatePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (isRotating) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      setIsRotating(false);
    }
  };

  // Ajuste Fino da Câmera do Satélite (Mover Mapa)
  const panMap = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const delta = 0.00015;
    if (direction === 'UP') setCenterLat((prev) => prev + delta);
    if (direction === 'DOWN') setCenterLat((prev) => prev - delta);
    if (direction === 'LEFT') setCenterLng((prev) => prev - delta);
    if (direction === 'RIGHT') setCenterLng((prev) => prev + delta);
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
              onClick={() => {
                setMapMode('SATELLITE');
                setTileProvider('GOOGLE_SAT');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                mapMode === 'SATELLITE' && tileProvider === 'GOOGLE_SAT'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> Satélite Google HD
            </button>
            <button
              type="button"
              onClick={() => {
                setMapMode('SATELLITE');
                setTileProvider('GOOGLE_HYBRID');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                mapMode === 'SATELLITE' && tileProvider === 'GOOGLE_HYBRID'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> Híbrido (Ruas)
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
          
          {/* Fundo 1: Imagem de Satélite Contínua Nível de Produção (Leaflet HD - Custo ZERO, Sem Cortes) */}
          {mapMode === 'SATELLITE' && (
            <div
              ref={mapRef}
              className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing opacity-95 filter brightness-95 contrast-105"
            />
          )}

          {/* Fundo 2: Moldura de Grid Vetorial Blueprint (Modo Diagrama) */}
          {mapMode === 'VECTOR' && (
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-50"></div>
          )}

          {/* Canvas SVG Interativo para Telhado e Módulos */}
          <svg
            className="w-full h-full relative z-10 select-none"
            viewBox="0 0 800 600"
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

            {/* Grupo Único do Telhado & Módulos Rotacionados pelo Azimute */}
            <g transform={`rotate(${azimuthDegrees}, ${polygonCentroid.x}, ${polygonCentroid.y})`}>
              
              {/* Polígono do Telhado (Perímetro Exterior - Arrastável Inteiro) */}
              <polygon
                points={polygonVertices.map((v) => `${v.x},${v.y}`).join(" ")}
                fill="rgba(15, 23, 42, 0.65)"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="none"
                onPointerDown={handlePolygonPointerDown}
                onPointerMove={handlePolygonPointerMove}
                onPointerUp={handlePolygonPointerUp}
                className="cursor-move hover:fill-slate-900/80 transition-colors"
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
                  className="pointer-events-none"
                />
              )}

              {/* Módulos Encaixados no Telhado */}
              {autoFillResult.panels.map((panel, idx) => {
                const pxX = polygonCentroid.x + panel.center.x * PIXELS_PER_METER;
                const pxY = polygonCentroid.y + panel.center.y * PIXELS_PER_METER;
                const pWidth = panel.widthMeters * PIXELS_PER_METER;
                const pHeight = panel.heightMeters * PIXELS_PER_METER;

                return (
                  <g key={panel.id} className="pointer-events-none">
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

              {/* Vértices Editáveis do Telhado (Arrastáveis sem Flickering) */}
              {polygonVertices.map((v, i) => (
                <circle
                  key={i}
                  cx={v.x}
                  cy={v.y}
                  r={draggingVertexIndex === i ? "10" : "7"}
                  fill={draggingVertexIndex === i ? "#f59e0b" : "#38bdf8"}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  onPointerDown={(e) => handleVertexPointerDown(i, e)}
                  onPointerMove={(e) => handleVertexPointerMove(i, e)}
                  onPointerUp={(e) => handleVertexPointerUp(i, e)}
                  className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                />
              ))}

              {/* Alça Interativa de Rotação (↻) no Topo do Telhado */}
              <g
                onPointerDown={handleRotatePointerDown}
                onPointerMove={handleRotatePointerMove}
                onPointerUp={handleRotatePointerUp}
                className="cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
              >
                <line
                  x1={polygonCentroid.x}
                  y1={polygonCentroid.y - 100}
                  x2={polygonCentroid.x}
                  y2={polygonCentroid.y - 135}
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={polygonCentroid.x}
                  cy={polygonCentroid.y - 135}
                  r="12"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="shadow-lg"
                />
                <text
                  x={polygonCentroid.x}
                  y={polygonCentroid.y - 131}
                  fontSize="12"
                  fontWeight="black"
                  fill="#ffffff"
                  textAnchor="middle"
                >
                  ↻
                </text>
              </g>

            </g>
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

          {/* Controle de NAVEGAÇÃO DO MAPA & ZOOM */}
          <div className="absolute bottom-6 left-6 z-20 bg-card/90 backdrop-blur-md border border-border p-2 rounded-2xl shadow-xl flex items-center gap-3">
            
            {/* Pad Direcional para Mover o Mapa de Satélite */}
            <div className="flex flex-col items-center gap-0.5 border-r border-border pr-3">
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase mb-0.5">Mover Imagem</span>
              <button
                type="button"
                onClick={() => panMap('UP')}
                className="p-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs"
                title="Mover Mapa para Cima"
              >
                ▲
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => panMap('LEFT')}
                  className="p-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs"
                  title="Mover Mapa para Esquerda"
                >
                  ◄
                </button>
                <button
                  type="button"
                  onClick={() => panMap('RIGHT')}
                  className="p-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs"
                  title="Mover Mapa para Direita"
                >
                  ►
                </button>
              </div>
              <button
                type="button"
                onClick={() => panMap('DOWN')}
                className="p-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs"
                title="Mover Mapa para Baixo"
              >
                ▼
              </button>
            </div>

            {/* Controle de Zoom */}
            <div className="flex items-center gap-1">
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
