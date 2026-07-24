export type LatLngPoint = {
  lat: number;
  lng: number;
};

export type Point2D = {
  x: number;
  y: number;
};

export type SolarPanelLayout = {
  id: string;
  center: Point2D;
  alignedCenter: Point2D; // Centro em metros no espaço alinhado aos eixos do telhado
  corners: Point2D[]; // 4 vértices do painel retangular em metros
  widthMeters: number;
  heightMeters: number;
  row: number;
  col: number;
};

export type ObstaclePolygon = {
  id: string;
  name: string;
  points: LatLngPoint[];
};

export type AutoFillOptions = {
  roofPolygon: LatLngPoint[];
  obstacles?: ObstaclePolygon[];
  moduleWidthMeters?: number;   // Ex: 1.13m (largura real do painel)
  moduleHeightMeters?: number;  // Ex: 2.28m (comprimento real do painel)
  azimuthDegrees?: number;      // Orientação do telhado (0° Norte, 90° Leste, 180° Sul, 270° Oeste)
  pitchDegrees?: number;        // Inclinação do telhado (ex: 15°)
  marginMeters?: number;        // Recuo de segurança nas bordas (ex: 0.5m de afastamento de beiral)
  panelSpacingMeters?: number;  // Espaçamento entre painéis (ex: 0.02m)
  orientation?: 'PORTRAIT' | 'LANDSCAPE'; // Retrato ou Paisagem
};

export type AutoFillResult = {
  maxPanelsCount: number;
  totalFlatAreaM2: number;
  totalRealAreaM2: number;
  usableAreaM2: number;
  panels: SolarPanelLayout[];
  roofPolygonMeters: Point2D[];
  densityPercentage: number;
};

// Constantes de conversão geográfica
const EARTH_RADIUS_METERS = 6371000;

/**
 * Converte latitude e longitude em coordenadas Cartesianas 2D em metros (plano tangente local)
 * relativo a um ponto de referência (centroide).
 */
