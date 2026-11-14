import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { Trip, User, VehicleAxles } from '../types/cockpit';
import { TRUCK_MODELS_PRESETS } from './VehicleSettingsModal';
import { buildFuelConsumptionTrendData } from './FuelConsumptionTrendChart';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick } from '../utils/audio';
import {
  Gauge,
  X,
  TrendingUp,
  TrendingDown,
  Truck,
  Award,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

export interface NationalBenchmarkInfo {
  nationalAvgKmL: number;
  matchedModel: string;
  categoryLabel: string;
  sourceLabel: string;
}

const AXLE_NATIONAL_AVERAGES: Record<VehicleAxles, { avgKmL: number; label: string }> = {
  2: { avgKmL: 6.2, label: 'VUC / Toco 2 Eixos (Média Brasil)' },
  3: { avgKmL: 3.2, label: 'Truck 3 Eixos 6x2 (Média Brasil)' },
  4: { avgKmL: 2.8, label: 'Bitruck 4 Eixos 8x2 (Média Brasil)' },
  5: { avgKmL: 2.6, label: 'Carreta 5 Eixos (Média Brasil)' },
  6: { avgKmL: 2.25, label: 'Carreta Trucada 6 Eixos (Média Brasil)' },
  7: { avgKmL: 1.75, label: 'Bitrem 7 Eixos (Média Brasil)' },
  9: { avgKmL: 1.55, label: 'Rodotrem 9 Eixos (Média Brasil)' },
};

export function getNationalBenchmarkForVehicle(
  vehicleModel: string,
  axles: VehicleAxles
): NationalBenchmarkInfo {
  const normalizedInput = (vehicleModel || '').trim().toLowerCase();

  // 1. Exact or strong substring match against registered presets
  const exactPreset = TRUCK_MODELS_PRESETS.find(
    (p) => p.name.toLowerCase() === normalizedInput
  );
  if (exactPreset && exactPreset.defaultConsumptionKmL) {
    return {
      nationalAvgKmL: exactPreset.defaultConsumptionKmL,
      matchedModel: exactPreset.name,
      categoryLabel: exactPreset.type,
      sourceLabel: 'Referência Nacional ANTT/CNT por Modelo',
    };
  }

  const partialPreset = TRUCK_MODELS_PRESETS.find((p) => {
    const presetLower = p.name.toLowerCase();
    if (!normalizedInput) return false;
    return (
      presetLower.includes(normalizedInput) ||
      normalizedInput.includes(presetLower.split(' ').slice(0, 2).join(' '))
    );
  });

  if (partialPreset && partialPreset.defaultConsumptionKmL) {
    return {
      nationalAvgKmL: partialPreset.defaultConsumptionKmL,
      matchedModel: partialPreset.name,
      categoryLabel: partialPreset.type,
      sourceLabel: 'Referência Nacional ANTT/CNT por Família do Modelo',
    };
  }

  // 2. Fallback to national benchmark by axle configuration
  const axleFallback = AXLE_NATIONAL_AVERAGES[axles] || AXLE_NATIONAL_AVERAGES[6];
  return {
    nationalAvgKmL: axleFallback.avgKmL,
    matchedModel: vehicleModel || `${axles} Eixos`,
    categoryLabel: axleFallback.label,
    sourceLabel: 'Referência Nacional por Configuração de Eixos',
  };
}

export interface ProductivityBarDatum {
  key: 'motorista' | 'nacional' | 'meta';
  label: string;
  kmPerLiter: number;
  fill: string;
  detail: string;
}

export interface ProductivityRefuelComparisonPoint {
  label: string;
  station: string;
  driverKmL: number;
  nationalKmL: number;
  liters: number;
}

export interface ProductivityComparisonSummary {
  driverAvgKmL: number;
  nationalAvgKmL: number;
  targetKmL: number;
  diffKmL: number;
  diffPercent: number;
  isAboveNational: boolean;
  estimatedFuelImpactBrl: number;
  estimatedLitersDiff: number;
  benchmark: NationalBenchmarkInfo;
  comparisonBars: ProductivityBarDatum[];
  refuelComparison: ProductivityRefuelComparisonPoint[];
}

export function buildProductivityComparisonData(params: {
  trip: Trip;
  driverName?: string;
}): ProductivityComparisonSummary {
  const { trip, driverName } = params;
  const benchmark = getNationalBenchmarkForVehicle(trip.vehicleModel, trip.axles);
  const nationalAvgKmL = benchmark.nationalAvgKmL;
  const targetKmL = trip.targetConsumptionKmL > 0 ? trip.targetConsumptionKmL : nationalAvgKmL;

  const refuelPoints = buildFuelConsumptionTrendData({
    expenses: trip.expenses,
    startOdometerKm: trip.startOdometerKm,
    targetConsumptionKmL: targetKmL,
    actualConsumptionKmL: trip.actualConsumptionKmL,
  });

  let driverAvgKmL = trip.actualConsumptionKmL > 0 ? trip.actualConsumptionKmL : 0;
  if (driverAvgKmL <= 0 && refuelPoints.length > 0) {
    const sum = refuelPoints.reduce((acc, p) => acc + p.consumptionKmL, 0);
    driverAvgKmL = Math.round((sum / refuelPoints.length) * 100) / 100;
  }

  const diffKmL = Math.round((driverAvgKmL - nationalAvgKmL) * 100) / 100;
  const diffPercent =
    nationalAvgKmL > 0 ? Math.round(((driverAvgKmL - nationalAvgKmL) / nationalAvgKmL) * 1000) / 10 : 0;
  const isAboveNational = driverAvgKmL >= nationalAvgKmL;

  const distanceBase =
    trip.completedDistanceKm > 0 ? trip.completedDistanceKm : trip.totalDistanceKm || 0;
  const dieselPrice = trip.dieselAvgPricePerL > 0 ? trip.dieselAvgPricePerL : 6.2;

  let estimatedLitersDiff = 0;
  let estimatedFuelImpactBrl = 0;
  if (distanceBase > 0 && driverAvgKmL > 0 && nationalAvgKmL > 0) {
    const litersAtNational = distanceBase / nationalAvgKmL;
    const litersAtDriver = distanceBase / driverAvgKmL;
    // Positive = liters saved compared to national average
    estimatedLitersDiff = Math.round((litersAtNational - litersAtDriver) * 10) / 10;
    estimatedFuelImpactBrl = Math.round(estimatedLitersDiff * dieselPrice * 100) / 100;
  }

  const shortDriver = driverName ? driverName.split(' ')[0] : 'Motorista';

  const comparisonBars: ProductivityBarDatum[] = [
    {
      key: 'motorista',
      label: `Média do Motorista (${shortDriver})`,
      kmPerLiter: driverAvgKmL,
      fill: isAboveNational ? '#10b981' : '#ef4444',
      detail: 'Rendimento real aferido na viagem atual',
    },
    {
      key: 'nacional',
      label: 'Média Nacional Estimada',
      kmPerLiter: nationalAvgKmL,
      fill: '#38bdf8',
      detail: `${benchmark.matchedModel} · ${benchmark.categoryLabel}`,
    },
    {
      key: 'meta',
      label: 'Meta do Veículo',
      kmPerLiter: targetKmL,
      fill: '#ffb95f',
      detail: 'Meta configurada nos parâmetros do caminhão',
    },
  ];

  const refuelComparison: ProductivityRefuelComparisonPoint[] = refuelPoints.map((pt) => ({
    label: pt.shortLabel,
    station: pt.station,
    driverKmL: pt.consumptionKmL,
    nationalKmL: nationalAvgKmL,
    liters: pt.liters,
  }));

  return {
    driverAvgKmL,
    nationalAvgKmL,
    targetKmL,
    diffKmL,
    diffPercent,
    isAboveNational,
    estimatedFuelImpactBrl,
    estimatedLitersDiff,
    benchmark,
    comparisonBars,
    refuelComparison,
  };
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProductivityBarDatum }>;
}

