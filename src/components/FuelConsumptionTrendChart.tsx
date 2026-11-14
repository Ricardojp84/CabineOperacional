import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Expense } from '../types/cockpit';
import { formatCurrency, formatOdometer } from '../utils/formatters';
import { Fuel, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface FuelTrendPoint {
  id: string;
  index: number;
  shortLabel: string;
  fullDateTime: string;
  station: string;
  liters: number;
  amount: number;
  pricePerLiter: number;
  odometerKm?: number;
  kmDriven: number;
  consumptionKmL: number;
  targetKmL: number;
  isEstimated: boolean;
  isBelowAlertThreshold: boolean;
}

export function buildFuelConsumptionTrendData(params: {
  expenses: Expense[];
  startOdometerKm?: number;
  targetConsumptionKmL?: number;
  actualConsumptionKmL?: number;
  maxPoints?: number;
}): FuelTrendPoint[] {
  const {
    expenses,
    startOdometerKm = 0,
    targetConsumptionKmL = 2.3,
    actualConsumptionKmL = 0,
    maxPoints = 12,
  } = params;

  const fuelExpenses = expenses
    .filter((e) => e.category === 'combustivel' && (e.liters ?? 0) > 0)
    .slice()
    .sort((a, b) => {
      const keyA = `${a.date || ''}T${a.time || '00:00'}`;
      const keyB = `${b.date || ''}T${b.time || '00:00'}`;
      if (keyA !== keyB) return keyA.localeCompare(keyB);
      return (a.odometerKm || 0) - (b.odometerKm || 0);
    });

  if (fuelExpenses.length === 0) return [];

  let prevOdo = startOdometerKm > 0 ? startOdometerKm : 0;
  const allPoints: FuelTrendPoint[] = [];

  fuelExpenses.forEach((exp, idx) => {
    const liters = exp.liters || 0;
    if (liters <= 0) return;

    let kmDriven = 0;
    let consumptionKmL = 0;
    let isEstimated = false;

    if (exp.odometerKm && exp.odometerKm > 0) {
      if (prevOdo > 0 && exp.odometerKm > prevOdo) {
        kmDriven = Math.round(exp.odometerKm - prevOdo);
        consumptionKmL = Math.round((kmDriven / liters) * 100) / 100;
      } else {
        isEstimated = true;
        consumptionKmL = actualConsumptionKmL > 0 ? Math.round(actualConsumptionKmL * 100) / 100 : targetConsumptionKmL;
      }
      prevOdo = exp.odometerKm;
    } else {
      isEstimated = true;
      consumptionKmL = actualConsumptionKmL > 0 ? Math.round(actualConsumptionKmL * 100) / 100 : targetConsumptionKmL;
    }

    const dateParts = (exp.date || '').split('-');
    const brDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : exp.date || `#${idx + 1}`;
    const shortLabel = `#${idx + 1} (${brDate})`;
    const fullDateTime = `${brDate}${exp.time ? ` às ${exp.time}` : ''}`;
    const pricePerLiter = Math.round((exp.amount / liters) * 100) / 100;
    const isBelowAlertThreshold = targetConsumptionKmL > 0 && consumptionKmL <= targetConsumptionKmL * 0.8;

    allPoints.push({
      id: exp.id,
      index: idx + 1,
      shortLabel,
      fullDateTime,
      station: exp.location || exp.description || 'Posto Rodoviário',
      liters,
      amount: exp.amount,
      pricePerLiter,
      odometerKm: exp.odometerKm,
      kmDriven,
      consumptionKmL,
      targetKmL: targetConsumptionKmL,
      isEstimated,
      isBelowAlertThreshold,
    });
  });

  return allPoints.slice(-maxPoints);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: FuelTrendPoint }>;
}

const CustomFuelTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;

  return (
    <div className="bg-[#081425] border border-[#475569] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[220px]">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#334155]">
        <span className="font-extrabold text-[#ffb95f]">Abastecimento #{pt.index}</span>
        <span className="font-mono text-[11px] text-[#94a3b8]">{pt.fullDateTime}</span>
      </div>
      <div className="text-[11px] font-semibold text-[#d8e3fb] truncate max-w-[240px]">
        {pt.station}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 font-mono text-[11px]">
        <span className="text-[#94a3b8]">Consumo:</span>
        <span
          className={`text-right font-black ${
            pt.isBelowAlertThreshold
              ? 'text-[#ef4444]'
              : pt.consumptionKmL >= pt.targetKmL
              ? 'text-[#34d399]'
              : 'text-[#ffb95f]'
          }`}
        >
          {pt.consumptionKmL.toFixed(2)} km/L{pt.isEstimated ? ' (ref.)' : ''}
        </span>

        <span className="text-[#94a3b8]">Meta:</span>
        <span className="text-right text-[#34d399] font-bold">{pt.targetKmL.toFixed(2)} km/L</span>

        <span className="text-[#94a3b8]">Volume:</span>
        <span className="text-right text-[#38bdf8] font-bold">{pt.liters} L</span>

        <span className="text-[#94a3b8]">Valor / Preço:</span>
        <span className="text-right text-[#d8e3fb]">
          {formatCurrency(pt.amount)} ({formatCurrency(pt.pricePerLiter)}/L)
        </span>

        {pt.kmDriven > 0 && (
          <>
            <span className="text-[#94a3b8]">Trecho rodado:</span>
            <span className="text-right text-[#bec6e0]">+{formatOdometer(pt.kmDriven)}</span>
          </>
        )}

        {pt.odometerKm && pt.odometerKm > 0 && (
          <>
            <span className="text-[#94a3b8]">Odômetro:</span>
            <span className="text-right text-[#bec6e0]">{formatOdometer(pt.odometerKm)}</span>
          </>
        )}
      </div>
    </div>
  );
};

interface FuelConsumptionTrendChartProps {
  expenses: Expense[];
  startOdometerKm?: number;
  targetConsumptionKmL?: number;
  actualConsumptionKmL?: number;
  vehicleModel?: string;
}

