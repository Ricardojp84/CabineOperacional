export interface FuelOption {
  id: string;
  name: string;
  category: 'diesel' | 'arla' | 'gasolina' | 'outros';
  unit: 'L' | 'm³';
  avgPriceBrl: number;
  description: string;
}

export const FUEL_OPTIONS: FuelOption[] = [
  {
    id: 'diesel_s10',
    name: 'Diesel S10 (Alta Tecnologia Euro 5/6)',
    category: 'diesel',
    unit: 'L',
    avgPriceBrl: 6.29,
    description: 'Menor teor de enxofre (10 ppm), obrigatório para motores eletrônicos modernos.',
  },
  {
    id: 'diesel_s500',
    name: 'Diesel S500 (Comum)',
    category: 'diesel',
    unit: 'L',
    avgPriceBrl: 5.95,
    description: 'Para motores fabricados antes de 2012, teor de 500 ppm de enxofre.',
  },
  {
    id: 'arla_32',
    name: 'Arla 32 (Reagente SCR / Bomba Dedicada)',
    category: 'arla',
    unit: 'L',
    avgPriceBrl: 2.85,
    description: 'Solução aquosa de uréia 32,5% para redução catalítica de óxidos de nitrogênio.',
  },
  {
    id: 'gasolina_comum',
    name: 'Gasolina Comum',
    category: 'gasolina',
    unit: 'L',
    avgPriceBrl: 6.15,
    description: 'Para veículos de apoio, batedores e pick-ups.',
  },
  {
    id: 'etanol',
    name: 'Etanol Hidratado',
    category: 'outros',
    unit: 'L',
    avgPriceBrl: 4.19,
    description: 'Biocombustível para veículos flex da frota de apoio.',
  },
  {
    id: 'gnv',
    name: 'GNV (Gás Natural Veicular)',
    category: 'outros',
    unit: 'm³',
    avgPriceBrl: 4.89,
    description: 'Gás natural comprimido para cavalos mecânicos movidos a GNV/Biometano.',
  },
];

export interface StationNetwork {
  name: string;
  banner: string;
  program: string;
  perks: string[];
}

export const STATION_NETWORKS: StationNetwork[] = [
  {
    name: 'Rede Graal',
    banner: 'Graal',
    program: 'Graal Fidelidade',
    perks: ['Banho Quente', 'Restaurante 24h', 'Pátio Asfaltado', 'Wi-Fi Grátis'],
  },
  {
    name: 'Ipiranga RodoRede',
    banner: 'Ipiranga',
    program: 'Km de Vantagens',
    perks: ['Pátio Monitorado', 'Bomba de Arla Dedicada', 'Lavanderia Estradeira'],
  },
  {
    name: 'Petrobras Siga Bem',
    banner: 'Petrobras / Vibra',
    program: 'Premmia Siga Bem',
    perks: ['Pátio Fechado com Câmeras', 'Clube da Estrada', 'Borracharia Conveniada'],
  },
  {
    name: 'Shell Evolux',
    banner: 'Shell',
    program: 'Shell Box / Estradeiro',
    perks: ['Diesel Aditivado', 'Chuveiro Grátis no Abastecimento', 'Pátio Seguro'],
  },
  {
    name: 'Rede SIM',
    banner: 'SIM Rede de Postos',
    program: 'SIM Card',
    perks: ['Presente em todo o Sul e SP', 'Restaurante Prato Feito', 'Caixa Rápido'],
  },
  {
    name: 'Rede Décio',
    banner: 'Postos Décio',
    program: 'Décio Pontos',
    perks: ['Paradas Gigantes na BR-153/050', 'Hotel e Pernoite', 'Oficina Mecânica'],
  },
];

// Reference Diesel S10 average price per Brazilian State (ANP sample)
export const STATE_DIESEL_REFERENCE: Record<string, number> = {
  MT: 6.38,
  MS: 6.18,
  GO: 6.22,
  SP: 5.95,
  PR: 6.05,
  SC: 6.12,
  RS: 6.16,
  MG: 6.14,
  RJ: 6.25,
  ES: 6.19,
  BA: 6.32,
  TO: 6.45,
  MA: 6.42,
  PA: 6.55,
  RO: 6.49,
};

export const getSuggestedFuelPrice = (fuelId: string, state?: string): number => {
  if (fuelId === 'arla_32') return 2.85;
  if (fuelId === 'diesel_s500') {
    const base = state && STATE_DIESEL_REFERENCE[state] ? STATE_DIESEL_REFERENCE[state] : 6.15;
    return Math.round((base - 0.3) * 100) / 100;
  }
  if (state && STATE_DIESEL_REFERENCE[state]) {
    return STATE_DIESEL_REFERENCE[state];
  }
  return 6.29;
};
