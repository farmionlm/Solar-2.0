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
  const [zoomLevel, setZoomLevel] = useState<number>(20); // Default Zoom 20 (Ultra Sharp HD)
  const [mapMode, setMapMode] = useState<'SATELLITE' | 'VECTOR'>('SATELLITE');

  // Estados de Engenharia do Telhado
  const [marginMeters, setMarginMeters] = useState<number>(0.5);
  const [azimuthDegrees, setAzimuthDegrees] = useState<number>(0);
  const [pitchDegrees, setPitchDegrees] = useState<number>(15);
  const [moduleOrientation, setModuleOrientation] = useState<'PORTRAIT' | 'LANDSCAPE'>('PORTRAIT');
  const [selectedModulePowerW, setSelectedModulePowerW] = useState<number>(550);
  const [moduleWidthMeters, setModuleWidthMeters] = useState<number>(1.13);
  const [moduleHeightMeters, setModuleHeightMeters] = useState<number>(2.28);

  // Vértices do telhado em METROS reais em relação ao centro do imóvel
  // Inicialmente um retângulo típico de 10m de largura por 7.2m de comprimento
  const [polygonMeters, setPolygonMeters] = useState<Point2D[]>([
    { x: -5, y: -3.6 },
    { x: 5, y: -3.6 },
    { x: 5, y: 3.6 },
    { x: -5, y: 3.6 },
  ]);

  const [activePreset, setActivePreset] = useState<'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID'>('RECTANGLE');
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point2D | null>(null);
  const [initialMetersOnDrag, setInitialMetersOnDrag] = useState<Point2D[]>([]);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Medição do container para sincronizar com o canvas
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 1000,
    height: 700,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth || 1000,
          height: containerRef.current.clientHeight || 700,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const centerCanvasX = containerDimensions.width / 2;
  const centerCanvasY = containerDimensions.height / 2;

  // Cálculo rigoroso da escala geográfica do mapa (Web Mercator) em pixels por metro
  const metersPerPixel = useMemo(() => {
    return (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoomLevel);
  }, [centerLat, zoomLevel]);

  const pixelsPerMeter = useMemo(() => {
    return 1 / Math.max(0.0001, metersPerPixel);
  }, [metersPerPixel]);

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
            setZoomLevel(20);
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
          setZoomLevel(20);
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

  // Presets de Formatos em METROS Reais
  const applyPresetShape = (shape: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID') => {
    setActivePreset(shape);
    if (shape === 'RECTANGLE') {
      setPolygonMeters([
        { x: -5, y: -3.6 },
        { x: 5, y: -3.6 },
        { x: 5, y: 3.6 },
        { x: -5, y: 3.6 },
      ]);
    } else if (shape === 'L_SHAPE') {
      setPolygonMeters([
        { x: -5, y: -3.6 },
        { x: 5, y: -3.6 },
        { x: 5, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 3.6 },
        { x: -5, y: 3.6 },
      ]);
    } else if (shape === 'TRAPEZOID') {
      setPolygonMeters([
        { x: -3.2, y: -3.6 },
        { x: 3.2, y: -3.6 },
        { x: 5.6, y: 3.6 },
        { x: -5.6, y: 3.6 },
      ]);
    }
  };

  // Converte vértices em metros para pixels no canvas SVG
  const polygonVerticesPixels: Point2D[] = useMemo(() => {
    return polygonMeters.map((m) => ({
      x: centerCanvasX + m.x * pixelsPerMeter,
      y: centerCanvasY + m.y * pixelsPerMeter,
    }));
  }, [polygonMeters, centerCanvasX, centerCanvasY, pixelsPerMeter]);

  // Converter metros locais para LatLng reais relativos à localização pesquisada
  const latLngPoints: LatLngPoint[] = useMemo(() => {
    return polygonMeters.map((m) => ({
      lat: centerLat + (m.y / 111000),
      lng: centerLng + (m.x / (111000 * Math.cos((centerLat * Math.PI) / 180))),
    }));
  }, [polygonMeters, centerLat, centerLng]);

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

      L.tileLayer(tileUrl, { maxZoom: 22, maxNativeZoom: 20 }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        setCenterLat(c.lat);
        setCenterLng(c.lng);
      });
      leafletInstanceRef.current = map;
    };

    loadLeaflet();
  }, [centerLat, centerLng, zoomLevel, tileProvider, mapMode]);

  // Helper para desrotacionar coordenadas de tela com base na orientação (Azimute)
  const getUnrotatedPoint = (
    screenX: number,
    screenY: number,
    originX: number,
    originY: number,
    angleDegrees: number
  ) => {
    const rad = (-angleDegrees * Math.PI) / 180;
    const dx = screenX - originX;
    const dy = screenY - originY;
    return {
      x: originX + (dx * Math.cos(rad) - dy * Math.sin(rad)),
      y: originY + (dx * Math.sin(rad) + dy * Math.cos(rad)),
    };
  };

  // Movimentação do Telhado Inteiro (Pan Polygon) em Metros Desrotacionados
  const handlePolygonPointerDown = (e: React.PointerEvent<SVGPolygonElement>) => {
    e.stopPropagation();
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialMetersOnDrag([...polygonMeters]);
  };

  const handlePolygonPointerMove = (e: React.PointerEvent<any>) => {
    if (!dragStartPos) return;
    const dxScreen = e.clientX - dragStartPos.x;
    const dyScreen = e.clientY - dragStartPos.y;

    const rad = (-azimuthDegrees * Math.PI) / 180;
    const dxUnrotated = dxScreen * Math.cos(rad) - dyScreen * Math.sin(rad);
    const dyUnrotated = dxScreen * Math.sin(rad) + dyScreen * Math.cos(rad);

    const dxMeters = dxUnrotated / pixelsPerMeter;
    const dyMeters = dyUnrotated / pixelsPerMeter;

    setPolygonMeters(
      initialMetersOnDrag.map((v) => ({
        x: Number((v.x + dxMeters).toFixed(2)),
        y: Number((v.y + dyMeters).toFixed(2)),
      }))
    );
  };

  const handlePolygonPointerUp = (e?: React.PointerEvent<any>) => {
    if (dragStartPos) {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      }
      setDragStartPos(null);
    }
  };

  // Arraste Fluído, Preciso e Sem Flickering dos Vértices em Metros
  const handleVertexPointerDown = (index: number, e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setDraggingVertexIndex(index);
  };

  const handleVertexPointerMove = (index: number, e: React.PointerEvent<any>) => {
    if (draggingVertexIndex !== index) return;
    const svg = e.currentTarget.ownerSVGElement || (e.currentTarget as SVGElement);
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Desrotaciona a posição do mouse em relação à origem estática do Canvas (centerCanvasX, centerCanvasY)
    const unrotated = getUnrotatedPoint(
      clientX,
      clientY,
      centerCanvasX,
      centerCanvasY,
      azimuthDegrees
    );

    const mX = (unrotated.x - centerCanvasX) / pixelsPerMeter;
    const mY = (unrotated.y - centerCanvasY) / pixelsPerMeter;

    setPolygonMeters((prev) => {
      const updated = [...prev];
      updated[index] = { x: Number(mX.toFixed(2)), y: Number(mY.toFixed(2)) };
      return updated;
    });
  };

  const handleVertexPointerUp = (index: number, e?: React.PointerEvent<any>) => {
    if (draggingVertexIndex === index) {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      }
      setDraggingVertexIndex(null);
    }
  };

  // Handler Global de PointerMove/Up no SVG Canvas para evitar perda de evento durante drag rápido
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingVertexIndex !== null) {
      handleVertexPointerMove(draggingVertexIndex, e);
    } else if (dragStartPos) {
      handlePolygonPointerMove(e);
    } else if (isRotating) {
      handleRotatePointerMove(e);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingVertexIndex !== null) handleVertexPointerUp(draggingVertexIndex, e);
    if (dragStartPos) handlePolygonPointerUp(e);
    if (isRotating) handleRotatePointerUp(e);
  };

  // Centroide em Metros e em Pixels
  const polygonCentroidMeters = useMemo(() => {
    if (!polygonMeters || polygonMeters.length === 0) return { x: 0, y: 0 };
    const sumX = polygonMeters.reduce((acc, v) => acc + v.x, 0);
    const sumY = polygonMeters.reduce((acc, v) => acc + v.y, 0);
    return {
      x: sumX / polygonMeters.length,
      y: sumY / polygonMeters.length,
    };
  }, [polygonMeters]);

  const polygonCentroidPixels = useMemo(() => {
    return {
      x: centerCanvasX + polygonCentroidMeters.x * pixelsPerMeter,
      y: centerCanvasY + polygonCentroidMeters.y * pixelsPerMeter,
    };
  }, [centerCanvasX, centerCanvasY, polygonCentroidMeters, pixelsPerMeter]);

  const [isRotating, setIsRotating] = useState(false);

  // Rotação Interativa da Estrutura Completa do Telhado (Alça ↻) em relação ao Centro do Canvas
  const handleRotatePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setIsRotating(true);
  };

  const handleRotatePointerMove = (e: React.PointerEvent<any>) => {
    if (!isRotating) return;
    const svg = e.currentTarget.ownerSVGElement || (e.currentTarget as SVGElement);
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - centerCanvasX;
    const dy = mouseY - centerCanvasY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    setAzimuthDegrees(Math.round(angle));
  };

  const handleRotatePointerUp = (e?: React.PointerEvent<any>) => {
    if (isRotating) {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      }
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
        <div ref={containerRef} className="relative flex-1 h-full bg-slate-950 flex items-center justify-center overflow-hidden">
          
          {/* Badge de Escala Real de Engenharia */}
          <div className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-md border border-border p-2.5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Escala Física Real: <strong className="text-primary">1m = {pixelsPerMeter.toFixed(1)} px</strong></span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-[11px] font-bold text-muted-foreground">
              Módulo Sol: {moduleWidthMeters}m × {moduleHeightMeters}m (~{(moduleWidthMeters * moduleHeightMeters).toFixed(2)} m²)
            </span>
          </div>

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
            className="w-full h-full relative z-10 select-none cursor-crosshair"
            viewBox={`0 0 ${containerDimensions.width} ${containerDimensions.height}`}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
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

            {/* Grupo Único do Telhado & Módulos Rotacionados pelo Azimute em relação à Origem Estática (centerCanvasX, centerCanvasY) */}
            <g transform={`rotate(${azimuthDegrees}, ${centerCanvasX}, ${centerCanvasY})`}>
              
              {/* Polígono do Telhado (Perímetro Exterior em Metros Reais - Arrastável) */}
              <polygon
                points={polygonVerticesPixels.map((v) => `${v.x},${v.y}`).join(" ")}
                fill="rgba(15, 23, 42, 0.65)"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="none"
                onPointerDown={handlePolygonPointerDown}
                className="cursor-move hover:fill-slate-900/80 transition-colors"
              />

              {/* Margem de Segurança Interna (Recuo) */}
              {polygonVerticesPixels.length >= 3 && (
                <polygon
                  points={polygonVerticesPixels.map((v) => {
                    const cx = polygonCentroidPixels.x;
                    const cy = polygonCentroidPixels.y;
                    const distToCenter = Math.hypot(v.x - cx, v.y - cy);
                    const marginPx = marginMeters * pixelsPerMeter;
                    const factor = Math.max(0.2, 1 - marginPx / Math.max(1, distToCenter));
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
                const pxX = centerCanvasX + panel.center.x * pixelsPerMeter;
                const pxY = centerCanvasY + panel.center.y * pixelsPerMeter;
                const pWidth = panel.widthMeters * pixelsPerMeter;
                const pHeight = panel.heightMeters * pixelsPerMeter;

                return (
                  <g key={panel.id} className="pointer-events-none">
                    <rect
                      x={pxX - pWidth / 2}
                      y={pxY - pHeight / 2}
                      width={pWidth}
                      height={pHeight}
                      rx="2"
                      fill="url(#panelGrad)"
                      stroke="#93c5fd"
                      strokeWidth="1.2"
                    />
                    <rect
                      x={pxX - pWidth / 2}
                      y={pxY - pHeight / 2}
                      width={pWidth}
                      height={pHeight}
                      rx="2"
                      fill="url(#solarGrid)"
                    />
                    {pWidth > 14 && (
                      <text
                        x={pxX}
                        y={pxY + 4}
                        fontSize={Math.max(8, Math.min(12, pWidth * 0.45))}
                        fontWeight="bold"
                        fill="#ffffff"
                        textAnchor="middle"
                      >
                        {idx + 1}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Cotações em Metros das Arestas do Telhado */}
              {polygonMeters.map((v1, i) => {
                const v2 = polygonMeters[(i + 1) % polygonMeters.length];
                const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y).toFixed(1);
                const p1 = polygonVerticesPixels[i];
                const p2 = polygonVerticesPixels[(i + 1) % polygonVerticesPixels.length];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <g key={`edge-${i}`} className="pointer-events-none">
                    <rect
                      x={midX - 18}
                      y={midY - 8}
                      width="36"
                      height="16"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke="#38bdf8"
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY + 3}
                      fontSize="9"
                      fontWeight="black"
                      fill="#38bdf8"
                      textAnchor="middle"
                    >
                      {edgeLength}m
                    </text>
                  </g>
                );
              })}

              {/* Vértices Editáveis do Telhado (Compactos e Sem Shaking CSS) */}
              {polygonVerticesPixels.map((v, i) => (
                <circle
                  key={i}
                  cx={v.x}
                  cy={v.y}
                  r={draggingVertexIndex === i ? "6" : "4.5"}
                  fill={draggingVertexIndex === i ? "#f59e0b" : "#38bdf8"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  onPointerDown={(e) => handleVertexPointerDown(i, e)}
                  className="cursor-pointer hover:fill-amber-400 drop-shadow-sm"
                />
              ))}

              {/* Alça Interativa de Rotação (↻) no Topo do Telhado */}
              <g
                onPointerDown={handleRotatePointerDown}
                className="cursor-pointer hover:opacity-90"
              >
                <line
                  x1={polygonCentroidPixels.x}
                  y1={polygonCentroidPixels.y - 80}
                  x2={polygonCentroidPixels.x}
                  y2={polygonCentroidPixels.y - 105}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
                <circle
                  cx={polygonCentroidPixels.x}
                  cy={polygonCentroidPixels.y - 105}
                  r="9"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="shadow-md"
                />
                <text
                  x={polygonCentroidPixels.x}
                  y={polygonCentroidPixels.y - 102}
                  fontSize="10"
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
                onClick={() => setZoomLevel(Math.min(22, zoomLevel + 1))}
                className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                title="Aumentar Zoom Satélite"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <span className="text-xs font-black px-2 text-primary">{zoomLevel}x</span>
              <button
                type="button"
                onClick={() => setZoomLevel(Math.max(18, zoomLevel - 1))}
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
