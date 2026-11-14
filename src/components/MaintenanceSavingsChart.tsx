import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { MaintenanceItem, MaintenanceComponent, Expense } from '../types/cockpit';
import { formatCurrency } from '../utils/formatters';
import { ShieldCheck, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

export interface MaintenanceSavingsGroupPoint {
  groupKey: string;
  groupLabel: string;
  preventiveCost: number;
  avoidedCorrectiveCost: number;
  estimatedSavings: number;
  multiplier: number;
  itemsCount: number;
  overdueCount: number;
}

export interface MaintenanceSavingsConsolidatedPoint {
  label: string;
  amount: number;
  fill: string;
  description: string;
}

export interface MaintenanceSavingsSummary {
  totalPreventiveCost: number;
  totalAvoidedCorrectiveCost: number;
  totalEstimatedSavings: number;
  roiRatio: number;
  realizedItemsCount: number;
  overdueRiskCount: number;
  overdueRiskAmount: number;
}

interface SystemGroupSpec {
  key: string;
  label: string;
  multiplier: number;
  rationale: string;
}

const SYSTEM_GROUPS: Record<MaintenanceComponent, SystemGroupSpec> = {
  oleo_motor: {
    key: 'motor_filtros',
    label: 'Motor & Filtros',
    multiplier: 3.4,
    rationale: 'Evita fundição de motor, falha de bicos/turbina e guincho pesado em rodovia',
  },
  filtro_combustivel: {
    key: 'motor_filtros',
    label: 'Motor & Filtros',
    multiplier: 3.4,
    rationale: 'Evita entupimento de sistema de injeção e parada forçada na estrada',
  },
  filtro_ar: {
    key: 'motor_filtros',
    label: 'Motor & Filtros',
    multiplier: 3.4,
    rationale: 'Evita desgaste prematuro de anéis/cilindros e perda de potência',
  },
  freios: {
    key: 'freios_suspensao',
    label: 'Freios & Suspensão',
    multiplier: 2.9,
    rationale: 'Evita travamento de rodas, socorro mecânico emergencial e retenção ANTT',
  },
  suspensao: {
    key: 'freios_suspensao',
    label: 'Freios & Suspensão',
    multiplier: 2.9,
    rationale: 'Evita estouro de bolsa pneumática e danos estruturais no chassi',
  },
  pneus: {
    key: 'pneus_rodagem',
    label: 'Pneus & Rodagem',
    multiplier: 2.5,
    rationale: 'Evita estouro na rodovia, perda da carcaça para recapagem e borracharia móvel',
  },
  eletrica_bateria: {
    key: 'eletrica_arrefecimento',
    label: 'Elétrica & Arref.',
    multiplier: 2.8,
    rationale: 'Evita pane elétrica em rodovia e superaquecimento de cabeçote',
  },
  arrefecimento: {
    key: 'eletrica_arrefecimento',
    label: 'Elétrica & Arref.',
    multiplier: 2.8,
    rationale: 'Evita superaquecimento do motor, junta queimada e remoção por prancha',
  },
  diferencial: {
    key: 'cambio_gerais',
    label: 'Câmbio & Gerais',
    multiplier: 3.2,
    rationale: 'Evita quebra de caixa/diferencial e alto custo de socorro pesado',
  },
  consertos_gerais: {
    key: 'cambio_gerais',
    label: 'Câmbio & Gerais',
    multiplier: 3.2,
    rationale: 'Evita paradas corretivas não programadas com carga parada na rodovia',
  },
};

const GROUP_ORDER = [
  'motor_filtros',
  'freios_suspensao',
  'pneus_rodagem',
  'eletrica_arrefecimento',
  'cambio_gerais',
];

export function buildMaintenanceSavingsComparison(params: {
  maintenanceItems: MaintenanceItem[];
  currentOdometer: number;
  expenses?: Expense[];
}): {
  bySystem: MaintenanceSavingsGroupPoint[];
  consolidated: MaintenanceSavingsConsolidatedPoint[];
  summary: MaintenanceSavingsSummary;
} {
  const { maintenanceItems, currentOdometer, expenses = [] } = params;

  const groupMap = new Map<string, MaintenanceSavingsGroupPoint>();

  // Initialize buckets cleanly
  const initBucket = (key: string, label: string, multiplier: number): MaintenanceSavingsGroupPoint => ({
    groupKey: key,
    groupLabel: label,
    preventiveCost: 0,
    avoidedCorrectiveCost: 0,
    estimatedSavings: 0,
    multiplier,
    itemsCount: 0,
    overdueCount: 0,
  });

  Object.values(SYSTEM_GROUPS).forEach((spec) => {
    if (!groupMap.has(spec.key)) {
      groupMap.set(spec.key, initBucket(spec.key, spec.label, spec.multiplier));
    }
  });

  let realizedItemsCount = 0;
  let overdueRiskCount = 0;
  let overdueRiskAmount = 0;

  maintenanceItems.forEach((item) => {
    const spec = SYSTEM_GROUPS[item.component] ?? SYSTEM_GROUPS.consertos_gerais;
    const bucket = groupMap.get(spec.key)!;

    const isOverdue = currentOdometer > 0 && item.nextDueKm <= currentOdometer;
    if (isOverdue) {
      bucket.overdueCount += 1;
      overdueRiskCount += 1;
      overdueRiskAmount += Math.round(item.estimatedCost * spec.multiplier);
    }

    // Items with lastDoneKm > 0 represent preventive maintenance realized in the current/latest cycle
    if (item.lastDoneKm > 0 && item.estimatedCost > 0) {
      const prevCost = Math.round(item.estimatedCost);
      const avoidedCost = Math.round(prevCost * spec.multiplier);
      const savings = Math.max(0, avoidedCost - prevCost);

      bucket.preventiveCost += prevCost;
      bucket.avoidedCorrectiveCost += avoidedCost;
      bucket.estimatedSavings += savings;
      bucket.itemsCount += 1;
      realizedItemsCount += 1;
    }
  });

  // Include standalone trip expenses logged directly for maintenance/tires
  // (excluding ones auto-created via "Fiz & Lançar Despesa" to prevent double counting)
  expenses.forEach((exp) => {
    if (exp.amount <= 0) return;
    const isAutoMaint = exp.description.startsWith('Manutenção:');
    const isAutoTire = exp.description.startsWith('Troca de Pneu');
    if (isAutoMaint || isAutoTire) return;

    if (exp.category === 'pneu_borracharia') {
      const bucket = groupMap.get('pneus_rodagem')!;
      const cost = Math.round(exp.amount);
      const avoided = Math.round(cost * 2.5);
      bucket.preventiveCost += cost;
      bucket.avoidedCorrectiveCost += avoided;
      bucket.estimatedSavings += Math.max(0, avoided - cost);
      bucket.itemsCount += 1;
      realizedItemsCount += 1;
    } else if (exp.category === 'manutencao') {
      const bucket = groupMap.get('cambio_gerais')!;
      const cost = Math.round(exp.amount);
      const avoided = Math.round(cost * 3.2);
      bucket.preventiveCost += cost;
      bucket.avoidedCorrectiveCost += avoided;
      bucket.estimatedSavings += Math.max(0, avoided - cost);
      bucket.itemsCount += 1;
      realizedItemsCount += 1;
    }
  });

  const bySystem = GROUP_ORDER.map((k) => groupMap.get(k)!).filter((b) => b.itemsCount > 0);

  const totalPreventiveCost = bySystem.reduce((acc, g) => acc + g.preventiveCost, 0);
  const totalAvoidedCorrectiveCost = bySystem.reduce((acc, g) => acc + g.avoidedCorrectiveCost, 0);
  const totalEstimatedSavings = bySystem.reduce((acc, g) => acc + g.estimatedSavings, 0);
  const roiRatio =
    totalPreventiveCost > 0
      ? Math.round((totalEstimatedSavings / totalPreventiveCost) * 100) / 100
      : 0;

  const consolidated: MaintenanceSavingsConsolidatedPoint[] = [
    {
      label: 'Preventiva Realizada',
      amount: totalPreventiveCost,
      fill: '#ffb95f',
      description: 'Investimento executado no plano preventivo',
    },
    {
      label: 'Corretiva Evitada (Rodovia)',
      amount: totalAvoidedCorrectiveCost,
      fill: '#38bdf8',
      description: 'Custo estimado de socorro mecânico, guincho e parada na estrada',
    },
    {
      label: 'Economia Líquida Estimada',
      amount: totalEstimatedSavings,
      fill: '#10b981',
      description: 'Saldo positivo economizado ao evitar corretivas em rodovia',
    },
  ];

  return {
    bySystem,
    consolidated,
    summary: {
      totalPreventiveCost,
      totalAvoidedCorrectiveCost,
      totalEstimatedSavings,
      roiRatio,
      realizedItemsCount,
      overdueRiskCount,
      overdueRiskAmount,
    },
  };
}

interface SystemTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MaintenanceSavingsGroupPoint }>;
}

