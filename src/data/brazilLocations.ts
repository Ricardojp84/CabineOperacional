import { VehicleAxles } from '../types/cockpit';

export interface BrazilFreightHub {
  city: string;
  state: string;
  fullLabel: string;
  region: 'Centro-Oeste' | 'Sudeste' | 'Sul' | 'Nordeste' | 'Norte';
  highways: string[];
  lat: number;
  lng: number;
  role: 'Porto' | 'Agronegócio' | 'Indústria' | 'Entroncamento' | 'Capital';
  avgDieselPrice: number; // R$/L
}

export const BRAZIL_FREIGHT_HUBS: BrazilFreightHub[] = [
  // Centro-Oeste
  {
    city: 'Rondonópolis',
    state: 'MT',
    fullLabel: 'Rondonópolis - MT',
    region: 'Centro-Oeste',
    highways: ['BR-163', 'BR-364'],
    lat: -16.4674,
    lng: -54.6361,
    role: 'Agronegócio',
    avgDieselPrice: 6.29,
  },
  {
    city: 'Sorriso',
    state: 'MT',
    fullLabel: 'Sorriso - MT',
    region: 'Centro-Oeste',
    highways: ['BR-163', 'MT-242'],
    lat: -12.5441,
    lng: -55.7231,
    role: 'Agronegócio',
    avgDieselPrice: 6.38,
  },
  {
    city: 'Sinop',
    state: 'MT',
    fullLabel: 'Sinop - MT',
    region: 'Centro-Oeste',
    highways: ['BR-163'],
    lat: -11.8608,
    lng: -55.5095,
    role: 'Agronegócio',
    avgDieselPrice: 6.42,
  },
  {
    city: 'Cuiabá',
    state: 'MT',
    fullLabel: 'Cuiabá - MT',
    region: 'Centro-Oeste',
    highways: ['BR-163', 'BR-364', 'BR-070'],
    lat: -15.6014,
    lng: -56.0979,
    role: 'Capital',
    avgDieselPrice: 6.25,
  },
  {
    city: 'Rio Verde',
    state: 'GO',
    fullLabel: 'Rio Verde - GO',
    region: 'Centro-Oeste',
    highways: ['BR-060', 'BR-452'],
    lat: -17.7925,
    lng: -50.9192,
    role: 'Agronegócio',
    avgDieselPrice: 6.19,
  },
  {
    city: 'Jataí',
    state: 'GO',
    fullLabel: 'Jataí - GO',
    region: 'Centro-Oeste',
    highways: ['BR-364', 'BR-158'],
    lat: -17.8814,
    lng: -51.7144,
    role: 'Agronegócio',
    avgDieselPrice: 6.22,
  },
  {
    city: 'Campo Grande',
    state: 'MS',
    fullLabel: 'Campo Grande - MS',
    region: 'Centro-Oeste',
    highways: ['BR-163', 'BR-262'],
    lat: -20.4697,
    lng: -54.6201,
    role: 'Capital',
    avgDieselPrice: 6.15,
  },
  {
    city: 'Dourados',
    state: 'MS',
    fullLabel: 'Dourados - MS',
    region: 'Centro-Oeste',
    highways: ['BR-163'],
    lat: -22.2231,
    lng: -54.8125,
    role: 'Agronegócio',
    avgDieselPrice: 6.18,
  },

  // Sudeste
  {
    city: 'Santos',
    state: 'SP',
    fullLabel: 'Porto de Santos - SP',
    region: 'Sudeste',
    highways: ['SP-160 (Imigrantes)', 'SP-150 (Anchieta)', 'SP-055'],
    lat: -23.9618,
    lng: -46.3322,
    role: 'Porto',
    avgDieselPrice: 5.99,
  },
  {
    city: 'São Paulo',
    state: 'SP',
    fullLabel: 'São Paulo - SP',
    region: 'Sudeste',
    highways: ['SP-021 (Rodoanel)', 'BR-116', 'SP-330 (Anhanguera)', 'SP-348 (Bandeirantes)'],
    lat: -23.5505,
    lng: -46.6333,
    role: 'Capital',
    avgDieselPrice: 5.95,
  },
  {
    city: 'Campinas',
    state: 'SP',
    fullLabel: 'Campinas - SP',
    region: 'Sudeste',
    highways: ['SP-330 (Anhanguera)', 'SP-348 (Bandeirantes)', 'SP-065 (Dom Pedro I)'],
    lat: -22.9099,
    lng: -47.0626,
    role: 'Entroncamento',
    avgDieselPrice: 5.92,
  },
  {
    city: 'Ribeirão Preto',
    state: 'SP',
    fullLabel: 'Ribeirão Preto - SP',
    region: 'Sudeste',
    highways: ['SP-330 (Anhanguera)', 'SP-322'],
    lat: -21.1767,
    lng: -47.8208,
    role: 'Agronegócio',
    avgDieselPrice: 5.94,
  },
  {
    city: 'São Carlos',
    state: 'SP',
    fullLabel: 'São Carlos - SP',
    region: 'Sudeste',
    highways: ['SP-310 (Washington Luís)'],
    lat: -22.0175,
    lng: -47.8908,
    role: 'Entroncamento',
    avgDieselPrice: 5.98,
  },
  {
    city: 'Betim',
    state: 'MG',
    fullLabel: 'Betim - MG',
    region: 'Sudeste',
    highways: ['BR-381 (Fernão Dias)', 'BR-262', 'BR-040'],
    lat: -19.9678,
    lng: -44.1986,
    role: 'Indústria',
    avgDieselPrice: 6.12,
  },
  {
    city: 'Uberlândia',
    state: 'MG',
    fullLabel: 'Uberlândia - MG',
    region: 'Sudeste',
    highways: ['BR-050', 'BR-365', 'BR-452'],
    lat: -18.9186,
    lng: -48.2772,
    role: 'Entroncamento',
    avgDieselPrice: 6.14,
  },
  {
    city: 'Belo Horizonte',
    state: 'MG',
    fullLabel: 'Belo Horizonte - MG',
    region: 'Sudeste',
    highways: ['BR-040', 'BR-381', 'BR-262'],
    lat: -19.9167,
    lng: -43.9345,
    role: 'Capital',
    avgDieselPrice: 6.10,
  },

  // Sul
  {
    city: 'Paranaguá',
    state: 'PR',
    fullLabel: 'Porto de Paranaguá - PR',
    region: 'Sul',
    highways: ['BR-277'],
    lat: -25.5163,
    lng: -48.5225,
    role: 'Porto',
    avgDieselPrice: 6.02,
  },
  {
    city: 'Cascavel',
    state: 'PR',
    fullLabel: 'Cascavel - PR',
    region: 'Sul',
    highways: ['BR-277', 'BR-467', 'BR-369'],
    lat: -24.9578,
    lng: -53.4595,
    role: 'Agronegócio',
    avgDieselPrice: 6.08,
  },
  {
    city: 'Curitiba',
    state: 'PR',
    fullLabel: 'Curitiba - PR',
    region: 'Sul',
    highways: ['BR-277', 'BR-116', 'BR-376'],
    lat: -25.429,
    lng: -49.2671,
    role: 'Capital',
    avgDieselPrice: 5.98,
  },
  {
    city: 'Londrina',
    state: 'PR',
    fullLabel: 'Londrina - PR',
    region: 'Sul',
    highways: ['BR-369', 'PR-445'],
    lat: -23.3045,
    lng: -51.1696,
    role: 'Agronegócio',
    avgDieselPrice: 6.04,
  },
  {
    city: 'Chapecó',
    state: 'SC',
    fullLabel: 'Chapecó - SC',
    region: 'Sul',
    highways: ['BR-282', 'BR-480'],
    lat: -27.1004,
    lng: -52.6152,
    role: 'Indústria',
    avgDieselPrice: 6.14,
  },
  {
    city: 'Itajaí',
    state: 'SC',
    fullLabel: 'Porto de Itajaí - SC',
    region: 'Sul',
    highways: ['BR-101', 'BR-470'],
    lat: -26.9078,
    lng: -48.6619,
    role: 'Porto',
    avgDieselPrice: 6.09,
  },
  {
    city: 'Porto Alegre',
    state: 'RS',
    fullLabel: 'Porto Alegre - RS',
    region: 'Sul',
    highways: ['BR-116', 'BR-290', 'BR-386'],
    lat: -30.0346,
    lng: -51.2177,
    role: 'Capital',
    avgDieselPrice: 6.12,
  },
  {
    city: 'Rio Grande',
    state: 'RS',
    fullLabel: 'Porto de Rio Grande - RS',
    region: 'Sul',
    highways: ['BR-392'],
    lat: -32.035,
    lng: -52.0986,
    role: 'Porto',
    avgDieselPrice: 6.16,
  },
  {
    city: 'Passo Fundo',
    state: 'RS',
    fullLabel: 'Passo Fundo - RS',
    region: 'Sul',
    highways: ['BR-285'],
    lat: -28.2628,
    lng: -52.4067,
    role: 'Agronegócio',
    avgDieselPrice: 6.18,
  },

  // Nordeste
  {
    city: 'Feira de Santana',
    state: 'BA',
    fullLabel: 'Feira de Santana - BA',
    region: 'Nordeste',
    highways: ['BR-116', 'BR-324', 'BR-101'],
    lat: -12.2664,
    lng: -38.9663,
    role: 'Entroncamento',
    avgDieselPrice: 6.28,
  },
  {
    city: 'Salvador',
    state: 'BA',
    fullLabel: 'Salvador - BA',
    region: 'Nordeste',
    highways: ['BR-324', 'BA-099'],
    lat: -12.9777,
    lng: -38.5016,
    role: 'Porto',
    avgDieselPrice: 6.32,
  },
  {
    city: 'Vitória da Conquista',
    state: 'BA',
    fullLabel: 'Vitória da Conquista - BA',
    region: 'Nordeste',
    highways: ['BR-116 (Rio-Bahia)'],
    lat: -14.8661,
    lng: -40.8394,
    role: 'Entroncamento',
    avgDieselPrice: 6.34,
  },
  {
    city: 'Luís Eduardo Magalhães',
    state: 'BA',
    fullLabel: 'Luís Eduardo Magalhães - BA',
    region: 'Nordeste',
    highways: ['BR-020', 'BR-242'],
    lat: -12.0969,
    lng: -45.7972,
    role: 'Agronegócio',
    avgDieselPrice: 6.45,
  },
];

