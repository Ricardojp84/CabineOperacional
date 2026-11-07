import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Expense, ExpenseCategory, Trip } from '../types/cockpit';
import { formatCurrency } from '../utils/formatters';
import {
  BarChart3,
  TrendingDown,
  Fuel,
  CreditCard,
  Wrench,
  Utensils,
  Truck,
  Sparkles,
  PieChart as PieIcon,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface ExpenseDashboardProps {
  trip: Trip;
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
}

interface CategoryConfig {
  key: string;
  label: string;
  shortLabel: string;
  color: string;
  hoverColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  combustivel: {
    key: 'combustivel',
    label: 'Combustível & Arla',
    shortLabel: 'Diesel/Arla',
    color: '#f59e0b', // Amber
    hoverColor: '#fbbf24',
    icon: Fuel,
  },
  pedagio: {
    key: 'pedagio',
    label: 'Pedágios',
    shortLabel: 'Pedágio',
    color: '#06b6d4', // Cyan
    hoverColor: '#22d3ee',
    icon: CreditCard,
  },
  manutencao: {
    key: 'manutencao',
    label: 'Manutenção Mecânica',
    shortLabel: 'Oficina',
    color: '#ef4444', // Red
    hoverColor: '#f87171',
    icon: Wrench,
  },
  pneu_borracharia: {
    key: 'pneu_borracharia',
    label: 'Pneus & Borracharia',
    shortLabel: 'Pneus',
    color: '#ec4899', // Pink
    hoverColor: '#f472b6',
    icon: Truck,
  },
  alimentacao: {
    key: 'alimentacao',
    label: 'Alimentação & Diárias',
    shortLabel: 'Alimentação',
    color: '#10b981', // Emerald
    hoverColor: '#34d399',
    icon: Utensils,
  },
  outros: {
    key: 'outros',
    label: 'Outras Despesas (Chapa/Estac.)',
    shortLabel: 'Outros',
    color: '#8b5cf6', // Purple
    hoverColor: '#a78bfa',
    icon: Sparkles,
  },
};

export const ExpenseDashboard: React.FC<ExpenseDashboardProps> = ({
  trip,
  selectedCategory,
  onSelectCategory,
}) => {
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');

  // Group and aggregate expenses
  const { chartData, totalExpenses, maxCategory, countTotal } = useMemo(() => {
    const aggregates: Record<string, { total: number; count: number }> = {
      combustivel: { total: 0, count: 0 },
      pedagio: { total: 0, count: 0 },
      manutencao: { total: 0, count: 0 },
      pneu_borracharia: { total: 0, count: 0 },
      alimentacao: { total: 0, count: 0 },
      outros: { total: 0, count: 0 },
    };

    let total = 0;
    let count = 0;

    trip.expenses.forEach((exp: Expense) => {
      total += exp.amount;
      count += 1;

      // Map categories
      let catKey = 'outros';
      if (exp.category === 'combustivel' || exp.category === 'arla') {
        catKey = 'combustivel';
      } else if (exp.category === 'pedagio') {
        catKey = 'pedagio';
      } else if (exp.category === 'manutencao') {
        catKey = 'manutencao';
      } else if (exp.category === 'pneu_borracharia') {
        catKey = 'pneu_borracharia';
      } else if (exp.category === 'alimentacao') {
        catKey = 'alimentacao';
      }

      aggregates[catKey].total += exp.amount;
      aggregates[catKey].count += 1;
    });

    let data = Object.keys(aggregates).map((key) => {
      const config = CATEGORY_CONFIGS[key];
      const catTotal = aggregates[key].total;
      const percent = total > 0 ? (catTotal / total) * 100 : 0;
      return {
        key,
        name: config.shortLabel,
        fullName: config.label,
        total: Math.round(catTotal * 100) / 100,
        count: aggregates[key].count,
        percent: Math.round(percent * 10) / 10,
        color: config.color,
        hoverColor: config.hoverColor,
      };
    });

    if (sortBy === 'value') {
      data = data.sort((a, b) => b.total - a.total);
    } else {
      data = data.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Find highest category
    const highest = [...data].sort((a, b) => b.total - a.total)[0];

    return {
      chartData: data,
      totalExpenses: total,
      maxCategory: highest && highest.total > 0 ? highest : null,
      countTotal: count,
    };
  }, [trip.expenses, sortBy]);

  // Cost per KM calculation
  const costPerKm = trip.totalDistanceKm > 0 ? totalExpenses / trip.totalDistanceKm : 0;
  const avgPerExpense = countTotal > 0 ? totalExpenses / countTotal : 0;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b1322] border border-[#334155] rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[190px]">
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-[#334155]/60">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-xs font-extrabold text-[#d8e3fb] truncate">
              {data.fullName}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-[#94a3b8]">
              <span>Gasto Total:</span>
              <span className="font-mono font-black text-sm text-[#ffb95f]">
                {formatCurrency(data.total)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#94a3b8]">
              <span>Participação:</span>
              <span className="font-mono font-bold text-[#38bdf8]">
                {data.percent}%
              </span>
            </div>
            <div className="flex justify-between items-center text-[#94a3b8]">
              <span>Lançamentos:</span>
              <span className="font-mono text-[#d8e3fb] font-semibold">
                {data.count} {data.count === 1 ? 'recibo' : 'recibos'}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-[#334155]/60 text-[10px] text-amber-400/80 font-medium text-center">
            Clique na barra para filtrar no extrato
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-b from-[#152031] to-[#1e293b] border-b border-[#334155] p-4 md:p-5">
      {/* Header of Dashboard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#f59e0b]/15 border border-[#f59e0b]/30 rounded-lg text-[#f59e0b]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#d8e3fb]">
              Painel Financeiro da Rota Ativa
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#081425] text-[#38bdf8] border border-[#334155]">
              Recharts Analytics
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8] mt-1">
            Distribuição dos custos operacionais por centro de despesa em tempo real
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => setSortBy((prev) => (prev === 'value' ? 'name' : 'value'))}
            className="h-8 px-2.5 rounded-lg bg-[#081425] hover:bg-[#243248] text-[#bec6e0] hover:text-[#ffb95f] border border-[#334155] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Alternar Ordenação"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortBy === 'value' ? 'Maior Valor' : 'Alfabética'}</span>
          </button>

          {selectedCategory && selectedCategory !== 'todos' && (
            <button
              onClick={() => onSelectCategory('todos')}
              className="h-8 px-2.5 rounded-lg bg-amber-500/20 text-[#ffb95f] border border-[#f59e0b]/50 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <Filter className="w-3 h-3" />
              <span>Limpar Filtro</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        <div className="bg-[#081425]/80 border border-[#334155] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
            <PieIcon className="w-3.5 h-3.5 text-[#f59e0b]" />
            Total Lançado
          </span>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-mono font-black text-[#d8e3fb]">
              {formatCurrency(totalExpenses)}
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              {countTotal} {countTotal === 1 ? 'registro efetuado' : 'registros efetuados'}
            </div>
          </div>
        </div>

        <div className="bg-[#081425]/80 border border-[#334155] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-[#38bdf8]" />
            Custo / KM Estimado
          </span>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-mono font-black text-[#38bdf8]">
              {costPerKm > 0 ? `R$ ${costPerKm.toFixed(2)}` : 'R$ 0,00'}
              <span className="text-xs font-sans text-[#94a3b8] font-normal"> /km</span>
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              Sobre {Math.round(trip.totalDistanceKm)} km da viagem
            </div>
          </div>
        </div>

        <div className="bg-[#081425]/80 border border-[#334155] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5 text-[#f59e0b]" />
            Maior Centro de Custo
          </span>
          <div className="mt-1">
            <div className="text-base md:text-lg font-bold text-[#ffb95f] truncate">
              {maxCategory ? maxCategory.fullName : 'Sem despesas'}
            </div>
            <div className="text-[11px] text-[#94a3b8] font-mono">
              {maxCategory ? `${formatCurrency(maxCategory.total)} (${maxCategory.percent}%)` : '—'}
            </div>
          </div>
        </div>

        <div className="bg-[#081425]/80 border border-[#334155] rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-[#10b981]" />
            Média por Recibo
          </span>
          <div className="mt-1">
            <div className="text-lg md:text-xl font-mono font-black text-[#10b981]">
              {formatCurrency(avgPerExpense)}
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              Ticket médio operacional
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="bg-[#081425] border border-[#334155] rounded-xl p-3 md:p-4">
        <div className="flex items-center justify-between mb-3 text-xs text-[#94a3b8]">
          <span className="font-semibold text-[#d8e3fb] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
            Comparativo de Gastos por Categoria (R$)
          </span>
          <span className="text-[11px] text-[#94a3b8]">
            Toque numa coluna para filtrar o extrato
          </span>
        </div>

        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length) {
                  const clickedKey = state.activePayload[0].payload.key;
                  onSelectCategory(
                    selectedCategory === clickedKey ? 'todos' : clickedKey
                  );
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#334155"
                opacity={0.4}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#bec6e0' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={{ stroke: '#334155' }}
                tickFormatter={(val) => (val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`)}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(51, 65, 85, 0.35)' }}
              />
              <Bar
                dataKey="total"
                radius={[6, 6, 0, 0]}
                className="cursor-pointer transition-all duration-300"
              >
                {chartData.map((entry) => {
                  const isSelected =
                    selectedCategory === entry.key ||
                    (selectedCategory === 'combustivel' && entry.key === 'combustivel') ||
                    (selectedCategory === 'pedagio' && entry.key === 'pedagio') ||
                    (selectedCategory === 'manutencao' && entry.key === 'manutencao') ||
                    (selectedCategory === 'pneu_borracharia' && entry.key === 'pneu_borracharia') ||
                    (selectedCategory === 'alimentacao' && entry.key === 'alimentacao');

                  const isAnySelected = selectedCategory && selectedCategory !== 'todos';
                  const opacity = isAnySelected ? (isSelected ? 1 : 0.35) : 0.9;

                  return (
                    <Cell
                      key={`cell-${entry.key}`}
                      fill={entry.color}
                      opacity={opacity}
                      stroke={isSelected ? '#ffffff' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Category Filter Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-3 border-t border-[#334155]/70">
          {chartData.map((item) => {
            const isSelected =
              selectedCategory === item.key ||
              (selectedCategory === 'combustivel' && item.key === 'combustivel') ||
              (selectedCategory === 'pedagio' && item.key === 'pedagio') ||
              (selectedCategory === 'manutencao' && item.key === 'manutencao') ||
              (selectedCategory === 'pneu_borracharia' && item.key === 'pneu_borracharia') ||
              (selectedCategory === 'alimentacao' && item.key === 'alimentacao');

            return (
              <button
                key={item.key}
                onClick={() =>
                  onSelectCategory(isSelected ? 'todos' : item.key)
                }
                className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#243248] border-[#f59e0b] shadow-md ring-1 ring-[#f59e0b]/40'
                    : 'bg-[#0f172a]/60 hover:bg-[#1e293b] border-[#334155]/60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] font-bold text-[#d8e3fb] truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-mono font-bold text-xs text-[#ffb95f]">
                    {formatCurrency(item.total)}
                  </span>
                  <span className="text-[10px] font-semibold text-[#94a3b8]">
                    {item.percent}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
