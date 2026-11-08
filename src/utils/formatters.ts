import { CargoType, VehicleAxles } from '../types/cockpit';

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const formatKm = (km: number): string => {
  return `${new Intl.NumberFormat('pt-BR').format(Math.round(km))} km`;
};

export const formatOdometer = (km: number): string => {
  return `${new Intl.NumberFormat('pt-BR').format(Math.round(km))} KM`;
};

export const formatTimeSeconds = (totalSeconds: number): string => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
};

export const formatShortHours = (totalSeconds: number): string => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
};

/**
 * Tabela de Coeficientes da ANTT (Resolução nº 5.867 / 6.030 / Atualizações Vigentes)
 * CCD: Custo de Deslocamento (R$/km)
 * CC: Custo de Carga e Descarga (R$)
 */
interface AnttCoefficients {
  ccd: number;
  cc: number;
}

const ANTT_TABLE: Record<CargoType, Record<VehicleAxles, AnttCoefficients>> = {
  granel_solido: {
    2: { ccd: 3.82, cc: 340.50 },
    3: { ccd: 4.65, cc: 420.00 },
    4: { ccd: 5.30, cc: 510.00 },
    5: { ccd: 6.15, cc: 605.00 },
    6: { ccd: 7.24, cc: 715.00 },
    7: { ccd: 8.42, cc: 860.00 },
    9: { ccd: 10.15, cc: 1080.00 },
  },
  carga_geral: {
    2: { ccd: 3.95, cc: 360.00 },
    3: { ccd: 4.80, cc: 445.00 },
    4: { ccd: 5.50, cc: 540.00 },
    5: { ccd: 6.35, cc: 630.00 },
    6: { ccd: 7.45, cc: 745.00 },
    7: { ccd: 8.65, cc: 890.00 },
    9: { ccd: 10.45, cc: 1120.00 },
  },
  granel_liquido: {
    2: { ccd: 4.10, cc: 380.00 },
    3: { ccd: 4.95, cc: 460.00 },
    4: { ccd: 5.75, cc: 560.00 },
    5: { ccd: 6.60, cc: 660.00 },
    6: { ccd: 7.80, cc: 780.00 },
    7: { ccd: 9.05, cc: 930.00 },
    9: { ccd: 10.95, cc: 1180.00 },
  },
  frigorificada: {
    2: { ccd: 4.45, cc: 410.00 },
    3: { ccd: 5.35, cc: 495.00 },
    4: { ccd: 6.15, cc: 595.00 },
    5: { ccd: 7.10, cc: 710.00 },
    6: { ccd: 8.35, cc: 840.00 },
    7: { ccd: 9.70, cc: 1010.00 },
    9: { ccd: 11.80, cc: 1290.00 },
  },
  perigosa: {
    2: { ccd: 4.70, cc: 440.00 },
    3: { ccd: 5.60, cc: 530.00 },
    4: { ccd: 6.45, cc: 640.00 },
    5: { ccd: 7.50, cc: 760.00 },
    6: { ccd: 8.85, cc: 890.00 },
    7: { ccd: 10.30, cc: 1070.00 },
    9: { ccd: 12.50, cc: 1370.00 },
  },
  neogranel: {
    2: { ccd: 3.90, cc: 350.00 },
    3: { ccd: 4.75, cc: 435.00 },
    4: { ccd: 5.40, cc: 525.00 },
    5: { ccd: 6.25, cc: 620.00 },
    6: { ccd: 7.35, cc: 730.00 },
    7: { ccd: 8.55, cc: 875.00 },
    9: { ccd: 10.30, cc: 1100.00 },
  },
};

export const calculateAnttMinimumFloor = (
  distanceKm: number,
  axles: VehicleAxles,
  cargoType: CargoType
): { total: number; ccdRate: number; ccRate: number } => {
  const table = ANTT_TABLE[cargoType] || ANTT_TABLE.granel_solido;
  const coefs = table[axles] || table[6];
  const total = coefs.ccd * distanceKm + coefs.cc;
  return {
    total: Math.round(total * 100) / 100,
    ccdRate: coefs.ccd,
    ccRate: coefs.cc,
  };
};

export const getCargoLabel = (cargoType: CargoType): string => {
  const map: Record<CargoType, string> = {
    granel_solido: 'Granel Sólido (Grãos/Fertilizantes)',
    granel_liquido: 'Granel Líquido (Combustíveis)',
    carga_geral: 'Carga Geral (Seca/Industrial)',
    frigorificada: 'Frigorificada / Resfriada',
    perigosa: 'Carga Perigosa (MOPP)',
    neogranel: 'Neogranel (Tubos/Bobinas)',
  };
  return map[cargoType] || cargoType;
};

export const getVehicleAxleLabel = (axles: VehicleAxles): string => {
  const map: Record<VehicleAxles, string> = {
    2: '2 Eixos (VUC / Delivery / Hyundai HR / Toco)',
    3: '3 Eixos (Truck 6x2)',
    4: '4 Eixos (Bitruck 8x2 / 8x4)',
    5: '5 Eixos (Cavalo + Carreta 2 Eixos)',
    6: '6 Eixos (Cavalo 6x2/6x4 + Carreta 3 Eixos LS)',
    7: '7 Eixos (Bitrem 7 Eixos)',
    9: '9 Eixos (Rodotrem / Bitrenzão 9 Eixos)',
  };
  return map[axles] || `${axles} Eixos`;
};