/**
 * Route Distance and Toll matrix for key corridors
 */
interface RouteData {
  distanceKm: number;
  tollCount: number;
  tollBaseCostPerAxle: number; // tarifa média por eixo nas praças
  highways: string;
}

const CORRIDOR_DATABASE: Record<string, RouteData> = {
  'rondonopolis-santos': {
    distanceKm: 1480,
    tollCount: 14,
    tollBaseCostPerAxle: 11.2,
    highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-348 ➔ SP-160',
  },
  'sorriso-santos': {
    distanceKm: 1880,
    tollCount: 18,
    tollBaseCostPerAxle: 11.5,
    highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160',
  },
  'sinop-santos': {
    distanceKm: 1960,
    tollCount: 19,
    tollBaseCostPerAxle: 11.5,
    highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-160',
  },
  'rio verde-santos': {
    distanceKm: 980,
    tollCount: 10,
    tollBaseCostPerAxle: 10.8,
    highways: 'BR-060 ➔ BR-153 ➔ SP-310 ➔ SP-160',
  },
  'cascavel-paranagua': {
    distanceKm: 680,
    tollCount: 7,
    tollBaseCostPerAxle: 9.8,
    highways: 'BR-277 ➔ Rodovia do Café ➔ BR-277',
  },
  'curitiba-paranagua': {
    distanceKm: 95,
    tollCount: 1,
    tollBaseCostPerAxle: 14.5,
    highways: 'BR-277 (Descida da Serra)',
  },
  'betim-salvador': {
    distanceKm: 1340,
    tollCount: 9,
    tollBaseCostPerAxle: 8.5,
    highways: 'BR-381 ➔ BR-116 (Rio-Bahia) ➔ BR-324',
  },
  'chapeco-santos': {
    distanceKm: 980,
    tollCount: 11,
    tollBaseCostPerAxle: 10.2,
    highways: 'BR-282 ➔ BR-116 ➔ SP-280 ➔ SP-160',
  },
  'chapeco-itajaí': {
    distanceKm: 540,
    tollCount: 5,
    tollBaseCostPerAxle: 9.2,
    highways: 'BR-282 ➔ BR-470 ➔ BR-101',
  },
  'passo fundo-rio grande': {
    distanceKm: 560,
    tollCount: 6,
    tollBaseCostPerAxle: 10.5,
    highways: 'BR-285 ➔ BR-392',
  },
  'uberlandia-santos': {
    distanceKm: 690,
    tollCount: 8,
    tollBaseCostPerAxle: 11.0,
    highways: 'BR-050 ➔ SP-330 (Anhanguera) ➔ SP-160',
  },
  'luis eduardo magalhaes-salvador': {
    distanceKm: 940,
    tollCount: 4,
    tollBaseCostPerAxle: 7.8,
    highways: 'BR-242 ➔ BR-116 ➔ BR-324',
  },
};

