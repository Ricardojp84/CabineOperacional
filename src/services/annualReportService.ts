import { getSupabaseClient, checkIsConfigured } from '../lib/supabase';
import { Trip, Expense } from '../types/cockpit';

export interface MonthlyProfitData {
  monthKey: string; // '2025-11', '2025-12', etc.
  monthLabel: string; // 'Nov/25', 'Dez/25', etc.
  monthName: string; // 'Novembro 2025'
  year: number;
  monthIndex: number; // 0 to 11
  grossFreight: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPct: number;
  tripCount: number;
  totalDistanceKm: number;
  profitPerKm: number;
  fuelExpenses: number;
  tollExpenses: number;
  otherExpenses: number;
  tripsSummary: Array<{
    id: string;
    origin: string;
    destination: string;
    cargo: string;
    grossFreight: number;
    profit: number;
    date: string;
  }>;
}

export interface AnnualReportSummary {
  periodLabel: string;
  totalGrossFreight: number;
  totalExpenses: number;
  totalNetProfit: number;
  overallProfitMarginPct: number;
  totalCompletedTrips: number;
  totalDistanceKm: number;
  averageMonthlyProfit: number;
  averageProfitPerKm: number;
  bestMonth: { monthLabel: string; profit: number } | null;
  lowestMonth: { monthLabel: string; profit: number } | null;
  dataSource: 'supabase' | 'fallback';
  connectedProject?: string;
  monthlyBreakdown: MonthlyProfitData[];
}

// Month names in Portuguese
const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORT_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Generates the list of the last 12 months keys and labels
 */
export const getLast12MonthsList = (targetDate = new Date()): Array<{ key: string; label: string; name: string; year: number; monthIndex: number }> => {
  const result: Array<{ key: string; label: string; name: string; year: number; monthIndex: number }> = [];
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth(); // 0-11

  for (let i = 11; i >= 0; i--) {
    let d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const shortYear = String(y).slice(-2);
    const label = `${MONTH_SHORT_PT[m]}/${shortYear}`;
    const name = `${MONTH_NAMES_PT[m]} ${y}`;
    result.push({ key, label, name, year: y, monthIndex: m });
  }

  return result;
};

/**
 * Realistic seed of completed trips for Brazilian transport corridors across the last 12 months.
 * Used when Supabase is newly provisioned or has no historical records, ensuring the user immediately sees a live, rich report.
 */
