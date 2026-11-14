/**
 * Cabine Operacional do Caminhoneiro - Serviço de Clima em Tempo Real (Open-Meteo API)
 * Busca geolocalização e condições meteorológicas atuais (temperatura, sol, chuva, cerração,
 * vento e visibilidade) para os pontos de origem e destino da viagem ativa.
 */

export type WeatherConditionCategory =
  | 'sol'
  | 'nublado'
  | 'cerracao'
  | 'chuva'
  | 'tempestade';

export type DrivingSafetyLevel = 'seguro' | 'atencao' | 'alerta' | 'critico';

export interface RoutePointWeather {
  queryLocation: string;
  resolvedCity: string;
  resolvedRegion?: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  visibilityMeters?: number;
  weatherCode: number;
  conditionLabel: string;
  conditionCategory: WeatherConditionCategory;
  safetyLevel: DrivingSafetyLevel;
  drivingAdvice: string;
  isDay: boolean;
  fetchedAt: string;
}

export interface WeatherSearchCandidate {
  cityQuery: string;
  stateAbbr?: string;
}

const BRAZILIAN_STATES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const weatherMemoryCache = new Map<string, { data: RoutePointWeather; timestamp: number }>();

/**
 * Extracts normalized search candidates from Brazilian route location strings
 * such as "Rondonópolis - MT" or "Porto de Santos - SP".
 */
export function extractCitySearchCandidates(rawLocation: string): WeatherSearchCandidate[] {
  const cleaned = (rawLocation || '').trim();
  if (!cleaned) return [];

  // Extract UF state code at the end (e.g., "- MT", ", SP", "/PR")
  const ufMatch = cleaned.match(/[-,/]\s*([A-Za-z]{2})\s*$/);
  const stateAbbr = ufMatch ? ufMatch[1].toUpperCase() : undefined;
  const withoutState = ufMatch ? cleaned.slice(0, ufMatch.index).trim() : cleaned;

  const candidates: WeatherSearchCandidate[] = [];
  if (withoutState) {
    candidates.push({ cityQuery: withoutState, stateAbbr });
  }

  // Strip common logistics/port prefixes if present (e.g., "Porto de Santos" -> "Santos")
  const strippedPrefix = withoutState
    .replace(
      /^(porto\s+de|porto\s+do|terminal\s+graneleiro\s+de|terminal\s+de|terminal\s+portu[aá]rio\s+de|terminal|p[aá]tio\s+de|posto)\s+/i,
      ''
    )
    .trim();

  if (strippedPrefix && strippedPrefix.toLowerCase() !== withoutState.toLowerCase()) {
    candidates.push({ cityQuery: strippedPrefix, stateAbbr });
  }

  return candidates;
}

/**
 * Maps WMO Weather Interpretation Codes + wind/visibility into highway driving guidance.
 */
export function interpretWeatherForDriving(params: {
  weatherCode: number;
  windSpeedKmh: number;
  visibilityMeters?: number;
  isDay?: boolean;
}): {
  conditionLabel: string;
  conditionCategory: WeatherConditionCategory;
  safetyLevel: DrivingSafetyLevel;
  drivingAdvice: string;
} {
  const { weatherCode, windSpeedKmh, visibilityMeters, isDay = true } = params;

  let conditionLabel = isDay ? 'Sol / Céu Limpo' : 'Céu Limpo (Noite)';
  let conditionCategory: WeatherConditionCategory = 'sol';
  let safetyLevel: DrivingSafetyLevel = 'seguro';
  let drivingAdvice =
    'Pista seca e visibilidade plena. Mantenha velocidade de cruzeiro econômica.';

  if (weatherCode === 0) {
    // defaults above
  } else if (weatherCode === 1 || weatherCode === 2) {
    conditionLabel = isDay ? 'Sol entre Nuvens' : 'Parcialmente Nublado';
    conditionCategory = 'sol';
    safetyLevel = 'seguro';
    drivingAdvice =
      'Condição estável na rodovia, sem chuva prevista no momento. Condução normal.';
  } else if (weatherCode === 3) {
    conditionLabel = 'Nublado';
    conditionCategory = 'nublado';
    safetyLevel = 'seguro';
    drivingAdvice =
      'Céu encoberto sem precipitação ativa. Atenção habitual em trechos de serra.';
  } else if (weatherCode === 45 || weatherCode === 48) {
    conditionLabel = 'Cerração / Neblina';
    conditionCategory = 'cerracao';
    safetyLevel = 'alerta';
    drivingAdvice =
      'ALERTA DE CERRAÇÃO: Reduza a velocidade, acione farol baixo/neblina e dobre a distância de segurança.';
  } else if (weatherCode >= 51 && weatherCode <= 57) {
    conditionLabel = 'Garoa / Pista Úmida';
    conditionCategory = 'chuva';
    safetyLevel = 'atencao';
    drivingAdvice =
      'Garoa fina deixa o asfalto escorregadio (mistura com óleo). Reduza 15% a velocidade e evite freadas bruscas.';
  } else if (
    (weatherCode >= 61 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    const isHeavy = weatherCode === 65 || weatherCode === 67 || weatherCode === 82;
    conditionLabel = isHeavy ? 'Chuva Forte' : 'Chuva';
    conditionCategory = 'chuva';
    safetyLevel = isHeavy ? 'critico' : 'alerta';
    drivingAdvice = isHeavy
      ? 'CHUVA FORTE NA ROTA: Alto risco de aquaplanagem e frenagem longa com carga. Considere parada segura.'
      : 'PISTA MOLHADA: Aumente a distância de frenagem para veículos pesados e use freio motor em descidas.';
  } else if (weatherCode >= 95) {
    conditionLabel = 'Tempestade / Raios';
    conditionCategory = 'tempestade';
    safetyLevel = 'critico';
    drivingAdvice =
      'TEMPESTADE SEVERA: Ventos fortes e visibilidade comprometida. Procure um posto ou pátio seguro para aguardar.';
  } else if (weatherCode >= 71 && weatherCode <= 77) {
    conditionLabel = 'Precipitação Fria / Granizo';
    conditionCategory = 'chuva';
    safetyLevel = 'alerta';
    drivingAdvice =
      'Pista escorregadia e baixa aderência. Reduza a marcha e redobre a cautela em curvas.';
  }

  // Escalate if strong crosswinds (critical for baú / sider / lona) or low visibility (< 1000m)
  if (visibilityMeters !== undefined && visibilityMeters > 0 && visibilityMeters < 1000) {
    if (safetyLevel === 'seguro' || safetyLevel === 'atencao') {
      safetyLevel = 'alerta';
    }
    if (conditionCategory !== 'cerracao') {
      conditionLabel = `${conditionLabel} · Baixa Visibilidade`;
    }
    drivingAdvice = `Visibilidade reduzida (~${Math.round(visibilityMeters)}m). ${drivingAdvice}`;
  }

  if (windSpeedKmh >= 45) {
    if (safetyLevel === 'seguro' || safetyLevel === 'atencao') {
      safetyLevel = 'alerta';
    }
    drivingAdvice = `${drivingAdvice} Atenção a rajadas laterais de vento (${Math.round(windSpeedKmh)} km/h).`;
  }

  return {
    conditionLabel,
    conditionCategory,
    safetyLevel,
    drivingAdvice,
  };
}

interface OpenMeteoGeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  admin1?: string;
}

