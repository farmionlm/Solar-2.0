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
  Maximize2,
  Plus,
  Trash2,
  Edit3,
  Layers3,
  Tag,
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

export interface RoofSection {
  id: string;
  name: string;
  polygonMeters: Point2D[];
  azimuthDegrees: number;
  pitchDegrees: number;
  marginMeters: number;
  moduleOrientation: 'PORTRAIT' | 'LANDSCAPE';
  arrayStyle: 'UNIFORM_RECTANGLE' | 'MAX_FILL';
  activePreset: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID';
}

function RoofStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCep = searchParams.get("cep") || "";
  const initialRequiredModules = Number(searchParams.get("required")) || 0;

  // Busca do Catálogo de Módulos do banco
  const { data: dbModules } = useSWR("/api/equipments/modules", fetcher);

  // Estados de localização e foto de satélite
  const [searchQuery, setSearchQuery] = useState<string>(initialCep);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>("");
  const [centerLat, setCenterLat] = useState<number>(-20.3155); // Vitória, ES
  const [centerLng, setCenterLng] = useState<number>(-40.3128);
  const [zoomLevel, setZoomLevel] = useState<number>(20); // Default Zoom 20 (Ultra Sharp HD)
  const [mapMode, setMapMode] = useState<'SATELLITE' | 'VECTOR'>('SATELLITE');

  // Dimensões Globais do Módulo Selecionado
  const [selectedModulePowerW, setSelectedModulePowerW] = useState<number>(550);
  const [moduleWidthMeters, setModuleWidthMeters] = useState<number>(1.13);
  const [moduleHeightMeters, setModuleHeightMeters] = useState<number>(2.28);

  // Lista de Águas / Áreas do Telhado (Multi-Seção)
  const [sections, setSections] = useState<RoofSection[]>([
    {
      id: "sec-1",
      name: "Água 1",
      polygonMeters: [
        { x: -5, y: -3.6 },
        { x: 5, y: -3.6 },
        { x: 5, y: 3.6 },
        { x: -5, y: 3.6 },
      ],
      azimuthDegrees: 0,
      pitchDegrees: 15,
      marginMeters: 0.5,
      moduleOrientation: "PORTRAIT",
      arrayStyle: "UNIFORM_RECTANGLE",
      activePreset: "RECTANGLE",
    },
  ]);

  const [activeSectionId, setActiveSectionId] = useState<string>("sec-1");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingEdge, setEditingEdge] = useState<{ sectionId: string; edgeIndex: number; currentLength: number } | null>(null);
  const [inputEdgeLength, setInputEdgeLength] = useState<string>("");

  const handleApplyEdgeLength = (newLength: number) => {
    if (!editingEdge || newLength <= 0 || isNaN(newLength)) return;
    const sec = sections.find((s) => s.id === editingEdge.sectionId);
    if (!sec) return;

    const poly = [...sec.polygonMeters];
    const n = poly.length;
    const i = editingEdge.edgeIndex;
    const j = (i + 1) % n;

    const v1 = poly[i];
    const v2 = poly[j];
    const currentLen = Math.hypot(v2.x - v1.x, v2.y - v1.y);
    if (currentLen === 0) return;

    const ratio = newLength / currentLen;
    const midX = (v1.x + v2.x) / 2;
    const midY = (v1.y + v2.y) / 2;
    const dx = (v2.x - v1.x) / 2;
    const dy = (v2.y - v1.y) / 2;

    poly[i] = {
      x: Number((midX - dx * ratio).toFixed(2)),
      y: Number((midY - dy * ratio).toFixed(2)),
    };
    poly[j] = {
      x: Number((midX + dx * ratio).toFixed(2)),
      y: Number((midY + dy * ratio).toFixed(2)),
    };

    if (n === 4) {
      const oppI = (i + 2) % 4;
      const oppJ = (i + 3) % 4;
      const oppV1 = poly[oppI];
      const oppV2 = poly[oppJ];
      const oppMidX = (oppV1.x + oppV2.x) / 2;
      const oppMidY = (oppV1.y + oppV2.y) / 2;
      const oppDx = (oppV1.x - oppV2.x) / 2;
      const oppDy = (oppV1.y - oppV2.y) / 2;

      poly[oppI] = {
        x: Number((oppMidX + oppDx * ratio).toFixed(2)),
        y: Number((oppMidY + oppDy * ratio).toFixed(2)),
      };
      poly[oppJ] = {
        x: Number((oppMidX - oppDx * ratio).toFixed(2)),
        y: Number((oppMidY - oppDy * ratio).toFixed(2)),
      };
    }

    setSections((prev) =>
      prev.map((s) => (s.id === editingEdge.sectionId ? { ...s, polygonMeters: poly } : s))
    );
    setEditingEdge(null);
  };

  // Seção Ativa Atual
  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === activeSectionId) || sections[0];
  }, [sections, activeSectionId]);

  // Atualizador Auxiliar da Seção Ativa
  const updateActiveSection = (data: Partial<RoofSection>) => {
    setSections((prev) =>
      prev.map((s) => (s.id === activeSectionId ? { ...s, ...data } : s))
    );
  };

  const activeDimensions = useMemo(() => {
    if (!activeSection || !activeSection.polygonMeters || activeSection.polygonMeters.length === 0) {
      return { width: 10, length: 7.2 };
    }
    const xs = activeSection.polygonMeters.map((p) => p.x);
    const ys = activeSection.polygonMeters.map((p) => p.y);
    const w = Number((Math.max(...xs) - Math.min(...xs)).toFixed(1));
    const l = Number((Math.max(...ys) - Math.min(...ys)).toFixed(1));
    return { width: w || 10, length: l || 7.2 };
  }, [activeSection]);

  const handleSetDirectDimensions = (newW: number, newL: number) => {
    if (!activeSection || newW <= 0 || newL <= 0 || isNaN(newW) || isNaN(newL)) return;
    const c = getSectionCentroidMeters(activeSection);
    const halfW = newW / 2;
    const halfL = newL / 2;
    const updatedPolygon: Point2D[] = [
      { x: Number((c.x - halfW).toFixed(2)), y: Number((c.y - halfL).toFixed(2)) },
      { x: Number((c.x + halfW).toFixed(2)), y: Number((c.y - halfL).toFixed(2)) },
      { x: Number((c.x + halfW).toFixed(2)), y: Number((c.y + halfL).toFixed(2)) },
      { x: Number((c.x - halfW).toFixed(2)), y: Number((c.y + halfL).toFixed(2)) },
    ];
    updateActiveSection({ polygonMeters: updatedPolygon });
  };

  // Adicionar Nova Área / Água de Telhado
  const addSection = () => {
    const newId = `sec-${Date.now()}`;
    const newNum = sections.length + 1;
    // Offset inicial para não ficar 100% sobreposto
    const offsetCount = sections.length;
    const offsetX = (offsetCount % 3) * 6 - 3;
    const offsetY = Math.floor(offsetCount / 3) * 6 + 5;

    const newSection: RoofSection = {
      id: newId,
      name: `Água ${newNum}`,
      polygonMeters: [
        { x: offsetX - 4, y: offsetY - 3 },
        { x: offsetX + 4, y: offsetY - 3 },
        { x: offsetX + 4, y: offsetY + 3 },
        { x: offsetX - 4, y: offsetY + 3 },
      ],
      azimuthDegrees: 0,
      pitchDegrees: 15,
      marginMeters: 0.5,
      moduleOrientation: "PORTRAIT",
      arrayStyle: "UNIFORM_RECTANGLE",
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

  // Estados de Arraste / Interação
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Point2D | null>(null);
  const [initialMetersOnDrag, setInitialMetersOnDrag] = useState<Point2D[]>([]);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [draftTimestamp, setDraftTimestamp] = useState<number | null>(null);

  // Auto-save draft to localStorage (com suporte a múltiplas áreas)
  useEffect(() => {
    if (sections.length > 0) {
      const draftData = {
        sections,
        activeSectionId,
        centerLat,
        centerLng,
        zoomLevel,
        timestamp: Date.now(),
      };
      localStorage.setItem("solar_roof_draft", JSON.stringify(draftData));
    }
  }, [sections, activeSectionId, centerLat, centerLng, zoomLevel]);

  // Check for saved draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("solar_roof_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          if ((parsed.sections && Array.isArray(parsed.sections)) || parsed.polygonMeters) {
            setHasDraft(true);
            setDraftTimestamp(parsed.timestamp);
          }
        }
      }
    } catch (err) {
      console.error("Erro ao ler rascunho de telhado:", err);
    }
  }, []);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem("solar_roof_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sections && Array.isArray(parsed.sections)) {
          setSections(parsed.sections);
          if (parsed.activeSectionId) setActiveSectionId(parsed.activeSectionId);
        } else if (parsed.polygonMeters) {
          // Retrocompatibilidade com rascunho legado (área única)
          setSections([
            {
              id: "sec-1",
              name: "Água 1",
              polygonMeters: parsed.polygonMeters,
              azimuthDegrees: parsed.azimuthDegrees ?? 0,
              pitchDegrees: 15,
              marginMeters: parsed.marginMeters ?? 0.5,
              moduleOrientation: "PORTRAIT",
              arrayStyle: "UNIFORM_RECTANGLE",
              activePreset: "RECTANGLE",
            },
          ]);
          setActiveSectionId("sec-1");
        }
        if (parsed.centerLat) setCenterLat(parsed.centerLat);
        if (parsed.centerLng) setCenterLng(parsed.centerLng);
        if (parsed.zoomLevel) setZoomLevel(parsed.zoomLevel);
      }
    } catch (err) {
      console.error("Erro ao restaurar rascunho:", err);
    } finally {
      setHasDraft(false);
    }
  };

  const discardDraft = () => {
    localStorage.removeItem("solar_roof_draft");
    setHasDraft(false);
  };

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

  // Presets de Formatos em METROS Reais para a Seção Ativa
  const applyPresetShape = (shape: 'RECTANGLE' | 'L_SHAPE' | 'TRAPEZOID') => {
    if (!activeSection) return;
    const c = getSectionCentroidMeters(activeSection);
    let newPolygon: Point2D[] = [];
    if (shape === 'RECTANGLE') {
      newPolygon = [
        { x: c.x - 5, y: c.y - 3.6 },
        { x: c.x + 5, y: c.y - 3.6 },
        { x: c.x + 5, y: c.y + 3.6 },
        { x: c.x - 5, y: c.y + 3.6 },
      ];
    } else if (shape === 'L_SHAPE') {
      newPolygon = [
        { x: c.x - 5, y: c.y - 3.6 },
        { x: c.x + 5, y: c.y - 3.6 },
        { x: c.x + 5, y: c.y },
        { x: c.x, y: c.y },
        { x: c.x, y: c.y + 3.6 },
        { x: c.x - 5, y: c.y + 3.6 },
      ];
    } else if (shape === 'TRAPEZOID') {
      newPolygon = [
        { x: c.x - 3.2, y: c.y - 3.6 },
        { x: c.x + 3.2, y: c.y - 3.6 },
        { x: c.x + 5.6, y: c.y + 3.6 },
        { x: c.x - 5.6, y: c.y + 3.6 },
      ];
    }
    updateActiveSection({
      activePreset: shape,
      polygonMeters: newPolygon,
    });
  };

  // Helper para centroide de seções
  function getSectionCentroidMeters(sec: RoofSection): Point2D {
    if (!sec.polygonMeters || sec.polygonMeters.length === 0) return { x: 0, y: 0 };
    const sumX = sec.polygonMeters.reduce((acc, v) => acc + v.x, 0);
    const sumY = sec.polygonMeters.reduce((acc, v) => acc + v.y, 0);
    return {
      x: sumX / sec.polygonMeters.length,
      y: sumY / sec.polygonMeters.length,
    };
  }

  function getSectionCentroidPixels(sec: RoofSection): Point2D {
    const c = getSectionCentroidMeters(sec);
    return {
      x: centerCanvasX + c.x * pixelsPerMeter,
      y: centerCanvasY + c.y * pixelsPerMeter,
    };
  }

  // Motor de Auto-Fill por Seção
  const sectionCalculations = useMemo(() => {
    return sections.map((sec) => {
      const latLngPoints: LatLngPoint[] = sec.polygonMeters.map((m) => ({
        lat: centerLat + m.y / 111000,
        lng: centerLng + m.x / (111000 * Math.cos((centerLat * Math.PI) / 180)),
      }));

      const autoFill: AutoFillResult = autoFillRoofLayout({
        roofPolygon: latLngPoints,
        moduleWidthMeters,
        moduleHeightMeters,
        azimuthDegrees: 0, // A rotação é gerenciada via SVG <g transform="rotate(...)">
        pitchDegrees: sec.pitchDegrees,
        marginMeters: sec.marginMeters,
        panelSpacingMeters: 0.05,
        orientation: sec.moduleOrientation,
        arrayStyle: sec.arrayStyle,
      });

      const polygonVerticesPixels: Point2D[] = sec.polygonMeters.map((m) => ({
        x: centerCanvasX + m.x * pixelsPerMeter,
        y: centerCanvasY + m.y * pixelsPerMeter,
      }));

      const centroidMeters = getSectionCentroidMeters(sec);
      const centroidPixels = getSectionCentroidPixels(sec);

      const rad = (sec.azimuthDegrees * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const rotatedScreenVertices = polygonVerticesPixels.map((v) => {
        const dx = v.x - centroidPixels.x;
        const dy = v.y - centroidPixels.y;
        return {
          x: centroidPixels.x + (dx * cosA - dy * sinA),
          y: centroidPixels.y + (dx * sinA + dy * cosA),
        };
      });

      const screenMinY = rotatedScreenVertices.length > 0
        ? Math.min(...rotatedScreenVertices.map((v) => v.y))
        : centroidPixels.y - 40;
      const screenMinX = rotatedScreenVertices.length > 0
        ? Math.min(...rotatedScreenVertices.map((v) => v.x))
        : centroidPixels.x - 40;
      const screenMaxX = rotatedScreenVertices.length > 0
        ? Math.max(...rotatedScreenVertices.map((v) => v.x))
        : centroidPixels.x + 40;
      const screenCenterX = (screenMinX + screenMaxX) / 2;

      const minYLocal = polygonVerticesPixels.length > 0
        ? Math.min(...polygonVerticesPixels.map((v) => v.y))
        : centroidPixels.y - 40;

      return {
        section: sec,
        autoFill,
        polygonVerticesPixels,
        centroidMeters,
        centroidPixels,
        minYLocal,
        screenMinY,
        screenCenterX,
      };
    });
  }, [sections, centerLat, centerLng, centerCanvasX, centerCanvasY, pixelsPerMeter, moduleWidthMeters, moduleHeightMeters]);

  // Somatório Total Acumulado de Múltiplas Seções
  const totalMaxPanelsCount = useMemo(() => {
    return sectionCalculations.reduce((acc, curr) => acc + curr.autoFill.maxPanelsCount, 0);
  }, [sectionCalculations]);

  const totalUsableAreaM2 = useMemo(() => {
    return Number(sectionCalculations.reduce((acc, curr) => acc + curr.autoFill.usableAreaM2, 0).toFixed(2));
  }, [sectionCalculations]);

  const isDeficit = initialRequiredModules > 0 && totalMaxPanelsCount < initialRequiredModules;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletInstanceRef = useRef<any>(null);

  // Carregador Dinâmico do Mapa de Satélite Leaflet Contínuo
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
    const rad = (angleDegrees * Math.PI) / 180;
    const dx = screenX - originX;
    const dy = screenY - originY;
    return {
      x: originX + (dx * Math.cos(rad) + dy * Math.sin(rad)),
      y: originY + (-dx * Math.sin(rad) + dy * Math.cos(rad)),
    };
  };

  // Movimentação de uma Seção Inteira (Pan Polygon)
  const handlePolygonPointerDown = (secId: string, e: React.PointerEvent<SVGPolygonElement>) => {
    e.stopPropagation();
    setActiveSectionId(secId);
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    const sec = sections.find((s) => s.id === secId);
    if (!sec) return;
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setInitialMetersOnDrag([...sec.polygonMeters]);
  };

  const handlePolygonPointerMove = (e: React.PointerEvent<any>) => {
    if (!dragStartPos || !activeSection) return;
    const dxScreen = e.clientX - dragStartPos.x;
    const dyScreen = e.clientY - dragStartPos.y;

    const dxMeters = dxScreen / pixelsPerMeter;
    const dyMeters = dyScreen / pixelsPerMeter;

    const updatedPolygon = initialMetersOnDrag.map((v) => ({
      x: Number((v.x + dxMeters).toFixed(2)),
      y: Number((v.y + dyMeters).toFixed(2)),
    }));

    updateActiveSection({ polygonMeters: updatedPolygon });
  };

  const handlePolygonPointerUp = (e?: React.PointerEvent<any>) => {
    if (dragStartPos) {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      }
      setDragStartPos(null);
    }
  };

  // Arraste de Vértices da Seção Ativa
  const handleVertexPointerDown = (index: number, e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setDraggingVertexIndex(index);
  };

  const handleVertexPointerMove = (index: number, e: React.PointerEvent<any>) => {
    if (draggingVertexIndex !== index || !activeSection) return;
    const svg = e.currentTarget.ownerSVGElement || (e.currentTarget as SVGElement);
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const activeCalc = sectionCalculations.find((sc) => sc.section.id === activeSectionId);
    if (!activeCalc) return;

    const unrotated = getUnrotatedPoint(
      clientX,
      clientY,
      activeCalc.centroidPixels.x,
      activeCalc.centroidPixels.y,
      activeSection.azimuthDegrees
    );

    const mX = (unrotated.x - centerCanvasX) / pixelsPerMeter;
    const mY = (unrotated.y - centerCanvasY) / pixelsPerMeter;

    const updatedPolygon = activeSection.polygonMeters.map((v, i) =>
      i === index ? { x: Number(mX.toFixed(2)), y: Number(mY.toFixed(2)) } : v
    );

    updateActiveSection({ polygonMeters: updatedPolygon });
  };

  const handleVertexPointerUp = (index: number, e?: React.PointerEvent<any>) => {
    if (draggingVertexIndex === index) {
      if (e && e.currentTarget && e.currentTarget.releasePointerCapture) {
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      }
      setDraggingVertexIndex(null);
    }
  };

  // Estado para arraste direto da imagem do mapa de satélite com o mouse
  const [mapDragStart, setMapDragStart] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);

  const handleMapPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).tagName === 'svg') {
      setMapDragStart({
        x: e.clientX,
        y: e.clientY,
        lat: centerLat,
        lng: centerLng,
      });
    }
  };

  const handleMapPointerMove = (e: React.PointerEvent<any>) => {
    if (!mapDragStart) return;
    const dxPixels = e.clientX - mapDragStart.x;
    const dyPixels = e.clientY - mapDragStart.y;

    const dLat = (dyPixels * metersPerPixel) / 111000;
    const dLng = -(dxPixels * metersPerPixel) / (111000 * Math.cos((mapDragStart.lat * Math.PI) / 180));

    setCenterLat(mapDragStart.lat + dLat);
    setCenterLng(mapDragStart.lng + dLng);
  };

  const handleMapPointerUp = () => {
    setMapDragStart(null);
  };

  // Scroll do Mouse (Wheel) para Zoom In/Out
  const lastWheelTimeRef = useRef<number>(0);
  const handleWheelZoom = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 100) return;
    lastWheelTimeRef.current = now;

    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(22, prev + 1));
    } else if (e.deltaY > 0) {
      setZoomLevel((prev) => Math.max(18, prev - 1));
    }
  };

  // Handler Global de PointerMove/Up no SVG Canvas
  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingVertexIndex !== null) {
      handleVertexPointerMove(draggingVertexIndex, e);
    } else if (dragStartPos) {
      handlePolygonPointerMove(e);
    } else if (isRotating) {
      handleRotatePointerMove(e);
    } else if (mapDragStart) {
      handleMapPointerMove(e);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingVertexIndex !== null) handleVertexPointerUp(draggingVertexIndex, e);
    if (dragStartPos) handlePolygonPointerUp(e);
    if (isRotating) handleRotatePointerUp(e);
    if (mapDragStart) handleMapPointerUp();
  };

  const [isRotating, setIsRotating] = useState(false);

  // Rotação Interativa da Seção Ativa (Alça ↻)
  const handleRotatePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    setIsRotating(true);
  };

  const handleRotatePointerMove = (e: React.PointerEvent<any>) => {
    if (!isRotating || !activeSection) return;
    const svg = e.currentTarget.ownerSVGElement || (e.currentTarget as SVGElement);
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const activeCalc = sectionCalculations.find((sc) => sc.section.id === activeSectionId);
    if (!activeCalc) return;

    const dx = mouseX - activeCalc.centroidPixels.x;
    const dy = mouseY - activeCalc.centroidPixels.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    updateActiveSection({ azimuthDegrees: Math.round(angle) });
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
              Estudo do Telhado Multi-Águas
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {sections.length} {sections.length === 1 ? 'Área' : 'Áreas/Águas'}
              </span>
            </h1>
            <p className="text-[11px] text-muted-foreground hidden md:block">
              Desenho preciso de múltiplas áreas de telhado para cálculo da capacidade física acumulada.
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
              <Map className="w-3.5 h-3.5" /> Satélite Google
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
              <MapPin className="w-3.5 h-3.5" /> Híbrido
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
            <button
              type="button"
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                showLabels
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Exibir ou ocultar rótulos das áreas no mapa"
            >
              <Tag className="w-3.5 h-3.5" /> Rótulos
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

      {hasDraft && (
        <div className="relative z-30 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 px-4 py-2 flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Rascunho de telhado anterior encontrado ({draftTimestamp ? new Date(draftTimestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }) : ''}). Deseja restaurar?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restoreDraft}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded-lg text-xs font-black transition-all shadow-sm active:scale-95"
            >
              Restaurar Rascunho
            </button>
            <button
              onClick={discardDraft}
              className="text-muted-foreground hover:text-foreground px-2 py-1 transition-colors text-xs font-bold"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* 2. Área Principal de Trabalho (Canvas 100vh Fullscreen) */}
      <div className="relative flex-1 w-full h-[calc(100vh-64px)] flex overflow-hidden">
        
        {/* Workspace do Desenho */}
        <div
          ref={containerRef}
          onWheel={handleWheelZoom}
          className="relative flex-1 h-full bg-slate-950 flex items-center justify-center overflow-hidden"
        >
          
          {/* Badge de Escala Real de Engenharia */}
          <div className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-md border border-border p-2.5 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-foreground">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Escala Física Real: <strong className="text-primary">1m = {pixelsPerMeter.toFixed(1)} px</strong></span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-[11px] font-bold text-muted-foreground">
              Módulo: {moduleWidthMeters}m × {moduleHeightMeters}m (~{(moduleWidthMeters * moduleHeightMeters).toFixed(2)} m²)
            </span>
          </div>

          {/* Fundo 1: Imagem de Satélite Contínua (Leaflet HD) */}
          {mapMode === 'SATELLITE' && (
            <div
              ref={mapRef}
              className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing opacity-95 filter brightness-95 contrast-105"
            />
          )}

          {/* Fundo 2: Grid Vetorial Blueprint */}
          {mapMode === 'VECTOR' && (
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-50"></div>
          )}

          {/* Canvas SVG Interativo para Telhados Multi-Áreas e Módulos */}
          <svg
            className={`w-full h-full relative z-10 select-none ${
              mapDragStart ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            viewBox={`0 0 ${containerDimensions.width} ${containerDimensions.height}`}
            onPointerDown={handleMapPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
          >
            <defs>
              <linearGradient id="panelGradActive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="panelGradInactive" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#475569" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#334155" stopOpacity="0.85" />
              </linearGradient>
              <pattern id="solarGrid" width="10" height="14" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 14" fill="none" stroke="#60a5fa" strokeWidth="0.6" opacity="0.45" />
              </pattern>
            </defs>

            {/* Loop sobre Todas as Seções de Telhado (Águas) */}
            {sectionCalculations.map((secCalc) => {
              const { section, autoFill, polygonVerticesPixels, centroidPixels, minYLocal } = secCalc;
              const isActive = section.id === activeSectionId;

              return (
                <g key={section.id} transform={`rotate(${section.azimuthDegrees}, ${centroidPixels.x}, ${centroidPixels.y})`}>
                  
                  {/* Polígono do Telhado (Perímetro Exterior) */}
                  <polygon
                    points={polygonVerticesPixels.map((v) => `${v.x},${v.y}`).join(" ")}
                    fill={isActive ? "rgba(15, 23, 42, 0.60)" : "rgba(30, 41, 59, 0.40)"}
                    stroke={isActive ? "#38bdf8" : "#64748b"}
                    strokeWidth={isActive ? "3" : "1.8"}
                    strokeDasharray={isActive ? "none" : "4 2"}
                    onPointerDown={(e) => handlePolygonPointerDown(section.id, e)}
                    className="cursor-pointer hover:fill-slate-900/75 transition-colors"
                  />

                  {/* Recuo de Segurança Interna (Margem) */}
                  {isActive && polygonVerticesPixels.length >= 3 && (
                    <polygon
                      points={polygonVerticesPixels.map((v) => {
                        const cx = centroidPixels.x;
                        const cy = centroidPixels.y;
                        const distToCenter = Math.hypot(v.x - cx, v.y - cy);
                        const marginPx = section.marginMeters * pixelsPerMeter;
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

                  {/* Módulos Encaixados nesta Seção */}
                  {autoFill.panels.map((panel, idx) => {
                    const ac = panel.alignedCenter || panel.center;
                    const pxX = centroidPixels.x + ac.x * pixelsPerMeter;
                    const pxY = centroidPixels.y + ac.y * pixelsPerMeter;
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
                          fill={isActive ? "url(#panelGradActive)" : "url(#panelGradInactive)"}
                          stroke={isActive ? "#93c5fd" : "#94a3b8"}
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

                  {/* Cotações Interativas em Metros das Arestas (Clique para digitar novo tamanho) */}
                  {isActive && section.polygonMeters.map((v1, i) => {
                    const v2 = section.polygonMeters[(i + 1) % section.polygonMeters.length];
                    const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y).toFixed(1);
                    const p1 = polygonVerticesPixels[i];
                    const p2 = polygonVerticesPixels[(i + 1) % polygonVerticesPixels.length];
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;

                    const dx = midX - centroidPixels.x;
                    const dy = midY - centroidPixels.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const offsetX = midX + (dx / dist) * 12;
                    const offsetY = midY + (dy / dist) * 12;

                    return (
                      <g
                        key={`edge-${i}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSectionId(section.id);
                          setEditingEdge({ sectionId: section.id, edgeIndex: i, currentLength: Number(edgeLength) });
                          setInputEdgeLength(edgeLength);
                        }}
                        className="cursor-pointer hover:scale-110 transition-transform"
                      >
                        <title>{`Clique para digitar o novo tamanho deste lado (${edgeLength}m)`}</title>
                        <rect
                          x={offsetX - 17}
                          y={offsetY - 8}
                          width="34"
                          height="16"
                          rx="5"
                          fill="rgba(15, 23, 42, 0.95)"
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                          className="drop-shadow-sm hover:fill-slate-900 hover:stroke-amber-400"
                        />
                        <text
                          x={offsetX}
                          y={offsetY + 3.5}
                          fontSize="8.5"
                          fontWeight="black"
                          fill="#38bdf8"
                          textAnchor="middle"
                        >
                          {edgeLength}m
                        </text>
                      </g>
                    );
                  })}

                  {/* Vértices Editáveis (Apenas Seção Ativa) */}
                  {isActive && polygonVerticesPixels.map((v, i) => (
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

                  {/* Pílula / Rótulo Flutuante Externo (20px acima da borda superior local, rotacionando junto com a seção) */}
                  {showLabels && (
                    <g
                      transform={`translate(${centroidPixels.x}, ${secCalc.minYLocal - 20})`}
                      className="pointer-events-none select-none"
                    >
                      <rect
                        x="-38"
                        y="-10"
                        width="76"
                        height="20"
                        rx="10"
                        fill={isActive ? "rgba(15, 23, 42, 0.94)" : "rgba(30, 41, 59, 0.88)"}
                        stroke={isActive ? "#38bdf8" : "#64748b"}
                        strokeWidth="1.2"
                        className="shadow-lg"
                      />
                      <text
                        x="0"
                        y="3"
                        fontSize="9"
                        fontWeight="black"
                        fill={isActive ? "#38bdf8" : "#e2e8f0"}
                        textAnchor="middle"
                      >
                        {section.name}: {autoFill.maxPanelsCount}p.
                      </text>
                    </g>
                  )}

                  {/* Alça Interativa de Rotação (↻) (48px acima da borda superior local, rotacionando junto com a seção) */}
                  {isActive && (
                    <g
                      onPointerDown={handleRotatePointerDown}
                      className="cursor-pointer hover:opacity-90"
                    >
                      <line
                        x1={centroidPixels.x}
                        y1={secCalc.minYLocal - 30}
                        x2={centroidPixels.x}
                        y2={secCalc.minYLocal - 48}
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      <circle
                        cx={centroidPixels.x}
                        cy={secCalc.minYLocal - 48}
                        r="9"
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="shadow-md"
                      />
                      <text
                        x={centroidPixels.x}
                        y={secCalc.minYLocal - 45}
                        fontSize="10"
                        fontWeight="black"
                        fill="#ffffff"
                        textAnchor="middle"
                      >
                        ↻
                      </text>
                    </g>
                  )}

                </g>
              );
            })}
          </svg>

          {/* Indicador de Azimute da Área Selecionada */}
          <div className="absolute top-4 right-4 z-20 bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl text-center shadow-xl">
            <div className="flex items-center gap-1.5 font-extrabold text-xs text-foreground mb-1">
              <Compass className="w-4 h-4 text-primary" /> Azimute ({activeSection.name})
            </div>
            <span className="font-black text-primary text-base">{activeSection.azimuthDegrees}°</span>
            <span className="block text-[10px] text-muted-foreground font-bold mt-0.5">
              {activeSection.azimuthDegrees === 0
                ? "Norte (0°)"
                : activeSection.azimuthDegrees === 90
                ? "Leste (90°)"
                : activeSection.azimuthDegrees === 180
                ? "Sul (180°)"
                : activeSection.azimuthDegrees === 270
                ? "Oeste (270°)"
                : "Personalizado"}
            </span>
          </div>

          {/* NAVEGAÇÃO DO MAPA & ZOOM */}
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
              
              {/* SELEÇÃO E GERENCIAMENTO DE ÁREAS / ÁGUAS DE TELHADO */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers3 className="w-4 h-4 text-primary" /> Águas do Telhado ({sections.length})
                  </label>
                  <button
                    type="button"
                    onClick={addSection}
                    className="px-2.5 py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nova Área
                  </button>
                </div>

                {/* Lista de Abas / Pílulas de Águas */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {sections.map((sec, idx) => {
                    const secCalc = sectionCalculations.find((sc) => sc.section.id === sec.id);
                    const panelsCount = secCalc?.autoFill.maxPanelsCount || 0;
                    const isSelected = sec.id === activeSectionId;

                    return (
                      <div
                        key={sec.id}
                        onClick={() => setActiveSectionId(sec.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-secondary/60 hover:bg-secondary border-border text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-primary-foreground text-primary" : "bg-primary/20 text-primary"
                            }`}
                          >
                            {idx + 1}
                          </span>

                          {editingNameId === sec.id ? (
                            <input
                              type="text"
                              value={sec.name}
                              onChange={(e) => updateActiveSection({ name: e.target.value })}
                              onBlur={() => setEditingNameId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingNameId(null)}
                              autoFocus
                              className="px-2 py-0.5 text-xs font-bold bg-background text-foreground border border-primary rounded focus:outline-none w-full"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="text-xs font-black truncate">{sec.name}</span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSectionId(sec.id);
                              setEditingNameId(sec.id);
                            }}
                            className={`p-1 rounded hover:bg-black/10 transition-colors ${
                              isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                            }`}
                            title="Renomear área"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-card text-foreground border border-border"
                            }`}
                          >
                            {panelsCount} p.
                          </span>

                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSection(sec.id);
                              }}
                              className={`p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors ${
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}
                              title="Remover área"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Presets de Formatos da Área Ativa */}
              <div>
                <label className="block text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" /> Geometria ({activeSection.name})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetShape('RECTANGLE')}
                    className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border ${
                      activeSection.activePreset === 'RECTANGLE'
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
                      activeSection.activePreset === 'L_SHAPE'
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
                      activeSection.activePreset === 'TRAPEZOID'
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-secondary text-muted-foreground border-border hover:bg-secondary/80'
                    }`}
                  >
                    Trapezoidal
                  </button>
                </div>
              </div>

              {/* Ajustes Técnicos da Área Ativa (Sliders) */}
              <div className="space-y-4 bg-secondary/30 p-4 rounded-2xl border border-border">
                <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Ajustes: {activeSection.name}
                </h4>

                {/* Recuo de Segurança */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-muted-foreground">Recuo das Bordas:</span>
                    <span className="text-primary">{activeSection.marginMeters} m</span>
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
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Afastamento de cumeeiras e rufos</span>
                </div>

                {/* Dimensões Físicas Numéricas (Largura × Comprimento em Metros) */}
                <div className="bg-secondary/40 p-2.5 rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                    <span>Dimensões Exatas em Metros:</span>
                    <span className="text-primary font-black">{activeDimensions.width}m × {activeDimensions.length}m</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Largura (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        value={activeDimensions.width}
                        onChange={(e) => handleSetDirectDimensions(Number(e.target.value), activeDimensions.length)}
                        className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs font-black text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-muted-foreground uppercase block mb-1">Comprimento (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        value={activeDimensions.length}
                        onChange={(e) => handleSetDirectDimensions(activeDimensions.width, Number(e.target.value))}
                        className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs font-black text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Orientação (Azimute) */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-muted-foreground">Orientação (Azimute):</span>
                    <span className="text-primary">{activeSection.azimuthDegrees}°</span>
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
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-muted-foreground">Inclinação do Telhado:</span>
                    <span className="text-primary">{activeSection.pitchDegrees}°</span>
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

                {/* Orientação do Módulo */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Orientação das Placas</label>
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
                      Retrato (Em pé)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveSection({ moduleOrientation: 'LANDSCAPE' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        activeSection.moduleOrientation === 'LANDSCAPE'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      Paisagem (Deitada)
                    </button>
                  </div>
                </div>

                {/* Estilo do Arranjo */}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Disposição do Arranjo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateActiveSection({ arrayStyle: 'UNIFORM_RECTANGLE' })}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                        activeSection.arrayStyle === 'UNIFORM_RECTANGLE'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      Matriz Uniforme
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveSection({ arrayStyle: 'MAX_FILL' })}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                        activeSection.arrayStyle === 'MAX_FILL'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      Preencher Tudo
                    </button>
                  </div>
                </div>

              </div>

              {/* Card de Resumo Combinado de Todas as Águas */}
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground block">Capacidade Total Combinada</span>
                    <span className="text-3xl font-black text-primary">{totalMaxPanelsCount} Placas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-muted-foreground block">Área Útil Total</span>
                    <span className="text-sm font-extrabold text-foreground">{totalUsableAreaM2} m²</span>
                  </div>
                </div>

                {/* Detalhamento por Área */}
                <div className="pt-2 border-t border-primary/20 space-y-1">
                  <span className="text-[10px] font-extrabold text-muted-foreground uppercase block">Distribuição por Área:</span>
                  <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto pr-1">
                    {sectionCalculations.map((sc) => (
                      <div key={sc.section.id} className="text-[11px] font-semibold bg-background/50 p-1.5 rounded-lg flex justify-between border border-border/40">
                        <span className="truncate text-foreground font-bold">{sc.section.name}:</span>
                        <span className="text-primary font-black ml-1">{sc.autoFill.maxPanelsCount} p.</span>
                      </div>
                    ))}
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
                          ? `Necessidade por consumo: ${initialRequiredModules} placas. O telhado comporta até ${totalMaxPanelsCount} placas no total.`
                          : `Suporta as ${initialRequiredModules} placas necessárias pelo consumo do cliente.`}
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
                  router.push(`/simulador?roofLimit=${totalMaxPanelsCount}`);
                }}
                className="w-full py-4 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Aplicar {totalMaxPanelsCount} Placas ao Simulador</span>
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>

          </aside>
        )}

      </div>

      {/* Modal Popover para Ajuste Direto de Tamanho do Lado ao Clicar na Cota */}
      {editingEdge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border p-5 rounded-2xl shadow-2xl max-w-xs w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" /> Ajustar Tamanho do Lado
              </h4>
              <button
                type="button"
                onClick={() => setEditingEdge(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Digite a dimensão exata deste lado (em metros) para ajustar a geometria do telhado:
            </p>

            <div>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="100"
                  value={inputEdgeLength}
                  onChange={(e) => setInputEdgeLength(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyEdgeLength(Number(inputEdgeLength))}
                  autoFocus
                  className="w-full h-12 pl-3 pr-8 bg-secondary border border-border rounded-xl font-black text-xl text-primary focus:outline-none focus:ring-1 focus:ring-primary text-center"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-muted-foreground">m</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleApplyEdgeLength(Number(inputEdgeLength))}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl transition-all shadow-md active:scale-95"
              >
                Aplicar Tamanho
              </button>
              <button
                type="button"
                onClick={() => setEditingEdge(null)}
                className="py-2.5 px-3 bg-secondary hover:bg-secondary/80 text-muted-foreground font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function RoofStudioPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-slate-950 flex items-center justify-center text-primary font-extrabold text-sm gap-2">
        <Loader2 className="w-6 h-6 animate-spin" /> Carregando Estudo de Telhado Multi-Águas...
      </div>
    }>
      <RoofStudioContent />
    </Suspense>
  );
}