export const MOCK_ANNUAL_COMPLETED_TRIPS: Array<{
  id: string;
  title: string;
  origin: string;
  destination: string;
  cargo: string;
  vehicle_model: string;
  vehicle_plate: string;
  gross_freight: number;
  completed_distance_km: number;
  is_completed: boolean;
  started_at: string;
  expenses: Array<{
    amount: number;
    category: string;
    description: string;
  }>;
}> = [
  // 12 months ago (Nov 2025)
  {
    id: 'comp-trip-nov25-1',
    title: 'Sorriso ➔ Santos (Soja Safra)',
    origin: 'Sorriso - MT',
    destination: 'Santos - SP',
    cargo: 'Soja a Granel',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 22400,
    completed_distance_km: 2150,
    is_completed: true,
    started_at: '2025-11-08T08:00:00Z',
    expenses: [
      { amount: 7600, category: 'combustivel', description: 'Diesel S10 BR-163' },
      { amount: 1650, category: 'pedagio', description: 'Pedágios Rota do Oeste' },
      { amount: 950, category: 'alimentacao', description: 'Refeições e Pernoites' },
      { amount: 480, category: 'outros', description: 'Chapa e pesagem' },
    ],
  },
  {
    id: 'comp-trip-nov25-2',
    title: 'Santos ➔ Goiânia (Fertilizantes)',
    origin: 'Santos - SP',
    destination: 'Goiânia - GO',
    cargo: 'Fertilizantes NPK',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 14800,
    completed_distance_km: 980,
    is_completed: true,
    started_at: '2025-11-20T10:00:00Z',
    expenses: [
      { amount: 3800, category: 'combustivel', description: 'Diesel S10 SP-310' },
      { amount: 920, category: 'pedagio', description: 'Pedágios EcoRodovias' },
      { amount: 500, category: 'alimentacao', description: 'Refeições' },
    ],
  },

  // Dez 2025
  {
    id: 'comp-trip-dez25-1',
    title: 'Rio Verde ➔ Paranaguá (Milho)',
    origin: 'Rio Verde - GO',
    destination: 'Paranaguá - PR',
    cargo: 'Milho em Grãos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 19800,
    completed_distance_km: 1250,
    is_completed: true,
    started_at: '2025-12-05T07:00:00Z',
    expenses: [
      { amount: 5900, category: 'combustivel', description: 'Diesel S10 BR-153' },
      { amount: 1240, category: 'pedagio', description: 'Pedágios CCR' },
      { amount: 620, category: 'alimentacao', description: 'Pernoite e alimentação' },
      { amount: 450, category: 'manutencao', description: 'Borracharia e remendo pneu' },
    ],
  },
  {
    id: 'comp-trip-dez25-2',
    title: 'Curitiba ➔ São Paulo (Manufaturados)',
    origin: 'Curitiba - PR',
    destination: 'São Paulo - SP',
    cargo: 'Carga Geral Paletizada',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 9200,
    completed_distance_km: 410,
    is_completed: true,
    started_at: '2025-12-18T14:00:00Z',
    expenses: [
      { amount: 1650, category: 'combustivel', description: 'Diesel S10 Regis Bittencourt' },
      { amount: 380, category: 'pedagio', description: 'Pedágios Arteris BR-116' },
      { amount: 320, category: 'alimentacao', description: 'Almoço e janta' },
    ],
  },

  // Jan 2026
  {
    id: 'comp-trip-jan26-1',
    title: 'Rondonópolis ➔ Santos (Farelo Soja)',
    origin: 'Rondonópolis - MT',
    destination: 'Santos - SP',
    cargo: 'Farelo de Soja',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 21500,
    completed_distance_km: 1540,
    is_completed: true,
    started_at: '2026-01-08T06:30:00Z',
    expenses: [
      { amount: 6400, category: 'combustivel', description: 'Diesel S10 Posto Trevão' },
      { amount: 1420, category: 'pedagio', description: 'Pedágios AutoBAn e Rota do Oeste' },
      { amount: 780, category: 'alimentacao', description: 'Alimentação viagem' },
      { amount: 1200, category: 'manutencao', description: 'Troca de lonas de freio' },
    ],
  },
  {
    id: 'comp-trip-jan26-2',
    title: 'Campinas ➔ Uberlândia (Alimentos Secos)',
    origin: 'Campinas - SP',
    destination: 'Uberlândia - MG',
    cargo: 'Alimentos Industrializados',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 11200,
    completed_distance_km: 560,
    is_completed: true,
    started_at: '2026-01-22T08:00:00Z',
    expenses: [
      { amount: 2600, category: 'combustivel', description: 'Diesel S10 Rodovia Anhanguera' },
      { amount: 640, category: 'pedagio', description: 'Pedágios Entrevias' },
      { amount: 390, category: 'alimentacao', description: 'Pernoite posto' },
    ],
  },

  // Fev 2026 - Pico Safra
  {
    id: 'comp-trip-fev26-1',
    title: 'Sinop ➔ Miritituba (Soja Arco Norte)',
    origin: 'Sinop - MT',
    destination: 'Itaituba - PA',
    cargo: 'Soja Grãos Graneleiro',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 26000,
    completed_distance_km: 1050,
    is_completed: true,
    started_at: '2026-02-04T05:00:00Z',
    expenses: [
      { amount: 7800, category: 'combustivel', description: 'Diesel S10 BR-163 Norte' },
      { amount: 580, category: 'pedagio', description: 'Pedágios trecho MT' },
      { amount: 890, category: 'alimentacao', description: 'Castelo dos Sonhos e Trairão' },
      { amount: 850, category: 'manutencao', description: 'Filtros de ar e calibragem' },
    ],
  },
  {
    id: 'comp-trip-fev26-2',
    title: 'Rio Verde ➔ Santos (Farelo)',
    origin: 'Rio Verde - GO',
    destination: 'Santos - SP',
    cargo: 'Farelo de Soja a Granel',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 18900,
    completed_distance_km: 1150,
    is_completed: true,
    started_at: '2026-02-18T06:00:00Z',
    expenses: [
      { amount: 5300, category: 'combustivel', description: 'Diesel S10 BR-060' },
      { amount: 1180, category: 'pedagio', description: 'Pedágios SP-310 e Anchieta' },
      { amount: 620, category: 'alimentacao', description: 'Refeições' },
    ],
  },

  // Mar 2026 - Safra Cheia
  {
    id: 'comp-trip-mar26-1',
    title: 'Sorriso ➔ Santos (Soja Exportação)',
    origin: 'Sorriso - MT',
    destination: 'Santos - SP',
    cargo: 'Soja em Grãos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 24800,
    completed_distance_km: 2150,
    is_completed: true,
    started_at: '2026-03-03T07:00:00Z',
    expenses: [
      { amount: 8100, category: 'combustivel', description: 'Diesel S10 Tanque Duplo' },
      { amount: 1680, category: 'pedagio', description: 'Pedágios Sistema Anchieta-Imigrantes' },
      { amount: 980, category: 'alimentacao', description: 'Alimentação 4 dias' },
      { amount: 550, category: 'outros', description: 'Classificação de grãos' },
    ],
  },
  {
    id: 'comp-trip-mar26-2',
    title: 'Santos ➔ Rondonópolis (Adubos)',
    origin: 'Santos - SP',
    destination: 'Rondonópolis - MT',
    cargo: 'Adubo Fosfatado',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 17200,
    completed_distance_km: 1540,
    is_completed: true,
    started_at: '2026-03-18T10:00:00Z',
    expenses: [
      { amount: 5900, category: 'combustivel', description: 'Diesel S10 SP-310' },
      { amount: 1350, category: 'pedagio', description: 'Pedágios e Eixos Carreta' },
      { amount: 720, category: 'alimentacao', description: 'Pernoite e janta' },
    ],
  },

  // Abr 2026
  {
    id: 'comp-trip-abr26-1',
    title: 'Cascavel ➔ Paranaguá (Soja PR)',
    origin: 'Cascavel - PR',
    destination: 'Paranaguá - PR',
    cargo: 'Soja a Granel',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 12500,
    completed_distance_km: 680,
    is_completed: true,
    started_at: '2026-04-05T06:00:00Z',
    expenses: [
      { amount: 3100, category: 'combustivel', description: 'Diesel S10 BR-277' },
      { amount: 720, category: 'pedagio', description: 'Pedágios BR-277' },
      { amount: 480, category: 'alimentacao', description: 'Almoço e café' },
    ],
  },
  {
    id: 'comp-trip-abr26-2',
    title: 'Luís Eduardo Magalhães ➔ Salvador (Algodão)',
    origin: 'Luís Eduardo Magalhães - BA',
    destination: 'Salvador - BA',
    cargo: 'Fardos de Algodão',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 18400,
    completed_distance_km: 980,
    is_completed: true,
    started_at: '2026-04-20T08:00:00Z',
    expenses: [
      { amount: 5200, category: 'combustivel', description: 'Diesel S10 BR-242' },
      { amount: 490, category: 'pedagio', description: 'Pedágios ViaBahia' },
      { amount: 650, category: 'alimentacao', description: 'Alimentação estrada' },
      { amount: 350, category: 'outros', description: 'Enlonamento especial' },
    ],
  },

  // Mai 2026
  {
    id: 'comp-trip-mai26-1',
    title: 'Dourados ➔ Paranaguá (Milho Safrinha)',
    origin: 'Dourados - MS',
    destination: 'Paranaguá - PR',
    cargo: 'Milho Grãos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 17800,
    completed_distance_km: 1040,
    is_completed: true,
    started_at: '2026-05-07T07:00:00Z',
    expenses: [
      { amount: 4900, category: 'combustivel', description: 'Diesel S10 BR-163 MS' },
      { amount: 1080, category: 'pedagio', description: 'Pedágios CCR MSVia' },
      { amount: 580, category: 'alimentacao', description: 'Refeições' },
    ],
  },
  {
    id: 'comp-trip-mai26-2',
    title: 'São Paulo ➔ Belo Horizonte (Bebidas e Cargas Secas)',
    origin: 'São Paulo - SP',
    destination: 'Belo Horizonte - MG',
    cargo: 'Bebidas em Fardos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 11900,
    completed_distance_km: 580,
    is_completed: true,
    started_at: '2026-05-22T05:30:00Z',
    expenses: [
      { amount: 2800, category: 'combustivel', description: 'Diesel Fernão Dias' },
      { amount: 620, category: 'pedagio', description: 'Pedágios Arteris Fernão Dias' },
      { amount: 410, category: 'alimentacao', description: 'Restaurante rodoviário' },
    ],
  },

  // Jun 2026
  {
    id: 'comp-trip-jun26-1',
    title: 'Rio Verde ➔ Santos (Açúcar e Grãos)',
    origin: 'Rio Verde - GO',
    destination: 'Santos - SP',
    cargo: 'Açúcar VHP a Granel',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 19400,
    completed_distance_km: 1150,
    is_completed: true,
    started_at: '2026-06-08T06:00:00Z',
    expenses: [
      { amount: 5400, category: 'combustivel', description: 'Diesel S10 SP-310' },
      { amount: 1150, category: 'pedagio', description: 'Pedágios Anchieta' },
      { amount: 680, category: 'alimentacao', description: 'Alimentação' },
    ],
  },
  {
    id: 'comp-trip-jun26-2',
    title: 'Santos ➔ Ribeirão Preto (Bobinas de Aço)',
    origin: 'Santos - SP',
    destination: 'Ribeirão Preto - SP',
    cargo: 'Bobinas de Aço Laminado',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 10500,
    completed_distance_km: 430,
    is_completed: true,
    started_at: '2026-06-23T09:00:00Z',
    expenses: [
      { amount: 2200, category: 'combustivel', description: 'Diesel Rodovia dos Bandeirantes' },
      { amount: 790, category: 'pedagio', description: 'Pedágios AutoBAn / Renovias' },
      { amount: 350, category: 'alimentacao', description: 'Almoço e café' },
    ],
  },

  // Jul 2026
  {
    id: 'comp-trip-jul26-1',
    title: 'Rondonópolis ➔ Santos (Milho Safrinha Exportação)',
    origin: 'Rondonópolis - MT',
    destination: 'Santos - SP',
    cargo: 'Milho em Grãos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 22800,
    completed_distance_km: 1540,
    is_completed: true,
    started_at: '2026-07-06T06:00:00Z',
    expenses: [
      { amount: 6800, category: 'combustivel', description: 'Diesel S10 Posto São Pedro' },
      { amount: 1450, category: 'pedagio', description: 'Pedágios Rota do Oeste / SP' },
      { amount: 820, category: 'alimentacao', description: 'Pernoites e alimentação' },
      { amount: 950, category: 'manutencao', description: 'Revisão cuícas de freio' },
    ],
  },
  {
    id: 'comp-trip-jul26-2',
    title: 'Paulínia ➔ Goiânia (Combustível Base)',
    origin: 'Paulínia - SP',
    destination: 'Goiânia - GO',
    cargo: 'Derivados de Petróleo',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 14200,
    completed_distance_km: 890,
    is_completed: true,
    started_at: '2026-07-21T07:30:00Z',
    expenses: [
      { amount: 3900, category: 'combustivel', description: 'Diesel S10 Anhanguera' },
      { amount: 880, category: 'pedagio', description: 'Pedágios Triunfo Concebra' },
      { amount: 510, category: 'alimentacao', description: 'Refeições' },
    ],
  },

  // Ago 2026
  {
    id: 'comp-trip-ago26-1',
    title: 'Sorriso ➔ Paranaguá (Soja Safra Sul)',
    origin: 'Sorriso - MT',
    destination: 'Paranaguá - PR',
    cargo: 'Soja em Grãos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 25200,
    completed_distance_km: 2280,
    is_completed: true,
    started_at: '2026-08-04T05:00:00Z',
    expenses: [
      { amount: 8400, category: 'combustivel', description: 'Diesel S10 BR-163 e BR-376' },
      { amount: 1720, category: 'pedagio', description: 'Pedágios CCR / Arteris' },
      { amount: 1050, category: 'alimentacao', description: 'Refeições estrada 5 dias' },
      { amount: 620, category: 'outros', description: 'Estacionamento de triagem' },
    ],
  },
  {
    id: 'comp-trip-ago26-2',
    title: 'Paranaguá ➔ Londrina (Fertilizantes Importados)',
    origin: 'Paranaguá - PR',
    destination: 'Londrina - PR',
    cargo: 'Fertilizante Granel Seco',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 11400,
    completed_distance_km: 510,
    is_completed: true,
    started_at: '2026-08-20T08:00:00Z',
    expenses: [
      { amount: 2600, category: 'combustivel', description: 'Diesel BR-376 Serra do Mar' },
      { amount: 640, category: 'pedagio', description: 'Pedágios Viapar' },
      { amount: 390, category: 'alimentacao', description: 'Almoço e pernoite' },
    ],
  },

  // Set 2026
  {
    id: 'comp-trip-set26-1',
    title: 'Rio Verde ➔ Santos (Farelo Grãos)',
    origin: 'Rio Verde - GO',
    destination: 'Santos - SP',
    cargo: 'Farelo de Soja a Granel',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 19600,
    completed_distance_km: 1150,
    is_completed: true,
    started_at: '2026-09-06T06:00:00Z',
    expenses: [
      { amount: 5500, category: 'combustivel', description: 'Diesel S10' },
      { amount: 1160, category: 'pedagio', description: 'Pedágios Rodovias Paulistas' },
      { amount: 690, category: 'alimentacao', description: 'Alimentação' },
    ],
  },
  {
    id: 'comp-trip-set26-2',
    title: 'São José dos Campos ➔ Porto Alegre (Autopeças)',
    origin: 'São José dos Campos - SP',
    destination: 'Porto Alegre - RS',
    cargo: 'Componentes Automotivos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 16800,
    completed_distance_km: 1180,
    is_completed: true,
    started_at: '2026-09-22T04:30:00Z',
    expenses: [
      { amount: 5100, category: 'combustivel', description: 'Diesel S10 BR-101 / BR-116' },
      { amount: 1120, category: 'pedagio', description: 'Pedágios CCR ViaCosteira' },
      { amount: 740, category: 'alimentacao', description: 'Pernoite e refeições' },
    ],
  },

  // Out 2026
  {
    id: 'comp-trip-out26-1',
    title: 'Passo Fundo ➔ Paranaguá (Trigo e Grãos)',
    origin: 'Passo Fundo - RS',
    destination: 'Paranaguá - PR',
    cargo: 'Trigo em Grãos',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 15900,
    completed_distance_km: 790,
    is_completed: true,
    started_at: '2026-10-05T07:00:00Z',
    expenses: [
      { amount: 4100, category: 'combustivel', description: 'Diesel BR-386 e BR-116' },
      { amount: 890, category: 'pedagio', description: 'Pedágios Sul' },
      { amount: 520, category: 'alimentacao', description: 'Alimentação' },
    ],
  },
  {
    id: 'comp-trip-out26-2',
    title: 'Betim ➔ Salvador (Peças e Manufaturas)',
    origin: 'Betim - MG',
    destination: 'Salvador - BA',
    cargo: 'Peças e Manufaturas Industriais',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 18200,
    completed_distance_km: 1340,
    is_completed: true,
    started_at: '2026-10-21T05:00:00Z',
    expenses: [
      { amount: 5600, category: 'combustivel', description: 'Diesel Rio-Bahia BR-116' },
      { amount: 780, category: 'pedagio', description: 'Pedágios ViaBahia' },
      { amount: 840, category: 'alimentacao', description: 'Alimentação 3 dias' },
      { amount: 750, category: 'manutencao', description: 'Troca de filtro de óleo lubrificante' },
    ],
  },

  // Nov 2026 (Mês Atual / Mais recente)
  {
    id: 'comp-trip-nov26-1',
    title: 'Cascavel ➔ Paranaguá (Soja e Farelo)',
    origin: 'Cascavel - PR',
    destination: 'Paranaguá - PR',
    cargo: 'Farelo de Soja Especial',
    vehicle_model: 'Scania R540 6x4',
    vehicle_plate: 'BRA-9450',
    gross_freight: 13200,
    completed_distance_km: 680,
    is_completed: true,
    started_at: '2026-11-02T06:00:00Z',
    expenses: [
      { amount: 1730.40, category: 'combustivel', description: 'Diesel S10 Posto Guairacá' },
      { amount: 385.00, category: 'pedagio', description: 'Pedágios Concessionárias BR-277' },
      { amount: 120.00, category: 'outros', description: 'Chapa e desengate terminal' },
      { amount: 240.00, category: 'alimentacao', description: 'Refeições posto' },
    ],
  },
];