const SystemComparisonTooltip: React.FC<SystemTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;

  return (
    <div className="bg-[#081425] border border-[#475569] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[240px]">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#334155]">
        <span className="font-extrabold text-[#d8e3fb]">{pt.groupLabel}</span>
        <span className="font-mono text-[11px] text-[#94a3b8]">
          {pt.itemsCount} {pt.itemsCount === 1 ? 'serviço' : 'serviços'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 font-mono tabular-nums text-[11px]">
        <span className="text-[#94a3b8]">Preventiva Realizada:</span>
        <span className="text-right font-bold text-[#ffb95f]">
          {formatCurrency(pt.preventiveCost)}
        </span>

        <span className="text-[#94a3b8]">Corretiva em Rodovia:</span>
        <span className="text-right font-bold text-[#38bdf8]">
          {formatCurrency(pt.avoidedCorrectiveCost)} ({pt.multiplier}x)
        </span>

        <span className="text-[#94a3b8]">Economia Estimada:</span>
        <span className="text-right font-black text-[#34d399]">
          {formatCurrency(pt.estimatedSavings)}
        </span>
      </div>

      {pt.overdueCount > 0 && (
        <div className="pt-1.5 border-t border-[#334155] text-[10px] text-[#fca5a5]">
          {pt.overdueCount} {pt.overdueCount === 1 ? 'item vencido' : 'itens vencidos'} neste grupo — renove para manter a proteção.
        </div>
      )}
    </div>
  );
};