async function geocodeLocation(
  rawLocation: string,
  signal?: AbortSignal
): Promise<OpenMeteoGeocodingResult | null> {
  const candidates = extractCitySearchCandidates(rawLocation);
  for (const candidate of candidates) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      candidate.cityQuery
    )}&count=6&language=pt&format=json`;

    const res = await fetch(url, { signal });
    if (!res.ok) continue;
    const json = (await res.json()) as { results?: OpenMeteoGeocodingResult[] };
    const results = json.results || [];
    if (results.length === 0) continue;

    // Prefer Brazil + matching state if UF was provided
    const expectedStateName = candidate.stateAbbr
      ? BRAZILIAN_STATES[candidate.stateAbbr]?.toLowerCase()
      : undefined;

    if (expectedStateName) {
      const exactBrazilState = results.find(
        (r) =>
          r.country_code === 'BR' &&
          r.admin1 &&
          r.admin1.toLowerCase().includes(expectedStateName)
      );
      if (exactBrazilState) return exactBrazilState;
    }

    const anyBrazil = results.find((r) => r.country_code === 'BR');
    if (anyBrazil) return anyBrazil;

    return results[0];
  }
  return null;
}

export async function fetchWeatherForLocation(
  rawLocation: string,
  options?: { forceRefresh?: boolean; signal?: AbortSignal }
): Promise<RoutePointWeather> {
  const key = rawLocation.trim().toLowerCase();
  if (!key) {
    throw new Error('Localidade não informada na viagem.');
  }

  if (!options?.forceRefresh) {
    const cached = weatherMemoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const geo = await geocodeLocation(rawLocation, options?.signal);
  if (!geo) {
    throw new Error(`Cidade "${rawLocation}" não localizada na base meteorológica.`);
  }

  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,visibility&timezone=auto`;
  const forecastRes = await fetch(forecastUrl, { signal: options?.signal });
  if (!forecastRes.ok) {
    throw new Error('Serviço meteorológico indisponível no momento.');
  }

  const forecastJson = (await forecastRes.json()) as {
    current?: {
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      is_day: number;
      weather_code: number;
      wind_speed_10m: number;
      visibility?: number;
    };
  };

  const current = forecastJson.current;
  if (!current) {
    throw new Error('Dados atuais de clima indisponíveis para esta localidade.');
  }

  const interpretation = interpretWeatherForDriving({
    weatherCode: current.weather_code,
    windSpeedKmh: current.wind_speed_10m,
    visibilityMeters: current.visibility,
    isDay: current.is_day === 1,
  });

  const result: RoutePointWeather = {
    queryLocation: rawLocation,
    resolvedCity: geo.name,
    resolvedRegion: geo.admin1,
    latitude: geo.latitude,
    longitude: geo.longitude,
    temperatureC: Math.round(current.temperature_2m),
    apparentTemperatureC: Math.round(current.apparent_temperature),
    humidityPercent: Math.round(current.relative_humidity_2m),
    windSpeedKmh: Math.round(current.wind_speed_10m),
    visibilityMeters: current.visibility,
    weatherCode: current.weather_code,
    conditionLabel: interpretation.conditionLabel,
    conditionCategory: interpretation.conditionCategory,
    safetyLevel: interpretation.safetyLevel,
    drivingAdvice: interpretation.drivingAdvice,
    isDay: current.is_day === 1,
    fetchedAt: new Date().toISOString(),
  };

  weatherMemoryCache.set(key, { data: result, timestamp: Date.now() });
  return result;
}