/**
 * Fetches completed trips and their expenses from Supabase
 * If Supabase is offline, not configured, or has no completed trips yet, smoothly falls back to realistic historical corridor data.
 */
export const fetchAnnualProfitReport = async (): Promise<AnnualReportSummary> => {
  const monthsList = getLast12MonthsList();
  const client = getSupabaseClient();
  const configured = checkIsConfigured();

  let rawTrips: Array<{
    id: string;
    origin: string;
    destination: string;
    cargo?: string;
    gross_freight?: number;
    completed_distance_km?: number;
    is_completed?: boolean;
    started_at?: string;
    created_at?: string;
    expenses?: Array<{
      amount: number;
      category: string;
      description?: string;
    }>;
  }> = [];

  let isUsingSupabase = false;

  if (client && configured) {
    try {
      // 1. Fetch completed trips from Supabase (or any trips with completed distance)
      const { data: tripsData, error: tripsError } = await client
        .from('trips')
        .select(`
          id,
          origin,
          destination,
          cargo,
          gross_freight,
          completed_distance_km,
          is_completed,
          started_at,
          created_at,
          expenses (
            amount,
            category,
            description
          )
        `)
        .eq('is_completed', true)
        .order('started_at', { ascending: true });

      if (!tripsError && tripsData && tripsData.length > 0) {
        rawTrips = tripsData;
        isUsingSupabase = true;
      }
    } catch (err) {
      console.warn('Erro ao consultar viagens finalizadas no Supabase. Utilizando base operacional:', err);
    }
  }

  // If Supabase returned no completed trips yet (e.g. fresh database), enrich with the mock completed trips
  // and check localStorage for any completed trips
  if (rawTrips.length === 0) {
    let localCompleted: any[] = [];
    try {
      const activeTripSaved = localStorage.getItem('cabine_active_trip');
      if (activeTripSaved) {
        const parsed = JSON.parse(activeTripSaved);
        if (parsed.isCompleted || parsed.completedDistanceKm > 0) {
          localCompleted.push({
            id: parsed.id,
            origin: parsed.origin,
            destination: parsed.destination,
            cargo: parsed.cargo,
            gross_freight: parsed.grossFreight,
            completed_distance_km: parsed.completedDistanceKm,
            is_completed: true,
            started_at: parsed.startedAt || new Date().toISOString(),
            expenses: parsed.expenses?.map((e: Expense) => ({
              amount: e.amount,
              category: e.category,
              description: e.description,
            })) || [],
          });
        }
      }
    } catch {
      // Ignore
    }

    rawTrips = [...MOCK_ANNUAL_COMPLETED_TRIPS, ...localCompleted];
  }

  // Aggregate trips into each of the 12 months
  const monthlyMap = new Map<string, MonthlyProfitData>();

  // Initialize all 12 months with zeroes
  monthsList.forEach((m) => {
    monthlyMap.set(m.key, {
      monthKey: m.key,
      monthLabel: m.label,
      monthName: m.name,
      year: m.year,
      monthIndex: m.monthIndex,
      grossFreight: 0,
      totalExpenses: 0,
      netProfit: 0,
      profitMarginPct: 0,
      tripCount: 0,
      totalDistanceKm: 0,
      profitPerKm: 0,
      fuelExpenses: 0,
      tollExpenses: 0,
      otherExpenses: 0,
      tripsSummary: [],
    });
  });

  // Distribute trips into corresponding months
  rawTrips.forEach((t) => {
    const tripDateStr = t.started_at || t.created_at || new Date().toISOString();
    const tripDate = new Date(tripDateStr);
    const key = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;

    const monthData = monthlyMap.get(key);
    if (monthData) {
      const freight = Number(t.gross_freight || 0);
      const km = Number(t.completed_distance_km || 0);

      let expensesSum = 0;
      let fuelSum = 0;
      let tollSum = 0;
      let otherSum = 0;

      if (t.expenses && Array.isArray(t.expenses)) {
        t.expenses.forEach((e) => {
          const amt = Number(e.amount || 0);
          expensesSum += amt;
          if (e.category === 'combustivel' || e.category === 'arla') {
            fuelSum += amt;
          } else if (e.category === 'pedagio') {
            tollSum += amt;
          } else {
            otherSum += amt;
          }
        });
      }

      // If a trip had no recorded expenses, estimate realistic direct costs (60% freight)
      if (expensesSum === 0 && freight > 0) {
        expensesSum = Math.round(freight * 0.58);
        fuelSum = Math.round(freight * 0.42);
        tollSum = Math.round(freight * 0.10);
        otherSum = Math.round(freight * 0.06);
      }

      const tripProfit = freight - expensesSum;

      monthData.grossFreight += freight;
      monthData.totalExpenses += expensesSum;
      monthData.netProfit += tripProfit;
      monthData.fuelExpenses += fuelSum;
      monthData.tollExpenses += tollSum;
      monthData.otherExpenses += otherSum;
      monthData.tripCount += 1;
      monthData.totalDistanceKm += km;

      monthData.tripsSummary.push({
        id: t.id,
        origin: t.origin,
        destination: t.destination,
        cargo: t.cargo || 'Carga Rodoviária',
        grossFreight: freight,
        profit: tripProfit,
        date: tripDateStr,
      });
    }
  });

  // Calculate margins and per-km metrics for each month
  const monthlyBreakdown: MonthlyProfitData[] = Array.from(monthlyMap.values()).map((m) => {
    const margin = m.grossFreight > 0 ? (m.netProfit / m.grossFreight) * 100 : 0;
    const profitKm = m.totalDistanceKm > 0 ? m.netProfit / m.totalDistanceKm : 0;
    return {
      ...m,
      profitMarginPct: Number(margin.toFixed(1)),
      profitPerKm: Number(profitKm.toFixed(2)),
    };
  });

  // Totals & KPI summaries
  const totalGrossFreight = monthlyBreakdown.reduce((sum, m) => sum + m.grossFreight, 0);
  const totalExpenses = monthlyBreakdown.reduce((sum, m) => sum + m.totalExpenses, 0);
  const totalNetProfit = totalGrossFreight - totalExpenses;
  const overallProfitMarginPct = totalGrossFreight > 0 ? (totalNetProfit / totalGrossFreight) * 100 : 0;
  const totalCompletedTrips = monthlyBreakdown.reduce((sum, m) => sum + m.tripCount, 0);
  const totalDistanceKm = monthlyBreakdown.reduce((sum, m) => sum + m.totalDistanceKm, 0);

  const activeMonths = monthlyBreakdown.filter((m) => m.tripCount > 0);
  const divisor = Math.max(1, activeMonths.length);
  const averageMonthlyProfit = totalNetProfit / divisor;
  const averageProfitPerKm = totalDistanceKm > 0 ? totalNetProfit / totalDistanceKm : 0;

  // Best and lowest month by net profit
  let bestMonth: { monthLabel: string; profit: number } | null = null;
  let lowestMonth: { monthLabel: string; profit: number } | null = null;

  activeMonths.forEach((m) => {
    if (!bestMonth || m.netProfit > bestMonth.profit) {
      bestMonth = { monthLabel: m.monthLabel, profit: m.netProfit };
    }
    if (!lowestMonth || m.netProfit < lowestMonth.profit) {
      lowestMonth = { monthLabel: m.monthLabel, profit: m.netProfit };
    }
  });

  return {
    periodLabel: 'Últimos 12 Meses (Visão Anual)',
    totalGrossFreight,
    totalExpenses,
    totalNetProfit,
    overallProfitMarginPct: Number(overallProfitMarginPct.toFixed(1)),
    totalCompletedTrips,
    totalDistanceKm,
    averageMonthlyProfit: Math.round(averageMonthlyProfit),
    averageProfitPerKm: Number(averageProfitPerKm.toFixed(2)),
    bestMonth,
    lowestMonth,
    dataSource: isUsingSupabase ? 'supabase' : 'fallback',
    monthlyBreakdown,
  };
};