export function latLngToLocalMeters(point: LatLngPoint, origin: LatLngPoint): Point2D {
  const dLat = ((point.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((point.lng - origin.lng) * Math.PI) / 180;
  const meanLat = ((point.lat + origin.lat) * Math.PI) / 360;

  const x = dLng * EARTH_RADIUS_METERS * Math.cos(meanLat);
  const y = dLat * EARTH_RADIUS_METERS;

  return { x, y };
}

/**
 * Converte coordenadas locais em metros de volta para Latitude e Longitude.
 */
export function localMetersToLatLng(point: Point2D, origin: LatLngPoint): LatLngPoint {
  const meanLat = (origin.lat * Math.PI) / 180;
  const dLat = point.y / EARTH_RADIUS_METERS;
  const dLng = point.x / (EARTH_RADIUS_METERS * Math.cos(meanLat));

  const lat = origin.lat + (dLat * 180) / Math.PI;
  const lng = origin.lng + (dLng * 180) / Math.PI;

  return { lat, lng };
}

/**
 * Calcula o centroide de um polígono de pontos Lat/Lng.
 */
export function calculateCentroid(points: LatLngPoint[]): LatLngPoint {
  if (!points || points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let sumLat = 0;
  let sumLng = 0;
  for (const p of points) {
    sumLat += p.lat;
    sumLng += p.lng;
  }

  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}

/**
 * Calcula a área de um polígono 2D em metros quadrados usando a fórmula de Shoelace.
 */
export function calculatePolygonAreaMeters(points: Point2D[]): number {
  if (!points || points.length < 3) return 0;

  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Algoritmo Ray-casting para testar se um ponto 2D está estritamente dentro de um polígono.
 */
export function isPointInsidePolygon(point: Point2D, polygon: Point2D[]): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 1e-10) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Rotaciona um ponto 2D em torno da origem (0,0) por um ângulo em radianos.
 */
export function rotatePoint(point: Point2D, angleRadian: number): Point2D {
  const cos = Math.cos(angleRadian);
  const sin = Math.sin(angleRadian);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/**
 * Aplica recuo/margem de segurança interna a um polígono retangular/regular (shrink).
 */
export function bufferPolygonInward(polygon: Point2D[], marginMeters: number): Point2D[] {
  if (marginMeters <= 0 || !polygon || polygon.length < 3) return polygon;

  // Para cada vértice, empurra em direção ao centroide pela margem
  let cx = 0, cy = 0;
  for (const p of polygon) {
    cx += p.x;
    cy += p.y;
  }
  cx /= polygon.length;
  cy /= polygon.length;

  return polygon.map((p) => {
    const dx = cx - p.x;
    const dy = cy - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= marginMeters) return p;

    const factor = marginMeters / dist;
    return {
      x: p.x + dx * factor,
      y: p.y + dy * factor,
    };
  });
}

/**
 * Motor Principal de Auto-Fill de Painéis Solares no Telhado.
 */
export function autoFillRoofLayout(options: AutoFillOptions): AutoFillResult {
  const {
    roofPolygon,
    obstacles = [],
    moduleWidthMeters = 1.13,
    moduleHeightMeters = 2.28,
    azimuthDegrees = 0,
    pitchDegrees = 15,
    marginMeters = 0.5,
    panelSpacingMeters = 0.02,
    orientation = 'PORTRAIT',
  } = options;

  const defaultEmptyResult: AutoFillResult = {
    maxPanelsCount: 0,
    totalFlatAreaM2: 0,
    totalRealAreaM2: 0,
    usableAreaM2: 0,
    panels: [],
    roofPolygonMeters: [],
    densityPercentage: 0,
  };

  if (!roofPolygon || roofPolygon.length < 3) {
    return defaultEmptyResult;
  }

  // 1. Definir origem (centroide) e converter pontos para metros
  const origin = calculateCentroid(roofPolygon);
  const roofMeters = roofPolygon.map((p) => latLngToLocalMeters(p, origin));

  // Converter obstáculos para coordenadas locais em metros
  const obstaclesMeters = obstacles.map((obs) => ({
    id: obs.id,
    name: obs.name,
    points: obs.points.map((p) => latLngToLocalMeters(p, origin)),
  }));

  // 2. Calcular Área Plana e Área Real (considerando a inclinação do telhado)
  const totalFlatAreaM2 = calculatePolygonAreaMeters(roofMeters);
  const pitchRad = (pitchDegrees * Math.PI) / 180;
  const totalRealAreaM2 = totalFlatAreaM2 / Math.max(0.707, Math.cos(pitchRad)); // cos(45°) limit

  // Apply inward margin
  const bufferedRoofMeters = bufferPolygonInward(roofMeters, marginMeters);
  const usableAreaM2 = calculatePolygonAreaMeters(bufferedRoofMeters);

  // 3. Definir dimensões efetivas do módulo (Portrait x Landscape)
  const panelW = orientation === 'PORTRAIT' ? moduleWidthMeters : moduleHeightMeters;
  const panelH = orientation === 'PORTRAIT' ? moduleHeightMeters : moduleWidthMeters;

  const stepX = panelW + panelSpacingMeters;
  const stepY = panelH + panelSpacingMeters;

  // 4. Rotacionar polígonos pelo ângulo oposto do azimute para alinhar o grid aos eixos X/Y
  const azimuthRad = (-azimuthDegrees * Math.PI) / 180;
  const rotatedRoof = bufferedRoofMeters.map((p) => rotatePoint(p, azimuthRad));
  const rotatedObstacles = obstaclesMeters.map((obs) => ({
    ...obs,
    points: obs.points.map((p) => rotatePoint(p, azimuthRad)),
  }));

  // 5. Obter Bounding Box da área rotacionada
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of rotatedRoof) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const panels: SolarPanelLayout[] = [];
  const reverseAzimuthRad = (azimuthDegrees * Math.PI) / 180;
  let panelCounter = 0;
  let rowIndex = 0;

  // 6. Varredura do Grid no espaço alinhado
  for (let y = minY + panelH / 2; y <= maxY - panelH / 2; y += stepY) {
    let colIndex = 0;
    for (let x = minX + panelW / 2; x <= maxX - panelW / 2; x += stepX) {
      const halfW = panelW / 2;
      const halfH = panelH / 2;

      // 4 cantos do painel candidato no espaço alinhado
      const candidateCornersRotated: Point2D[] = [
        { x: x - halfW, y: y - halfH },
        { x: x + halfW, y: y - halfH },
        { x: x + halfW, y: y + halfH },
        { x: x - halfW, y: y + halfH },
      ];

      // Teste 1: Todos os 4 cantos devem estar DENTRO do telhado rotacionado
      const allCornersInside = candidateCornersRotated.every((corner) =>
        isPointInsidePolygon(corner, rotatedRoof)
      );

      if (allCornersInside) {
        // Teste 2: Nenhum dos cantos ou centro pode estar DENTRO de um obstáculo
        const centerPoint: Point2D = { x, y };
        const collidesWithObstacle = rotatedObstacles.some((obs) =>
          isPointInsidePolygon(centerPoint, obs.points) ||
          candidateCornersRotated.some((corner) => isPointInsidePolygon(corner, obs.points))
        );

        if (!collidesWithObstacle) {
          panelCounter++;
          // Desrotacionar o centro e os 4 cantos para as coordenadas originais
          const unrotatedCenter = rotatePoint({ x, y }, reverseAzimuthRad);
          const unrotatedCorners = candidateCornersRotated.map((c) =>
            rotatePoint(c, reverseAzimuthRad)
          );

          panels.push({
            id: `panel-${panelCounter}`,
            center: unrotatedCenter,
            alignedCenter: { x, y },
            corners: unrotatedCorners,
            widthMeters: panelW,
            heightMeters: panelH,
            row: rowIndex,
            col: colIndex,
          });
        }
      }

      colIndex++;
    }
    rowIndex++;
  }

  const maxPanelsCount = panels.length;
  const totalPanelsAreaM2 = maxPanelsCount * (panelW * panelH);
  const densityPercentage = usableAreaM2 > 0 ? Math.min(100, Math.round((totalPanelsAreaM2 / usableAreaM2) * 100)) : 0;

  return {
    maxPanelsCount,
    totalFlatAreaM2: Number(totalFlatAreaM2.toFixed(2)),
    totalRealAreaM2: Number(totalRealAreaM2.toFixed(2)),
    usableAreaM2: Number(usableAreaM2.toFixed(2)),
    panels,
    roofPolygonMeters: roofMeters,
    densityPercentage,
  };
}
