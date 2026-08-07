import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy de Tiles de Satélite
 * Usado pelo downloadStudyImage() no estudo de telhado para contornar
 * o bloqueio de CORS ao desenhar tiles do Google/ESRI em um <canvas> HTML.
 * GET /api/proxy-tile?url=<encoded_tile_url>
 *
 * Segurança:
 * - allowlist de domínios conhecidos (Google Maps / ESRI ArcGIS)
 * - timeout de 8s via AbortSignal
 * - Cache-Control immutable (86400s) para reduzir requisições repetidas
 * - TODO: adicionar rate-limiting via middleware Next.js (ex: Upstash Redis)
 *   caso este endpoint fique exposto a tráfego público significativo.
 */
export async function GET(req: NextRequest) {
  const tileUrl = req.nextUrl.searchParams.get("url");
  if (!tileUrl) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // Valida que é uma URL de tile conhecida (segurança)
  const allowed = [
    "mt1.google.com",
    "mt0.google.com",
    "mt2.google.com",
    "mt3.google.com",
    "server.arcgisonline.com",
  ];
  let hostname: string;
  try {
    hostname = new URL(tileUrl).hostname;
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!allowed.some((h) => hostname.endsWith(h))) {
    return new NextResponse("URL not allowed", { status: 403 });
  }

  try {
    const res = await fetch(tileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SolarStudio/2.0; +https://solar.app)",
        Referer: "https://solar.app/",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[proxy-tile] Erro ao buscar tile:", err);
    return new NextResponse(null, { status: 502 });
  }
}