/**
 * Calculates road distance, toll count and cost for any Brazilian origin/destination
 */
export const calculateRoadDistanceAndTolls = (
  originText: string,
  destText: string,
  axles: VehicleAxles
): {
  distanceKm: number;
  tollCount: number;
  totalTollCost: number;
  highways: string;
  isExactCorridor: boolean;
} => {
  const normOrigin = originText.toLowerCase().split('-')[0].trim();
  const normDest = destText.toLowerCase().split('-')[0].trim();

  const key1 = `${normOrigin}-${normDest}`;
  const key2 = `${normDest}-${normOrigin}`;

  if (CORRIDOR_DATABASE[key1]) {
    const d = CORRIDOR_DATABASE[key1];
    return {
      distanceKm: d.distanceKm,
      tollCount: d.tollCount,
      totalTollCost: Math.round(d.tollCount * d.tollBaseCostPerAxle * axles),
      highways: d.highways,
      isExactCorridor: true,
    };
  }

  if (CORRIDOR_DATABASE[key2]) {
    const d = CORRIDOR_DATABASE[key2];
    return {
      distanceKm: d.distanceKm,
      tollCount: d.tollCount,
      totalTollCost: Math.round(d.tollCount * d.tollBaseCostPerAxle * axles),
      highways: d.highways,
      isExactCorridor: true,
    };
  }

  // Geodesic calculation fallback using coordinate hubs
  const originHub = BRAZIL_FREIGHT_HUBS.find(
    (h) => h.city.toLowerCase() === normOrigin || normOrigin.includes(h.city.toLowerCase())
  );
  const destHub = BRAZIL_FREIGHT_HUBS.find(
    (h) => h.city.toLowerCase() === normDest || normDest.includes(h.city.toLowerCase())
  );

  if (originHub && destHub) {
    // Haversine formula * 1.35 factor for road winding in Brazil
    const R = 6371;
    const dLat = ((destHub.lat - originHub.lat) * Math.PI) / 180;
    const dLon = ((destHub.lng - originHub.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((originHub.lat * Math.PI) / 180) *
        Math.cos((destHub.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;
    const roadKm = Math.round(straightKm * 1.32);

    // Estimate tolls: roughly 1 toll plaza every 110-140 km in concession corridors
    const estimatedTollCount = Math.max(1, Math.round(roadKm / 125));
    const tollPerAxle = 10.5;
    const totalTolls = Math.round(estimatedTollCount * tollPerAxle * axles);

    return {
      distanceKm: roadKm,
      tollCount: estimatedTollCount,
      totalTollCost: totalTolls,
      highways: `${originHub.highways[0]} ➔ ${destHub.highways[0]}`,
      isExactCorridor: false,
    };
  }

  // Generic fallback if text not in hub database
  return {
    distanceKm: 850,
    tollCount: 7,
    totalTollCost: Math.round(7 * 10.5 * axles),
    highways: 'Rodovias Federais / Estaduais',
    isExactCorridor: false,
  };
};

/**
 * Given GPS coordinates (lat, lng), finds the nearest Brazilian Freight Hub / Highway
 */
export const findNearestLocation = (
  lat: number,
  lng: number
): { hub: BrazilFreightHub; distanceKm: number } => {
  let closest = BRAZIL_FREIGHT_HUBS[0];
  let minDistance = Infinity;

  for (const hub of BRAZIL_FREIGHT_HUBS) {
    const dLat = ((hub.lat - lat) * Math.PI) / 180;
    const dLon = ((hub.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat * Math.PI) / 180) *
        Math.cos((hub.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = 6371 * c;
    if (d < minDistance) {
      minDistance = d;
      closest = hub;
    }
  }

  return {
    hub: closest,
    distanceKm: Math.round(minDistance),
  };
};
