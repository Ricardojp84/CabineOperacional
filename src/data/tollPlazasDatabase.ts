import { VehicleAxles } from '../types/cockpit';
import { TripType } from './brazilCitiesDatabase';

export type TollCostSeverity = 'critical' | 'moderate' | 'low';

export interface KnownTollPlaza {
  id: string;
  name: string;
  highway: string;
  kmMarker: string;
  concessionaire: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  costPerAxle: number; // R$ per axle (standard tariff reference)
  bypassTip: string;
}

export interface RouteTollPoint {
  id: string;
  name: string;
  highway: string;
  kmMarker: string;
  concessionaire: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  costPerAxle: number;
  totalCost: number; // costPerAxle * axles * multiplier
  sharePercent: number; // % of total route toll cost
  severity: TollCostSeverity;
  rank: number; // 1 = highest cost toll plaza on this route
  bypassTip: string;
  avoidableInEco: boolean;
}

export interface EconomicalRouteOption {
  label: string;
  highways: string;
  distanceKm: number;
  tollCount: number;
  totalTollCost: number;
  tollSavings: number;
  extraKm: number;
  extraDieselCost: number;
  netSavings: number;
  strategySummary: string;
  waypoints: Array<{ lat: number; lng: number }>;
  avoidedPlazaIds: string[];
}

export interface RouteTollAnalysis {
  plazas: RouteTollPoint[];
  topHotspots: RouteTollPoint[]; // Top 3-4 highest cost plazas
  totalAnalyzedCost: number;
  criticalCount: number;
  highestPlazaCost: number;
  averagePlazaCost: number;
  standardPath: Array<{ lat: number; lng: number }>;
  economicalOption: EconomicalRouteOption;
}

/**
 * Curated database of major Brazilian freight highway toll plazas with realistic coordinates and per-axle tariffs.
 */