const ComparisonBarTooltip: React.FC<CustomBarTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-[#081425] border border-[#475569] rounded-xl p-3 shadow-2xl text-xs space-y-1 max-w-[260px]">
      <div className="font-extrabold text-[#d8e3fb]">{item.label}</div>
      <div className="font-mono tabular-nums text-base font-black" style={{ color: item.fill }}>
        {item.kmPerLiter.toFixed(2)} km/L
      </div>
      <div className="text-[11px] text-[#94a3b8] leading-snug">{item.detail}</div>
    </div>
  );
};

interface RefuelTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ProductivityRefuelComparisonPoint }>;
}

const RefuelBarTooltip: React.FC<RefuelTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  const diff = pt.driverKmL - pt.nationalKmL;
  return (
    <div className="bg-[#081425] border border-[#475569] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
      <div className="font-extrabold text-[#ffb95f] border-b border-[#334155] pb-1">
        {pt.label} · {pt.station}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono tabular-nums text-[11px]">
        <span className="text-[#94a3b8]">Motorista:</span>
        <span className="text-right font-black text-[#34d399]">{pt.driverKmL.toFixed(2)} km/L</span>
        <span className="text-[#94a3b8]">Média Nacional:</span>
        <span className="text-right font-bold text-[#38bdf8]">{pt.nationalKmL.toFixed(2)} km/L</span>
        <span className="text-[#94a3b8]">Diferença:</span>
        <span
          className={`text-right font-bold ${
            diff >= 0 ? 'text-[#34d399]' : 'text-[#ef4444]'
          }`}
        >
          {diff >= 0 ? '+' : ''}
          {diff.toFixed(2)} km/L
        </span>
      </div>
    </div>
  );
};