/**
 * Seeds the historical completed trips and their expenses directly into Supabase.
 * Allows the user to populate their cloud database with realistic 1-year historical data.
 */
export const seedCompletedTripsToSupabase = async (): Promise<{ success: boolean; count: number; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      count: 0,
      message: 'Supabase não está configurado. Conecte sua URL e Chave Anon primeiro.',
    };
  }

  try {
    let insertedTripsCount = 0;

    for (const trip of MOCK_ANNUAL_COMPLETED_TRIPS) {
      // 1. Insert trip
      const { error: tripError } = await client.from('trips').upsert({
        id: trip.id,
        title: trip.title,
        origin: trip.origin,
        destination: trip.destination,
        cargo: trip.cargo,
        cargo_type: 'granel_solido',
        cargo_weight_ton: 38.0,
        vehicle_model: trip.vehicle_model,
        vehicle_plate: trip.vehicle_plate,
        axles: 9,
        gross_freight: trip.gross_freight,
        advance_payment: Math.round(trip.gross_freight * 0.7),
        balance_payment: Math.round(trip.gross_freight * 0.3),
        total_distance_km: trip.completed_distance_km,
        completed_distance_km: trip.completed_distance_km,
        current_odometer_km: 435000,
        start_odometer_km: 435000 - trip.completed_distance_km,
        target_consumption_km_l: 2.25,
        actual_consumption_km_l: 2.22,
        diesel_avg_price_per_l: 6.29,
        arla_avg_price_per_l: 2.80,
        estimated_toll_cost: 1100,
        is_completed: true,
        started_at: trip.started_at,
        estimated_arrival: trip.started_at,
        updated_at: new Date().toISOString(),
      });

      if (!tripError) {
        insertedTripsCount++;

        // 2. Insert expenses for this trip
        if (trip.expenses && trip.expenses.length > 0) {
          const expensePayload = trip.expenses.map((e, idx) => ({
            id: `exp-${trip.id}-${idx}`,
            trip_id: trip.id,
            category: e.category,
            description: e.description,
            amount: e.amount,
            date: trip.started_at.split('T')[0],
            time: '10:00:00',
            payment_method: 'Cartão Frete',
          }));

          await client.from('expenses').upsert(expensePayload);
        }
      }
    }

    return {
      success: true,
      count: insertedTripsCount,
      message: `${insertedTripsCount} viagens finalizadas históricas sincronizadas com sucesso no Supabase!`,
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: `Erro ao semear dados no Supabase: ${err?.message || 'Falha de comunicação'}`,
    };
  }
};