export const KNOWN_TOLL_PLAZAS: KnownTollPlaza[] = [
  // SP - Sistema Anchieta-Imigrantes / Litoral (Highest tariffs per axle in BR)
  {
    id: 'plaza-sp160-piratininga',
    name: 'Praça Piratininga (Imigrantes)',
    highway: 'SP-160',
    kmMarker: 'km 32',
    concessionaire: 'Ecovias',
    city: 'São Bernardo do Campo',
    state: 'SP',
    lat: -23.812,
    lng: -46.538,
    costPerAxle: 18.4,
    bypassTip: 'Descida via Anchieta (SP-150) pode otimizar filas de caminhão pesado e acesso ao Porto.',
  },
  {
    id: 'plaza-sp021-rodoanel-sul',
    name: 'Praça Rodoanel Sul (Itapecerica)',
    highway: 'SP-021',
    kmMarker: 'km 68',
    concessionaire: 'SPMAr',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.758,
    lng: -46.792,
    costPerAxle: 13.8,
    bypassTip: 'Compare tarifa por eixo com acesso antecipado fora do horário de pico.',
  },
  // SP - Bandeirantes & Anhanguera (Interior -> Capital/Porto)
  {
    id: 'plaza-sp348-caieiras',
    name: 'Praça Caieiras (Bandeirantes)',
    highway: 'SP-348',
    kmMarker: 'km 36',
    concessionaire: 'CCR AutoBAn',
    city: 'Caieiras',
    state: 'SP',
    lat: -23.349,
    lng: -46.774,
    costPerAxle: 14.9,
    bypassTip: 'Alternativa paralela pela Rodovia Anhanguera (SP-330) costuma ter menor tarifa média.',
  },
  {
    id: 'plaza-sp348-itupava',
    name: 'Praça Itupeva (Bandeirantes)',
    highway: 'SP-348',
    kmMarker: 'km 77',
    concessionaire: 'CCR AutoBAn',
    city: 'Itupeva',
    state: 'SP',
    lat: -23.135,
    lng: -47.032,
    costPerAxle: 13.6,
    bypassTip: 'Suspenda eixos vazios no retorno para reduzir cobrança por eixo rodante.',
  },
  {
    id: 'plaza-sp330-valinhos',
    name: 'Praça Valinhos (Anhanguera)',
    highway: 'SP-330',
    kmMarker: 'km 82',
    concessionaire: 'CCR AutoBAn',
    city: 'Valinhos',
    state: 'SP',
    lat: -22.978,
    lng: -47.012,
    costPerAxle: 12.2,
    bypassTip: 'Trecho com desconto progressivo em TAGs eletrônicas para frotas frequentes.',
  },
  {
    id: 'plaza-sp330-limeira',
    name: 'Praça Limeira (Anhanguera)',
    highway: 'SP-330',
    kmMarker: 'km 152',
    concessionaire: 'Intervias',
    city: 'Limeira',
    state: 'SP',
    lat: -22.521,
    lng: -47.392,
    costPerAxle: 11.4,
    bypassTip: 'Verifique rota via SP-310 / SP-225 dependendo do destino no interior.',
  },
  {
    id: 'plaza-sp310-itirapina',
    name: 'Praça Itirapina (Washington Luís)',
    highway: 'SP-310',
    kmMarker: 'km 216',
    concessionaire: 'Eixo SP',
    city: 'Itirapina',
    state: 'SP',
    lat: -22.248,
    lng: -47.826,
    costPerAxle: 12.1,
    bypassTip: 'Pedágio em pista dupla com desconto automático via TAG (DUF/DBT).',
  },
  {
    id: 'plaza-sp310-catanduva',
    name: 'Praça Catiguá / Catanduva',
    highway: 'SP-310',
    kmMarker: 'km 398',
    concessionaire: 'Triângulo do Sol',
    city: 'Catanduva',
    state: 'SP',
    lat: -21.112,
    lng: -49.028,
    costPerAxle: 14.3,
    bypassTip: 'Uma das praças mais caras do corredor SP-310; planeje retorno carregado.',
  },
  {
    id: 'plaza-sp280-itu',
    name: 'Praça Itu (Castello Branco)',
    highway: 'SP-280',
    kmMarker: 'km 74',
    concessionaire: 'CCR ViaOeste',
    city: 'Itu',
    state: 'SP',
    lat: -23.368,
    lng: -47.302,
    costPerAxle: 14.1,
    bypassTip: 'Corredor alternativo pela SP-270 (Raposo Tavares) reduz custo de pedágio por eixo.',
  },
  {
    id: 'plaza-sp300-botucatu',
    name: 'Praça Botucatu (Marechal Rondon)',
    highway: 'SP-300',
    kmMarker: 'km 228',
    concessionaire: 'Rodovias do Tietê',
    city: 'Botucatu',
    state: 'SP',
    lat: -22.851,
    lng: -48.382,
    costPerAxle: 10.6,
    bypassTip: 'Tarifa intermediária; evite desviar por vias vicinais não pavimentadas.',
  },
  // RJ / SP - Dutra
  {
    id: 'plaza-br116-jacarei',
    name: 'Praça Jacareí (Via Dutra)',
    highway: 'BR-116',
    kmMarker: 'km 165',
    concessionaire: 'CCR RioSP',
    city: 'Jacareí',
    state: 'SP',
    lat: -23.285,
    lng: -45.974,
    costPerAxle: 15.2,
    bypassTip: 'Alternativa pela Carvalho Pinto (SP-070) para veículos leves/médios ou horários específicos.',
  },
  {
    id: 'plaza-br116-itatiaia',
    name: 'Praça Itatiaia (Via Dutra)',
    highway: 'BR-116',
    kmMarker: 'km 318',
    concessionaire: 'CCR RioSP',
    city: 'Itatiaia',
    state: 'RJ',
    lat: -22.495,
    lng: -44.563,
    costPerAxle: 16.4,
    bypassTip: 'Praça mais elevada do eixo Rio-SP; confirme Vale-Pedágio obrigatório antes da saída.',
  },
  // PR / SC / SP - Sul & Régis Bittencourt
  {
    id: 'plaza-br277-sao-jose',
    name: 'Praça São José dos Pinhais (Serra do Mar)',
    highway: 'BR-277',
    kmMarker: 'km 60',
    concessionaire: 'EPR Litoral Pioneiro',
    city: 'São José dos Pinhais',
    state: 'PR',
    lat: -25.561,
    lng: -49.048,
    costPerAxle: 17.6,
    bypassTip: 'Maior tarifa unitária rumo a Paranaguá; otimize peso útil da carga (toneladas/viagem).',
  },
  {
    id: 'plaza-br277-campo-largo',
    name: 'Praça São Luiz do Purunã',
    highway: 'BR-277',
    kmMarker: 'km 132',
    concessionaire: 'Via Araucária',
    city: 'Balsa Nova',
    state: 'PR',
    lat: -25.475,
    lng: -49.708,
    costPerAxle: 10.9,
    bypassTip: 'Trecho com balanças próximas; mantenha documentação e carga conferida.',
  },
  {
    id: 'plaza-br277-cascavel',
    name: 'Praça Cascavel / Céu Azul',
    highway: 'BR-277',
    kmMarker: 'km 620',
    concessionaire: 'EPR Iguaçu',
    city: 'Cascavel',
    state: 'PR',
    lat: -25.041,
    lng: -53.688,
    costPerAxle: 10.2,
    bypassTip: 'Corredor principal de grãos do Oeste PR com tarifa estável.',
  },
  {
    id: 'plaza-br376-witmarsum',
    name: 'Praça Witmarsum (Rodovia do Café)',
    highway: 'BR-376',
    kmMarker: 'km 528',
    concessionaire: 'Via Araucária',
    city: 'Palmeira',
    state: 'PR',
    lat: -25.412,
    lng: -49.845,
    costPerAxle: 11.1,
    bypassTip: 'Atenção ao relevo de serra para economizar diesel além do pedágio.',
  },
  {
    id: 'plaza-br116-cajati',
    name: 'Praça Cajati (Régis Bittencourt)',
    highway: 'BR-116',
    kmMarker: 'km 485',
    concessionaire: 'Arteris Régis',
    city: 'Cajati',
    state: 'SP',
    lat: -24.756,
    lng: -48.132,
    costPerAxle: 9.8,
    bypassTip: 'Tarifa competitiva na ligação SP-Curitiba em comparação com eixos paulistas do interior.',
  },
  {
    id: 'plaza-br101-garuva',
    name: 'Praça Garuva (Litoral SC)',
    highway: 'BR-101',
    kmMarker: 'km 1',
    concessionaire: 'Arteris Litoral Sul',
    city: 'Garuva',
    state: 'SC',
    lat: -26.026,
    lng: -48.855,
    costPerAxle: 9.4,
    bypassTip: 'Trecho econômico de pedágio; monitore horários de congestionamento perto de Joinville/Itajaí.',
  },
  // RS
  {
    id: 'plaza-br392-capao-seco',
    name: 'Praça Capão Seco (Rio Grande)',
    highway: 'BR-392',
    kmMarker: 'km 52',
    concessionaire: 'Ecosul',
    city: 'Rio Grande',
    state: 'RS',
    lat: -31.882,
    lng: -52.275,
    costPerAxle: 14.8,
    bypassTip: 'Tarifa elevada na chegada ao Porto de Rio Grande; embutir integralmente na cotação do frete.',
  },
  {
    id: 'plaza-br386-lajeado',
    name: 'Praça Marques de Souza',
    highway: 'BR-386',
    kmMarker: 'km 327',
    concessionaire: 'CCR ViaSul',
    city: 'Marques de Souza',
    state: 'RS',
    lat: -29.327,
    lng: -52.089,
    costPerAxle: 10.6,
    bypassTip: 'Suspensão automática de eixos com TAG traz economia significativa no retorno vazio.',
  },
  // MT / MS / GO / MG - Corredores do Agro
  {
    id: 'plaza-br163-rondonopolis',
    name: 'Praça Rondonópolis Sul',
    highway: 'BR-163',
    kmMarker: 'km 96',
    concessionaire: 'Nova Rota do Oeste',
    city: 'Rondonópolis',
    state: 'MT',
    lat: -16.698,
    lng: -54.712,
    costPerAxle: 10.4,
    bypassTip: 'Corredor principal de escoamento MT; TAG ativa evita filas na balança e praça.',
  },
  {
    id: 'plaza-br163-nova-mutum',
    name: 'Praça Nova Mutum',
    highway: 'BR-163',
    kmMarker: 'km 586',
    concessionaire: 'Nova Rota do Oeste',
    city: 'Nova Mutum',
    state: 'MT',
    lat: -13.941,
    lng: -56.085,
    costPerAxle: 9.8,
    bypassTip: 'Mantenha eixos suspensos quando rodar vazio para economizar na cobrança por eixo.',
  },
  {
    id: 'plaza-br163-sorriso',
    name: 'Praça Sorriso',
    highway: 'BR-163',
    kmMarker: 'km 766',
    concessionaire: 'Nova Rota do Oeste',
    city: 'Sorriso',
    state: 'MT',
    lat: -12.435,
    lng: -55.702,
    costPerAxle: 9.6,
    bypassTip: 'Trecho contínuo com tarifa padronizada da Nova Rota do Oeste.',
  },
  {
    id: 'plaza-br364-mineiros',
    name: 'Praça Alto Araguaia / Mineiros',
    highway: 'BR-364',
    kmMarker: 'km 18',
    concessionaire: 'Via Brasil',
    city: 'Alto Araguaia',
    state: 'MT',
    lat: -17.325,
    lng: -53.214,
    costPerAxle: 12.8,
    bypassTip: 'Ponto de divisa MT/GO com tarifa mais alta; avalie rota via Rio Verde vs Campo Grande.',
  },
  {
    id: 'plaza-br060-goiania',
    name: 'Praça Alexânia / Goiânia',
    highway: 'BR-060',
    kmMarker: 'km 34',
    concessionaire: 'Triunfo Concebra',
    city: 'Alexânia',
    state: 'GO',
    lat: -16.082,
    lng: -48.508,
    costPerAxle: 8.6,
    bypassTip: 'Uma das tarifas mais econômicas do Centro-Oeste por eixo.',
  },
  {
    id: 'plaza-br050-uberaba',
    name: 'Praça Delta / Uberaba (Divisa MG-SP)',
    highway: 'BR-050',
    kmMarker: 'km 198',
    concessionaire: 'Eco050',
    city: 'Delta',
    state: 'MG',
    lat: -19.972,
    lng: -47.772,
    costPerAxle: 11.8,
    bypassTip: 'Entroncamento MG-SP com cobrança automática; alternativa pela BR-153 varia conforme origem.',
  },
  {
    id: 'plaza-br381-mairipora',
    name: 'Praça Mairiporã (Fernão Dias)',
    highway: 'BR-381',
    kmMarker: 'km 65',
    concessionaire: 'Arteris Fernão Dias',
    city: 'Mairiporã',
    state: 'SP',
    lat: -23.318,
    lng: -46.588,
    costPerAxle: 9.4,
    bypassTip: 'Tarifa reduzida frente às rodovias estaduais paulistas (Anhanguera/Bandeirantes).',
  },
  {
    id: 'plaza-br163-campo-grande',
    name: 'Praça Campo Grande Norte',
    highway: 'BR-163',
    kmMarker: 'km 492',
    concessionaire: 'CCR MSVia',
    city: 'Campo Grande',
    state: 'MS',
    lat: -20.285,
    lng: -54.635,
    costPerAxle: 9.5,
    bypassTip: 'Rota MS via SP-300 (Marechal Rondon) oferece menor soma de pedágios até Santos do que eixo Anhanguera/Bandeirantes.',
  },
  {
    id: 'plaza-br116-feiradesantana',
    name: 'Praça Simões Filho / Feira (BR-324)',
    highway: 'BR-324',
    kmMarker: 'km 552',
    concessionaire: 'ViaBahia',
    city: 'Amélia Rodrigues',
    state: 'BA',
    lat: -12.392,
    lng: -38.758,
    costPerAxle: 8.2,
    bypassTip: 'Corredor Bahia com tarifa reduzida; evite retornos desnecessários na região metropolitana.',
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distance from point P to segment A-B in km (approximate equirectangular projection)
 */
function pointToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): { distKm: number; progress: number } {
  const latScale = 111.32;
  const midLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  const lngScale = 111.32 * Math.cos(midLatRad);

  const ax = aLng * lngScale;
  const ay = aLat * latScale;
  const bx = bLng * lngScale;
  const by = bLat * latScale;
  const px = pLng * lngScale;
  const py = pLat * latScale;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { distKm: Math.hypot(px - ax, py - ay), progress: 0 };
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return {
    distKm: Math.hypot(px - projX, py - projY),
    progress: t,
  };
}

/**
 * Generates and ranks toll plazas along the active route, highlighting high-cost hotspots
 * and calculating an economical alternative route for comparison.
 */
export function analyzeRouteTollHotspots(params: {
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
  totalDistanceKm: number;
  totalTollCount: number;
  totalTollCost: number;
  highways: string;
  axles: VehicleAxles;
  tripType: TripType;
}): RouteTollAnalysis {
  const {
    origin,
    destination,
    originCoords,
    destCoords,
    totalDistanceKm,
    totalTollCount,
    totalTollCost,
    highways,
    axles,
    tripType,
  } = params;

  const multiplier = tripType === 'ida_e_volta' ? 2 : 1;
  const oneWayTollCount = Math.max(0, Math.round(totalTollCount / multiplier));
  const straightKm = Math.max(30, haversineKm(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng));
  const corridorToleranceKm = Math.max(45, Math.min(150, straightKm * 0.16));

  // Normalize highway tokens in active route for corridor prioritization
  const upperHighways = highways.toUpperCase();

  // 1. Match known toll plazas lying near the route corridor
  const matched = KNOWN_TOLL_PLAZAS.map((plaza) => {
    const { distKm, progress } = pointToSegmentKm(
      plaza.lat,
      plaza.lng,
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng
    );
    const matchesHighway = upperHighways.includes(plaza.highway.toUpperCase());
    return { plaza, distKm, progress, matchesHighway };
  })
    .filter((item) => {
      if (oneWayTollCount === 0) return false;
      return item.distKm <= corridorToleranceKm || (item.matchesHighway && item.distKm <= corridorToleranceKm * 1.45);
    })
    .sort((a, b) => a.progress - b.progress);

  // Deduplicate plazas that are too close along progress
  const selectedRaw: Array<{ plaza: KnownTollPlaza; progress: number }> = [];
  for (const candidate of matched) {
    if (selectedRaw.length >= Math.max(oneWayTollCount, 1)) break;
    const tooClose = selectedRaw.some((s) => Math.abs(s.progress - candidate.progress) < 0.06);
    if (!tooClose) {
      selectedRaw.push({ plaza: candidate.plaza, progress: candidate.progress });
    }
  }

  // 2. If route has more expected toll plazas than known ones along the corridor, interpolate highway plazas
  const highwayTokens = highways
    .replace(/\(.*?\)/g, '')
    .split('➔')
    .map((h) => h.trim())
    .filter(Boolean);

  const avgCostPerAxle =
    oneWayTollCount > 0 && axles > 0
      ? Math.max(7.5, Math.min(18.5, totalTollCost / multiplier / oneWayTollCount / axles))
      : 10.5;

  const targetCount = Math.min(12, Math.max(oneWayTollCount > 0 ? Math.min(oneWayTollCount, 8) : 0, selectedRaw.length));

  while (selectedRaw.length < targetCount) {
    const idx = selectedRaw.length;
    const t = (idx + 1) / (targetCount + 1);
    const lat = originCoords.lat + (destCoords.lat - originCoords.lat) * t + Math.sin(t * Math.PI) * 0.14;
    const lng = originCoords.lng + (destCoords.lng - originCoords.lng) * t - Math.sin(t * Math.PI) * 0.12;
    const segHwy = highwayTokens[Math.min(highwayTokens.length - 1, Math.floor(t * highwayTokens.length))] || 'Rodovia Federal';

    // Vary cost realistically: Serra / Metropolis ends cost ~28% more than rural mid-segments
    const terrainFactor = t > 0.72 || t < 0.18 ? 1.24 : 0.92;
    const estPerAxle = Math.round(avgCostPerAxle * terrainFactor * 10) / 10;

    selectedRaw.push({
      progress: t,
      plaza: {
        id: `plaza-gen-${idx + 1}`,
        name: `Praça ${segHwy.split(' ')[0]} — Trecho ${idx + 1}`,
        highway: segHwy.split(' ')[0] || 'BR',
        kmMarker: `km ${Math.round((totalDistanceKm / multiplier) * t)}`,
        concessionaire: t > 0.7 ? 'Concessionária Metropolitana / Serra' : 'Concessionária Rodoviária',
        city: t < 0.5 ? origin.split('-')[0].trim() : destination.split('-')[0].trim(),
        state: (t < 0.5 ? origin.split('-')[1] : destination.split('-')[1])?.trim().slice(0, 2) || 'BR',
        lat,
        lng,
        costPerAxle: estPerAxle,
        bypassTip:
          terrainFactor > 1.1
            ? 'Trecho de tarifa elevada (anel/serra). Avalie rota paralela ou suspensão de eixos no retorno.'
            : 'Tarifa padrão de rodovia; TAG eletrônica reduz tempo parado e consumo na retomada.',
      },
    });
  }

  selectedRaw.sort((a, b) => a.progress - b.progress);

  // 3. Calibrate individual plaza costs so they accurately represent the route's total toll budget
  const rawPerAxleSum = selectedRaw.reduce((acc, s) => acc + s.plaza.costPerAxle, 0);
  const scaleFactor =
    rawPerAxleSum > 0 && totalTollCost > 0
      ? totalTollCost / (rawPerAxleSum * axles * multiplier)
      : 1;

  const computedPlazas: RouteTollPoint[] = selectedRaw.map(({ plaza }) => {
    const adjustedPerAxle = Math.round(plaza.costPerAxle * Math.max(0.75, Math.min(1.45, scaleFactor)) * 100) / 100;
    const totalCost = Math.round(adjustedPerAxle * axles * multiplier);
    return {
      id: plaza.id,
      name: plaza.name,
      highway: plaza.highway,
      kmMarker: plaza.kmMarker,
      concessionaire: plaza.concessionaire,
      city: plaza.city,
      state: plaza.state,
      lat: plaza.lat,
      lng: plaza.lng,
      costPerAxle: adjustedPerAxle,
      totalCost,
      sharePercent: 0,
      severity: 'moderate',
      rank: 0,
      bypassTip: plaza.bypassTip,
      avoidableInEco: false,
    };
  });

  const sumAnalyzed = computedPlazas.reduce((acc, p) => acc + p.totalCost, 0) || 1;
  const averagePlazaCost = computedPlazas.length > 0 ? sumAnalyzed / computedPlazas.length : 0;

  // Rank descending by totalCost
  const sortedByCost = [...computedPlazas].sort((a, b) => b.totalCost - a.totalCost);
  const rankMap: Record<string, number> = {};
  sortedByCost.forEach((p, idx) => {
    rankMap[p.id] = idx + 1;
  });

  const criticalLimit = Math.max(1, Math.ceil(computedPlazas.length * 0.34));
  let criticalCount = 0;

  const finalizedPlazas: RouteTollPoint[] = computedPlazas.map((p) => {
    const rank = rankMap[p.id] || 1;
    const sharePercent = Math.round((p.totalCost / sumAnalyzed) * 1000) / 10;

    let severity: TollCostSeverity = 'low';
    if (rank <= criticalLimit || p.totalCost >= averagePlazaCost * 1.15) {
      severity = 'critical';
      criticalCount += 1;
    } else if (p.totalCost >= averagePlazaCost * 0.85) {
      severity = 'moderate';
    }

    const avoidableInEco = severity === 'critical' && (rank <= 2 || computedPlazas.length >= 3);

    return {
      ...p,
      rank,
      sharePercent,
      severity,
      avoidableInEco,
    };
  });

  const topHotspots = [...finalizedPlazas].sort((a, b) => a.rank - b.rank).slice(0, 4);
  const highestPlazaCost = topHotspots[0]?.totalCost || 0;

  // Build standard polyline coordinates: Origin -> Plazas -> Destination
  const standardPath: Array<{ lat: number; lng: number }> = [
    originCoords,
    ...finalizedPlazas.map((p) => ({ lat: p.lat, lng: p.lng })),
    destCoords,
  ];

  // 4. Build Economical Alternative Route Option
  const avoidedPlazas = finalizedPlazas.filter((p) => p.avoidableInEco);
  const avoidedIds = avoidedPlazas.map((p) => p.id);

  // Estimate toll savings (typically 20% to 32% when bypassing top toll hotspots / parallel highways)
  const rawAvoidedSavings = Math.round(
    avoidedPlazas.reduce((acc, p) => acc + p.totalCost * 0.65, 0)
  );
  const fallbackSavings = Math.round(totalTollCost * 0.24);
  const tollSavings = totalTollCost > 0 ? Math.max(Math.min(Math.round(totalTollCost * 0.35), rawAvoidedSavings || fallbackSavings), Math.round(totalTollCost * 0.16)) : 0;

  const ecoTollCost = Math.max(0, totalTollCost - tollSavings);
  const ecoTollCount = Math.max(0, totalTollCount - Math.max(1, Math.round(avoidedPlazas.length * multiplier * 0.8)));

  // Slight detour (+3.5% km) for parallel toll-saving corridor
  const extraKm = totalTollCost > 0 ? Math.max(8, Math.round(totalDistanceKm * 0.035)) : 0;
  const ecoDistanceKm = totalDistanceKm + extraKm;
  // ~2.2 km/L @ R$ 6.25/L
  const extraDieselCost = Math.round((extraKm / 2.2) * 6.25);
  const netSavings = tollSavings - extraDieselCost;

  // Build economical bypass polyline (offset slightly away from the critical plazas)
  const ecoWaypoints: Array<{ lat: number; lng: number }> = [originCoords];
  const dLat = destCoords.lat - originCoords.lat;
  const dLng = destCoords.lng - originCoords.lng;
  const normLen = Math.hypot(dLat, dLng) || 1;
  // Perpendicular unit vector for visual corridor bypass offset
  const perpLat = (-dLng / normLen) * Math.min(0.45, Math.max(0.12, normLen * 0.06));
  const perpLng = (dLat / normLen) * Math.min(0.45, Math.max(0.12, normLen * 0.06));

  [0.25, 0.5, 0.75].forEach((t) => {
    const wave = Math.sin(t * Math.PI);
    ecoWaypoints.push({
      lat: originCoords.lat + dLat * t + perpLat * wave,
      lng: originCoords.lng + dLng * t + perpLng * wave,
    });
  });
  ecoWaypoints.push(destCoords);

  const ecoHighways =
    upperHighways.includes('SP-348')
      ? highways.replace(/SP-348/gi, 'SP-330 (Anhanguera Econômica)')
      : upperHighways.includes('SP-160')
      ? highways.replace(/SP-160/gi, 'SP-150 (Anchieta / Acesso Alternativo)')
      : `${highways.split('(')[0].trim()} • Variante Econômica (Menor Pedágio)`;

  const strategySummary =
    totalTollCost <= 0
      ? 'Este trajeto já possui custo mínimo ou isenção de pedágios registrada.'
      : netSavings > 0
      ? `Desviar das ${avoidedPlazas.length || 1} praças mais caras reduz ${Math.round((tollSavings / Math.max(1, totalTollCost)) * 100)}% do pedágio, gerando economia líquida real já descontado o diesel extra.`
      : 'O desvio reduz pedágio, porém o acréscimo de diesel torna a rota padrão mais vantajosa no custo total.';

  return {
    plazas: finalizedPlazas,
    topHotspots,
    totalAnalyzedCost: sumAnalyzed,
    criticalCount,
    highestPlazaCost,
    averagePlazaCost: Math.round(averagePlazaCost),
    standardPath,
    economicalOption: {
      label: 'Rota Econômica (Menor Pedágio)',
      highways: ecoHighways,
      distanceKm: ecoDistanceKm,
      tollCount: ecoTollCount,
      totalTollCost: ecoTollCost,
      tollSavings,
      extraKm,
      extraDieselCost,
      netSavings,
      strategySummary,
      waypoints: ecoWaypoints,
      avoidedPlazaIds: avoidedIds,
    },
  };
}