interface ProductivityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentUser?: User | null;
}

export const ProductivityReportModal: React.FC<ProductivityReportModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUser,
}) => {
  const [chartView, setChartView] = useState<'comparativo' | 'trechos'>('comparativo');

  const data = useMemo(
    () => buildProductivityComparisonData({ trip, driverName: currentUser?.name }),
    [trip, currentUser?.name]
  );

  if (!isOpen) return null;

  const hasDriverMeasurement = data.driverAvgKmL > 0;
  const maxY = Math.ceil(
    Math.max(data.driverAvgKmL, data.nationalAvgKmL, data.targetKmL, 3) * 1.25 * 10
  ) / 10;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Relatório de Produtividade e Consumo"
    >
      <div className="bg-[#152031] border border-[#334155] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#38bdf8]/50 flex items-center justify-center text-[#38bdf8] shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                Relatório de Produtividade de Combustível
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
                <span className="font-semibold text-[#ffb95f]">{trip.vehicleModel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{trip.vehiclePlate}</span>
                <span aria-hidden="true">·</span>
                <span>{data.benchmark.categoryLabel}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            aria-label="Fechar relatório de produtividade"
            className="w-10 h-10 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* KPI Comparison Strip (Tabular Numerals, Clean Hairline Dividers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#334155] bg-[#081425] rounded-xl border border-[#334155]">
            <div className="p-3.5">
              <div className="text-[11px] font-semibold text-[#94a3b8]">
                Média do Motorista
              </div>
              <div
                className={`font-mono tabular-nums text-xl font-black mt-0.5 ${
                  !hasDriverMeasurement
                    ? 'text-[#94a3b8]'
                    : data.isAboveNational
                    ? 'text-[#34d399]'
                    : 'text-[#ef4444]'
                }`}
              >
                {hasDriverMeasurement ? `${data.driverAvgKmL.toFixed(2)} km/L` : 'Sem leitura'}
              </div>
              <div className="text-[11px] text-[#64748b] mt-0.5 truncate">
                {currentUser?.name || 'Condutor da rota'}
              </div>
            </div>

            <div className="p-3.5">
              <div className="text-[11px] font-semibold text-[#94a3b8]">
                Média Nacional Estimada
              </div>
              <div className="font-mono tabular-nums text-xl font-black text-[#38bdf8] mt-0.5">
                {data.nationalAvgKmL.toFixed(2)} km/L
              </div>
              <div className="text-[11px] text-[#64748b] mt-0.5 truncate">
                {data.benchmark.sourceLabel}
              </div>
            </div>

            <div className="p-3.5">
              <div className="text-[11px] font-semibold text-[#94a3b8]">
                Desempenho vs. Nacional
              </div>
              <div
                className={`font-mono tabular-nums text-xl font-black mt-0.5 flex items-center gap-1.5 ${
                  !hasDriverMeasurement
                    ? 'text-[#94a3b8]'
                    : data.isAboveNational
                    ? 'text-[#34d399]'
                    : 'text-[#ef4444]'
                }`}
              >
                {hasDriverMeasurement ? (
                  <>
                    <span>
                      {data.diffKmL >= 0 ? '+' : ''}
                      {data.diffKmL.toFixed(2)} km/L
                    </span>
                    {data.isAboveNational ? (
                      <TrendingUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 shrink-0" />
                    )}
                  </>
                ) : (
                  '—'
                )}
              </div>
              <div className="text-[11px] text-[#64748b] mt-0.5 font-mono tabular-nums">
                {hasDriverMeasurement
                  ? `${data.diffPercent >= 0 ? '+' : ''}${data.diffPercent.toFixed(1)}% em relação ao país`
                  : 'Aguardando abastecimento'}
              </div>
            </div>

            <div className="p-3.5">
              <div className="text-[11px] font-semibold text-[#94a3b8]">
                Impacto Estimado em Diesel
              </div>
              <div
                className={`font-mono tabular-nums text-xl font-black mt-0.5 ${
                  !hasDriverMeasurement
                    ? 'text-[#94a3b8]'
                    : data.estimatedFuelImpactBrl >= 0
                    ? 'text-[#34d399]'
                    : 'text-[#ffb95f]'
                }`}
              >
                {hasDriverMeasurement
                  ? `${data.estimatedFuelImpactBrl >= 0 ? '+' : ''}${formatCurrency(
                      data.estimatedFuelImpactBrl
                    )}`
                  : 'R$ 0,00'}
              </div>
              <div className="text-[11px] text-[#64748b] mt-0.5 font-mono tabular-nums">
                {hasDriverMeasurement
                  ? `${data.estimatedLitersDiff >= 0 ? 'Economia de ' : 'Excesso de '}${Math.abs(
                      data.estimatedLitersDiff
                    ).toFixed(1)} L na viagem`
                  : `${formatKm(trip.completedDistanceKm)} rodados`}
              </div>
            </div>
          </div>

          {/* Chart Card */}
          <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#d8e3fb] flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[#ffb95f]" />
                  Comparativo de Rendimento (km/L)
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Motorista vs. Média Nacional Estimada para {data.benchmark.matchedModel} ({trip.axles} eixos)
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#081425] rounded-lg border border-[#334155]">
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setChartView('comparativo');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    chartView === 'comparativo'
                      ? 'bg-[#1e293b] text-[#ffb95f]'
                      : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                  }`}
                >
                  Comparativo Geral
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setChartView('trechos');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    chartView === 'trechos'
                      ? 'bg-[#1e293b] text-[#ffb95f]'
                      : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                  }`}
                >
                  Por Abastecimento ({data.refuelComparison.length})
                </button>
              </div>
            </div>

            {!hasDriverMeasurement && chartView === 'comparativo' ? (
              <div className="py-12 px-4 text-center bg-[#081425] rounded-xl border border-dashed border-[#334155] space-y-2">
                <Truck className="w-8 h-8 text-[#64748b] mx-auto" />
                <p className="text-xs font-bold text-[#cbd5e1]">
                  Ainda não há consumo médio aferido para esta viagem.
                </p>
                <p className="text-[11px] text-[#94a3b8] max-w-md mx-auto">
                  Registre um abastecimento com odômetro ou informe a média real do veículo para comparar seu rendimento frente à média nacional de {data.nationalAvgKmL.toFixed(2)} km/L.
                </p>
              </div>
            ) : chartView === 'trechos' && data.refuelComparison.length === 0 ? (
              <div className="py-12 px-4 text-center bg-[#081425] rounded-xl border border-dashed border-[#334155] space-y-2">
                <Truck className="w-8 h-8 text-[#64748b] mx-auto" />
                <p className="text-xs font-bold text-[#cbd5e1]">
                  Nenhum abastecimento registrado na viagem ativa.
                </p>
                <p className="text-[11px] text-[#94a3b8] max-w-md mx-auto">
                  Adicione abastecimentos pelo botão &ldquo;Abastecer Agora&rdquo; para comparar cada parada com a média nacional do modelo.
                </p>
              </div>
            ) : (
              <div className="w-full h-72 bg-[#081425] rounded-xl border border-[#334155] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  {chartView === 'comparativo' ? (
                    <BarChart
                      data={data.comparisonBars}
                      margin={{ top: 18, right: 24, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        tick={{ fill: '#cbd5e1', fontSize: 11 }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                        domain={[0, maxY]}
                        tickFormatter={(v: number) => `${v.toFixed(1)}`}
                      />
                      <Tooltip
                        content={<ComparisonBarTooltip />}
                        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                      />
                      <ReferenceLine
                        y={data.nationalAvgKmL}
                        stroke="#38bdf8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Média Nacional (${data.nationalAvgKmL.toFixed(2)} km/L)`,
                          fill: '#38bdf8',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                      <Bar
                        dataKey="kmPerLiter"
                        name="Rendimento (km/L)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={76}
                      >
                        {data.comparisonBars.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={data.refuelComparison}
                      margin={{ top: 16, right: 20, left: 4, bottom: 8 }}
                      barGap={6}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#94a3b8"
                        tick={{ fill: '#cbd5e1', fontSize: 11 }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                        domain={[0, maxY]}
                        tickFormatter={(v: number) => `${v.toFixed(1)}`}
                      />
                      <Tooltip
                        content={<RefuelBarTooltip />}
                        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={30}
                        wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#bec6e0' }}
                      />
                      <Bar
                        dataKey="driverKmL"
                        name="Motorista (km/L)"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                      <Bar
                        dataKey="nationalKmL"
                        name="Média Nacional (km/L)"
                        fill="#38bdf8"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}

            {/* Diagnostic Interpretation Footer */}
            {hasDriverMeasurement && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  data.isAboveNational
                    ? 'bg-[#064e3b]/30 border-[#10b981]/40 text-[#a7f3d0]'
                    : 'bg-[#472a00]/50 border-[#f59e0b]/40 text-[#fde68a]'
                }`}
              >
                {data.isAboveNational ? (
                  <Award className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#fbbf24] shrink-0 mt-0.5" />
                )}
                <p className="leading-relaxed">
                  {data.isAboveNational ? (
                    <>
                      <strong>Desempenho Acima da Média Nacional:</strong> Sua condução está{' '}
                      <span className="font-mono tabular-nums font-bold">
                        +{data.diffPercent.toFixed(1)}%
                      </span>{' '}
                      mais eficiente que a referência nacional para o{' '}
                      <strong>{data.benchmark.matchedModel}</strong> ({data.nationalAvgKmL.toFixed(2)} km/L).
                    </>
                  ) : (
                    <>
                      <strong>Oportunidade de Economia:</strong> O consumo atual está{' '}
                      <span className="font-mono tabular-nums font-bold">
                        {Math.abs(data.diffPercent).toFixed(1)}%
                      </span>{' '}
                      abaixo da média nacional de {data.nationalAvgKmL.toFixed(2)} km/L. Verifique
                      calibragem de pneus, filtros e condução na faixa econômica (rotações verdes).
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#334155] bg-[#0f172a] flex justify-end">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="h-10 px-5 rounded-xl bg-[#243248] hover:bg-[#334155] border border-[#475569] text-xs font-extrabold text-[#d8e3fb] cursor-pointer transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};