export const FuelConsumptionTrendChart: React.FC<FuelConsumptionTrendChartProps> = ({
  expenses,
  startOdometerKm = 0,
  targetConsumptionKmL = 2.3,
  actualConsumptionKmL = 0,
  vehicleModel,
}) => {
  const chartData = useMemo(
    () =>
      buildFuelConsumptionTrendData({
        expenses,
        startOdometerKm,
        targetConsumptionKmL,
        actualConsumptionKmL,
      }),
    [expenses, startOdometerKm, targetConsumptionKmL, actualConsumptionKmL]
  );

  const summary = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgConsumption: actualConsumptionKmL,
        latestConsumption: actualConsumptionKmL,
        deltaFromPrevious: 0,
        totalLiters: 0,
      };
    }

    const totalLiters = chartData.reduce((acc, p) => acc + p.liters, 0);
    const sumConsumption = chartData.reduce((acc, p) => acc + p.consumptionKmL, 0);
    const avgConsumption = Math.round((sumConsumption / chartData.length) * 100) / 100;
    const latest = chartData[chartData.length - 1].consumptionKmL;
    const prev = chartData.length >= 2 ? chartData[chartData.length - 2].consumptionKmL : latest;
    const deltaFromPrevious = Math.round((latest - prev) * 100) / 100;

    return {
      avgConsumption,
      latestConsumption: latest,
      deltaFromPrevious,
      totalLiters,
    };
  }, [chartData, actualConsumptionKmL]);

  const isLatestAlert =
    targetConsumptionKmL > 0 &&
    summary.latestConsumption > 0 &&
    summary.latestConsumption <= targetConsumptionKmL * 0.8;

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#334155]/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#f59e0b]/60 flex items-center justify-center text-[#ffb95f] shrink-0">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2 flex-wrap">
              <span>Tendência Histórica de Consumo (km/L)</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#1e293b] text-[#38bdf8] border border-[#334155]">
                {chartData.length} {chartData.length === 1 ? 'abastecimento' : 'abastecimentos'}
              </span>
            </h4>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Evolução do rendimento de combustível por parada na viagem atual{vehicleModel ? ` • ${vehicleModel}` : ''}.
            </p>
          </div>
        </div>

        {/* Summary KPI Pills */}
        {chartData.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-[#081425] border border-[#334155]">
              <span className="text-[10px] font-sans uppercase text-[#94a3b8] block">Último Registro</span>
              <span className={`font-black ${isLatestAlert ? 'text-[#ef4444]' : 'text-[#ffb95f]'}`}>
                {summary.latestConsumption.toFixed(2)} km/L
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-[#081425] border border-[#334155]">
              <span className="text-[10px] font-sans uppercase text-[#94a3b8] block">Meta Veículo</span>
              <span className="font-black text-[#34d399]">{targetConsumptionKmL.toFixed(2)} km/L</span>
            </div>

            {chartData.length >= 2 && (
              <div
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  summary.deltaFromPrevious > 0
                    ? 'bg-[#003824]/70 border-[#10b981]/50 text-[#34d399]'
                    : summary.deltaFromPrevious < 0
                    ? 'bg-[#450a0a]/70 border-[#ef4444]/50 text-[#fca5a5]'
                    : 'bg-[#081425] border-[#334155] text-[#94a3b8]'
                }`}
              >
                {summary.deltaFromPrevious > 0 ? (
                  <TrendingUp className="w-4 h-4 shrink-0" />
                ) : summary.deltaFromPrevious < 0 ? (
                  <TrendingDown className="w-4 h-4 shrink-0" />
                ) : (
                  <Minus className="w-4 h-4 shrink-0" />
                )}
                <div>
                  <span className="text-[10px] font-sans uppercase block opacity-80">Variação</span>
                  <span className="font-black">
                    {summary.deltaFromPrevious > 0 ? '+' : ''}
                    {summary.deltaFromPrevious.toFixed(2)} km/L
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recharts LineChart or Empty State */}
      {chartData.length === 0 ? (
        <div className="py-10 px-4 text-center bg-[#081425] rounded-xl border border-dashed border-[#334155] space-y-2">
          <Fuel className="w-8 h-8 text-[#64748b] mx-auto" />
          <p className="text-xs font-bold text-[#bec6e0]">
            Nenhum abastecimento de combustível registrado nesta viagem ainda.
          </p>
          <p className="text-[11px] text-[#94a3b8] max-w-md mx-auto">
            Registre abastecimentos pelo botão <strong>&ldquo;Abastecer Agora&rdquo;</strong> informando litros e odômetro para visualizar a curva histórica de consumo em km/L.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-full h-60 sm:h-64 bg-[#081425] rounded-xl border border-[#334155]/80 p-2 sm:p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 14, right: 18, left: -4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor((Math.min(dataMin, targetConsumptionKmL * 0.75) - 0.2) * 10) / 10),
                    (dataMax: number) => Math.ceil((Math.max(dataMax, targetConsumptionKmL) + 0.3) * 10) / 10,
                  ]}
                  tickFormatter={(v: number) => `${v.toFixed(1)}`}
                />
                <Tooltip content={<CustomFuelTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#bec6e0' }}
                />

                {targetConsumptionKmL > 0 && (
                  <ReferenceLine
                    y={targetConsumptionKmL}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    label={{
                      value: `Meta (${targetConsumptionKmL.toFixed(2)} km/L)`,
                      fill: '#34d399',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {targetConsumptionKmL > 0 && (
                  <ReferenceLine
                    y={Math.round(targetConsumptionKmL * 0.8 * 100) / 100}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{
                      value: `Alerta -20% (${(targetConsumptionKmL * 0.8).toFixed(2)})`,
                      fill: '#fca5a5',
                      fontSize: 10,
                      position: 'insideBottomRight',
                    }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="consumptionKmL"
                  name="Consumo Medido (km/L)"
                  stroke="#ffb95f"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#f59e0b', stroke: '#081425', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom Legend & Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94a3b8]">
            <div className="flex items-center gap-1.5">
              {isLatestAlert ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444]" />
                  <span className="text-[#fca5a5] font-semibold">
                    Último trecho ficou 20% ou mais abaixo da meta — verifique filtros, calibração de pneus ou injeção.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>
                    Total abastecido analisado: <strong className="text-[#38bdf8] font-mono">{summary.totalLiters} L</strong> • Média histórica dos trechos: <strong className="text-[#ffb95f] font-mono">{summary.avgConsumption.toFixed(2)} km/L</strong>
                  </span>
                </>
              )}
            </div>
            <span className="font-mono text-[10px] text-[#64748b]">
              Passe o cursor ou toque nos pontos para detalhar posto e odômetro
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
