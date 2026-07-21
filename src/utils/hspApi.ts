/**
 * Serviço gratuito de consulta de irradiação solar real (HSP) por CEP
 * Utiliza ViaCEP / BrasilAPI para coordenadas geográficas e NASA POWER API para irradiação solar
 */

export type HspResult = {
  hsp: number; // Horas de Sol Pleno (kWh/m²/dia)
  city?: string;
  uf?: string;
  source: 'NASA_POWER' | 'FALLBACK';
};

export async function fetchHspByCep(cep: string): Promise<HspResult> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return { hsp: 4.0, source: 'FALLBACK' };
  }

  try {
    // 1. Consultar ViaCEP para obter a cidade e UF
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!viaCepRes.ok) throw new Error("Erro ViaCEP");
    const viaCepData = await viaCepRes.json();
    
    if (viaCepData.erro) {
      return { hsp: 4.0, source: 'FALLBACK' };
    }

    const city = viaCepData.localidade;
    const uf = viaCepData.uf;

    // 2. Obter latitude/longitude via BrasilAPI (Nominatim Geocoding)
    const geoRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    let lat: number | null = null;
    let lng: number | null = null;

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.location?.coordinates) {
        lng = parseFloat(geoData.location.coordinates.longitude);
        lat = parseFloat(geoData.location.coordinates.latitude);
      }
    }

    // Se BrasilAPI não retornou coordenadas, usar tabela de capitais/regiões como aproximação
    if (!lat || !lng) {
      // Coordenadas aproximadas do ES (Vitória/Linhares) ou SP
      if (uf === 'ES') { lat = -19.3911; lng = -40.0722; }
      else if (uf === 'RJ') { lat = -22.9068; lng = -43.1729; }
      else if (uf === 'MG') { lat = -19.9167; lng = -43.9345; }
      else if (uf === 'BA') { lat = -12.9777; lng = -38.5016; }
      else { lat = -23.5505; lng = -46.6333; } // SP default
    }

    // 3. Consultar NASA POWER API para obter irradiação solar média anual (ALLSKY_SFC_SW_DWN)
    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lng}&latitude=${lat}&format=JSON`;
    const nasaRes = await fetch(nasaUrl);
    
    if (!nasaRes.ok) throw new Error("Erro NASA POWER API");
    const nasaData = await nasaRes.json();
    
    const annualHsp = nasaData?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN;
    
    if (annualHsp && typeof annualHsp === 'number' && annualHsp > 1.5 && annualHsp < 8.0) {
      return {
        hsp: parseFloat(annualHsp.toFixed(2)),
        city,
        uf,
        source: 'NASA_POWER'
      };
    }

    return { hsp: 4.5, city, uf, source: 'FALLBACK' };
  } catch (err) {
    console.warn("Falha na consulta automática de HSP via NASA POWER API, usando fallback:", err);
    return { hsp: 4.0, source: 'FALLBACK' };
  }
}