interface ConsolidatedTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MaintenanceSavingsConsolidatedPoint }>;
}

const ConsolidatedComparisonTooltip: React.FC<ConsolidatedTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;

  return (
    <div className="bg-[#081425] border border-[#475569] rounded-xl p-3 shadow-2xl text-xs space-y-1 max-w-[260px]">
      <div className="font-extrabold text-[#d8e3fb]">{pt.label}</div>
      <div className="font-mono tabular-nums text-sm font-black" style={{ color: pt.fill }}>
        {formatCurrency(pt.amount)}
      </div>
      <p className="text-[11px] text-[#94a3b8] leading-snug">{pt.description}</p>
    </div>
  );
};

interface MaintenanceSavingsChartProps {
  maintenanceItems: MaintenanceItem[];
  currentOdometer: number;
  expenses?: Expense[];
  onAddNewItem?: () => void;
}

export const MaintenanceSavingsChart: React.FC<MaintenanceSavingsChartProps> = ({
  maintenanceItems,
  currentOdometer,
  expenses = [],
  onAddNewItem,
}) => {
  const [viewMode, setViewMode] = useState<'sistema' | 'consolidado'>('sistema');

  const { bySystem, consolidated, summary } = useMemo(
    () =>
      buildMaintenanceSavingsComparison({
        maintenanceItems,
        currentOdometer,
        expenses,
      }),
    [maintenanceItems, currentOdometer, expenses]
  );

  const formatYAxisCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    }
    return `R$ ${value}`;
  };

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header & View Mode Toggle */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#334155]/80">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#10b981]/50 flex items-center justify-center text-[#34d399] shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-[#d8e3fb]">
              Preventiva Realizada vs. Economia Estimada em Rodovia
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8] mt-0.5">
              <span>{summary.realizedItemsCount} serviços preventivos no histórico</span>
              <span aria-hidden="true">·</span>
              <span>Retorno estimado de {summary.roiRatio.toFixed(2)}x sobre o investido</span>
            </div>
          </div>
        </div>

        {/* Interactive Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-[#081425] rounded-lg border border-[#334155]">
          <button
            type="button"
            onClick={() => setViewMode('sistema')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'sistema'
                ? 'bg-[#1e293b] text-[#ffb95f]'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            Por Sistema
          </button>
          <button
            type="button"
            onClick={() => setViewMode('consolidado')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'consolidado'
                ? 'bg-[#1e293b] text-[#ffb95f]'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            Consolidado
          </button>
        </div>
      </div>

      {/* Summary KPI Strip (unboxed clean divider cells with tabular numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#334155] bg-[#081425] rounded-xl border border-[#334155]">
        <div className="p-3 sm:px-4">
          <div className="text-[11px] font-semibold text-[#94a3b8]">
            Custo Preventivo Realizado
          </div>
          <div className="font-mono tabular-nums text-lg font-black text-[#ffb95f] mt-0.5">
            {formatCurrency(summary.totalPreventiveCost)}
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">
            Trocas e revisões programadas executadas
          </div>
        </div>

        <div className="p-3 sm:px-4">
          <div className="text-[11px] font-semibold text-[#94a3b8]">
            Corretiva Evitada em Rodovia
          </div>
          <div className="font-mono tabular-nums text-lg font-black text-[#38bdf8] mt-0.5">
            {formatCurrency(summary.totalAvoidedCorrectiveCost)}
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">
            Guincho pesado, socorro mecânico e pane evitada
          </div>
        </div>

        <div className="p-3 sm:px-4">
          <div className="text-[11px] font-semibold text-[#94a3b8]">
            Economia Líquida Estimada
          </div>
          <div className="font-mono tabular-nums text-lg font-black text-[#34d399] mt-0.5 flex items-center gap-1.5">
            <span>{formatCurrency(summary.totalEstimatedSavings)}</span>
            <TrendingUp className="w-4 h-4 text-[#10b981] shrink-0" />
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">
            Diferença direta poupada frente à corretiva
          </div>
        </div>
      </div>

      {/* Recharts BarChart or Empty State */}
      {bySystem.length === 0 ? (
        <div className="py-10 px-4 text-center bg-[#081425] rounded-xl border border-dashed border-[#334155] space-y-2.5">
          <ShieldCheck className="w-8 h-8 text-[#64748b] mx-auto" />
          <p className="text-xs font-bold text-[#bec6e0]">
            Nenhuma manutenção preventiva realizada registrada para comparação ainda.
          </p>
          <p className="text-[11px] text-[#94a3b8] max-w-md mx-auto">
            Registre uma revisão realizada pelo botão &ldquo;Fiz a Troca&rdquo; ou cadastre um novo item preventivo para comparar o investimento contra o custo de quebra em rodovia.
          </p>
          {onAddNewItem && (
            <button
              type="button"
              onClick={onAddNewItem}
              className="mt-1 px-4 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-xs cursor-pointer transition-colors"
            >
              Cadastrar Primeiro Item
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="w-full h-64 sm:h-72 bg-[#081425] rounded-xl border border-[#334155]/80 p-2 sm:p-3">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'sistema' ? (
                <BarChart
                  data={bySystem}
                  margin={{ top: 14, right: 16, left: 4, bottom: 4 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="groupLabel"
                    stroke="#94a3b8"
                    tick={{ fill: '#cbd5e1', fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={formatYAxisCurrency}
                  />
                  <Tooltip
                    content={<SystemComparisonTooltip />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#bec6e0' }}
                  />
                  <Bar
                    dataKey="preventiveCost"
                    name="Custo Preventivo Realizado (R$)"
                    fill="#ffb95f"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="estimatedSavings"
                    name="Economia Estimada em Rodovia (R$)"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={consolidated}
                  margin={{ top: 14, right: 20, left: 8, bottom: 4 }}
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
                    tickFormatter={formatYAxisCurrency}
                  />
                  <Tooltip
                    content={<ConsolidatedComparisonTooltip />}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Bar
                    dataKey="amount"
                    name="Valor Consolidado (R$)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={72}
                  >
                    {consolidated.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Footer Context & Overdue Exposure Warning */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94a3b8]">
            {summary.overdueRiskCount > 0 ? (
              <div className="flex items-center gap-1.5 text-[#fca5a5] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                <span>
                  Atenção: {summary.overdueRiskCount}{' '}
                  {summary.overdueRiskCount === 1 ? 'item vencido expõe' : 'itens vencidos expõem'}{' '}
                  a frota a risco de corretiva em rodovia estimado em{' '}
                  <strong className="font-mono tabular-nums text-[#ffb4ab]">
                    {formatCurrency(summary.overdueRiskAmount)}
                  </strong>
                  .
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                <span>
                  Baseado em fatores médios de reparo emergencial rodoviário (2,5x a 3,4x sobre o custo preventivo).
                </span>
              </div>
            )}

            <span className="font-mono text-[10px] text-[#64748b]">
              Passe o cursor ou toque nas barras para detalhar valores
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
