/**
 * Serviço de Monitoramento de Vida Útil de Pneus
 * Registra a quilometragem atual de cada pneu e dispara alertas visuais ao atingir 80% do desgaste estimado.
 */

import { TireMonitorItem, TireConditionStatus } from '../types/cockpit';

export const STORAGE_KEY_TIRES = 'cabine_tire_lifespan_monitor';

export const TIRE_WEAR_ALERT_THRESHOLD_PCT = 80;

export const INITIAL_TIRES: TireMonitorItem[] = [
  {
    id: 'tire-1',
    position: 'Dianteiro Esquerdo (Eixo 1)',
    axleNumber: 1,
    brandModel: 'Michelin X Multi Z 295/80 R22.5',
    fireNumber: 'F-0101',
    dotCode: '1825',
    lifeStage: 'novo',
    currentTireKm: 42500,
    estimatedLifeKm: 90000,
    lastUpdatedAt: '2026-11-12T10:00:00.000Z',
    notes: 'Direcional liso. Alinhamento e balanceamento conferidos.',
  },
  {
    id: 'tire-2',
    position: 'Dianteiro Direito (Eixo 1)',
    axleNumber: 1,
    brandModel: 'Michelin X Multi Z 295/80 R22.5',
    fireNumber: 'F-0102',
    dotCode: '1825',
    lifeStage: 'novo',
    currentTireKm: 75600,
    estimatedLifeKm: 90000, // 84% -> Dispara alerta >= 80%
    lastUpdatedAt: '2026-11-12T10:00:00.000Z',
    notes: 'Desgaste acentuado no ombro externo direito — programar rodízio ou troca.',
  },
  {
    id: 'tire-3',
    position: 'Tração Externa Esquerda (Eixo 2)',
    axleNumber: 2,
    brandModel: 'Pirelli FR01 / TR01 295/80 R22.5',
    fireNumber: 'F-0201',
    dotCode: '0925',
    lifeStage: '1_recapagem',
    currentTireKm: 66400,
    estimatedLifeKm: 80000, // 83% -> Dispara alerta >= 80%
    lastUpdatedAt: '2026-11-13T14:30:00.000Z',
    notes: 'Borrachudo de tração. Sulcos próximos do limite TWI para recapagem.',
  },
  {
    id: 'tire-4',
    position: 'Tração Interna Esquerda (Eixo 2)',
    axleNumber: 2,
    brandModel: 'Pirelli FR01 / TR01 295/80 R22.5',
    fireNumber: 'F-0202',
    dotCode: '0925',
    lifeStage: '1_recapagem',
    currentTireKm: 49200,
    estimatedLifeKm: 80000, // 61.5%
    lastUpdatedAt: '2026-11-13T14:30:00.000Z',
    notes: 'Pressão calibrada em 110 PSI.',
  },
  {
    id: 'tire-5',
    position: 'Tração Externa Direita (Eixo 2)',
    axleNumber: 2,
    brandModel: 'Bridgestone R268 295/80 R22.5',
    fireNumber: 'F-0203',
    dotCode: '3124',
    lifeStage: 'novo',
    currentTireKm: 31000,
    estimatedLifeKm: 85000, // 36.5%
    lastUpdatedAt: '2026-11-10T08:15:00.000Z',
  },
  {
    id: 'tire-6',
    position: 'Tração Interna Direita (Eixo 2)',
    axleNumber: 2,
    brandModel: 'Bridgestone R268 295/80 R22.5',
    fireNumber: 'F-0204',
    dotCode: '3124',
    lifeStage: 'novo',
    currentTireKm: 31000,
    estimatedLifeKm: 85000, // 36.5%
    lastUpdatedAt: '2026-11-10T08:15:00.000Z',
  },
];

export interface TireWearAnalysis {
  wearPct: number; // ex: 84.0
  clampedBarPct: number; // 0 a 100
  remainingKm: number; // pode ser negativo se ultrapassou
  status: TireConditionStatus;
  isAlert80: boolean; // true se wearPct >= 80
}

/**
 * Calcula a porcentagem de desgaste e status de alerta (>= 80% do desgaste estimado)
 */
export function calculateTireWear(tire: TireMonitorItem): TireWearAnalysis {
  const estimated = tire.estimatedLifeKm > 0 ? tire.estimatedLifeKm : 1;
  const current = Math.max(0, tire.currentTireKm || 0);

  const rawPct = (current / estimated) * 100;
  const wearPct = Math.round(rawPct * 10) / 10;
  const clampedBarPct = Math.min(100, Math.max(0, rawPct));
  const remainingKm = Math.round(estimated - current);

  let status: TireConditionStatus = 'bom';
  if (rawPct >= 100) {
    status = 'critico';
  } else if (rawPct >= TIRE_WEAR_ALERT_THRESHOLD_PCT) {
    status = 'alerta_80';
  }

  return {
    wearPct,
    clampedBarPct,
    remainingKm,
    status,
    isAlert80: rawPct >= TIRE_WEAR_ALERT_THRESHOLD_PCT,
  };
}

/**
 * Carrega a lista de pneus do localStorage
 */
export function loadTires(): TireMonitorItem[] {
  if (typeof window === 'undefined') return INITIAL_TIRES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TIRES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler pneus do localStorage:', err);
  }
  return INITIAL_TIRES;
}

/**
 * Salva a lista de pneus no localStorage
 */
export function saveTires(tires: TireMonitorItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TIRES, JSON.stringify(tires));
  } catch (err) {
    console.error('Erro ao salvar pneus no localStorage:', err);
  }
}

/**
 * Retorna todos os pneus que atingiram ou ultrapassaram 80% do desgaste estimado
 */
export function getCriticalTireAlerts(
  tires: TireMonitorItem[]
): Array<{ tire: TireMonitorItem; analysis: TireWearAnalysis }> {
  return tires
    .map((tire) => ({
      tire,
      analysis: calculateTireWear(tire),
    }))
    .filter((entry) => entry.analysis.isAlert80)
    .sort((a, b) => b.analysis.wearPct - a.analysis.wearPct);
}

/**
 * Soma um incremento de quilometragem rodada em todos os pneus monitorados
 */
export function addKmToAllTires(tires: TireMonitorItem[], kmDelta: number): TireMonitorItem[] {
  if (!kmDelta || kmDelta <= 0) return tires;
  const now = new Date().toISOString();
  return tires.map((tire) => ({
    ...tire,
    currentTireKm: Math.round((tire.currentTireKm || 0) + kmDelta),
    lastUpdatedAt: now,
  }));
}
