import React, { useState, useEffect, useMemo } from 'react';
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
  ReferenceLine,
} from 'recharts';
import {
  fetchAnnualProfitReport,
  seedCompletedTripsToSupabase,
  AnnualReportSummary,
  MonthlyProfitData,
} from '../services/annualReportService';
import { checkIsConfigured } from '../lib/supabase';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import {
  BarChart3,
  TrendingUp,
  Wallet,
  DollarSign,
  Fuel,
  Receipt,
  Truck,
  RotateCw,
  X,
  FileSpreadsheet,
  Download,
  Database,
  CloudCheck,
  CheckCircle2,
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { User } from '../types/cockpit';
import { withAdminPermission } from '../middlewares/permissionMiddleware';

interface AnnualProfitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupabaseConfig?: () => void;
  currentUser?: User | null;
}

type ChartViewMode = 'lucro' | 'comparativo' | 'margem';

const AnnualProfitReportModalContent: React.FC<AnnualProfitReportModalProps> = ({
  isOpen,
  onClose,
  onOpenSupabaseConfig,
}) => {
  const [report, setReport] = useState<AnnualReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);
  const [viewMode, setChartViewMode] = useState<ChartViewMode>('lucro');
  const [selectedMonth, setSelectedMonth] = useState<MonthlyProfitData | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAnnualProfitReport();
      setReport(data);
      if (data.monthlyBreakdown.length > 0) {
        // Default selected month to the most recent month with activity
        const active = [...data.monthlyBreakdown].reverse().find((m) => m.tripCount > 0);
        setSelectedMonth(active || data.monthlyBreakdown[data.monthlyBreakdown.length - 1]);
      }
    } catch (err) {
      console.error('Falha ao carregar relatório anual:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSeedSupabase = async () => {
    playCockpitClick();
    setIsSeeding(true);
    setSeedNotice(null);
    try {
      const res = await seedCompletedTripsToSupabase();
      if (res.success) {
        playSuccessChime();
        setSeedNotice(res.message);
        await loadData();
      } else {
        setSeedNotice(res.message);
      }
    } catch (err: any) {
      setSeedNotice(err?.message || 'Erro ao sincronizar viagens');
    } finally {
      setIsSeeding(false);
      setTimeout(() => setSeedNotice(null), 8000);
    }
  };

  const handleExportCsv = () => {
    playCockpitClick();
    if (!report) return;

    const headers = [
      'Mês/Ano',
      'Nome Mês',
      'Viagens Finalizadas',
      'KM Total Rodado',
      'Frete Bruto (R$)',
      'Despesas Totais (R$)',
      'Combustível/Arla (R$)',
      'Pedágios (R$)',
      'Outras Despesas (R$)',
      'Lucro Líquido (R$)',
      'Margem de Lucro (%)',
      'Lucro por KM (R$/km)',
    ];

    const rows = report.monthlyBreakdown.map((m) => [
      m.monthLabel,
      m.monthName,
      m.tripCount,
      m.totalDistanceKm,
      m.grossFreight.toFixed(2),
      m.totalExpenses.toFixed(2),
      m.fuelExpenses.toFixed(2),
      m.tollExpenses.toFixed(2),
      m.otherExpenses.toFixed(2),
      m.netProfit.toFixed(2),
      m.profitMarginPct.toFixed(2),
      m.profitPerKm.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_lucro_anual_cabine_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyProfitData = payload[0].payload;
      return (
        <div className="bg-[#081425]/95 backdrop-blur-md border border-[#475569] p-3.5 rounded-xl shadow-2xl text-xs min-w-[210px] space-y-1.5 z-50">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#334155]">
            <span className="font-extrabold text-[#d8e3fb] text-sm flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ffb95f]" />
              {data.monthName}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#94a3b8]">
              {data.tripCount} {data.tripCount === 1 ? 'viagem' : 'viagens'}
            </span>
          </div>

          <div className="space-y-1 pt-1 font-mono text-[11px]">
            <div className="flex items-center justify-between text-[#d8e3fb]">
              <span className="text-[#94a3b8]">Frete Bruto:</span>
              <span className="font-bold">{formatCurrency(data.grossFreight)}</span>
            </div>
            <div className="flex items-center justify-between text-[#f87171]">
              <span className="text-[#94a3b8]">Despesas Operacionais:</span>
              <span className="font-bold">- {formatCurrency(data.totalExpenses)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#334155]/60 text-sm font-extrabold">
              <span className="text-[#94a3b8]">Lucro Líquido:</span>
              <span className={data.netProfit >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                {formatCurrency(data.netProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#4edea3]">
              <span className="text-[#94a3b8]">Margem de Lucro:</span>
              <span className="font-bold">{data.profitMarginPct}%</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#bec6e0] pt-0.5">
              <span className="text-[#94a3b8]">Distância & Média:</span>
              <span>{formatKm(data.totalDistanceKm)} • R$ {data.profitPerKm.toFixed(2)}/km</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = report?.monthlyBreakdown || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-[#334155] rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Cockpit Modal Header */}
        <div className="sticky top-0 z-20 bg-[#081425]/95 backdrop-blur-md border-b border-[#334155] p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#003824] border border-[#10b981]/50 flex items-center justify-center text-[#10b981] shadow-lg shadow-emerald-950/40 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#d8e3fb] tracking-tight">
                  Lucro Mensal do Último Ano
                </h2>
                {report?.dataSource === 'supabase' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#003824] text-[#4edea3] border border-[#10b981]/40">
                    <Database className="w-3 h-3 text-[#10b981]" />
                    Supabase Nuvem
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/40">
                    <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                    Base Operacional
                  </span>
                )}
              </div>
              <p className="text-xs text-[#94a3b8]">
                Agregação financeira de viagens finalizadas via Supabase com gráfico de barras Recharts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="hidden sm:flex h-9 px-3 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-xs font-bold text-[#d8e3fb] items-center gap-1.5 transition-colors cursor-pointer"
              title="Exportar planilha CSV do fechamento anual"
            >
              <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => {
                playCockpitClick();
                loadData();
              }}
              disabled={isLoading}
              className="h-9 px-3 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Recarregar dados do Supabase"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#ffb95f] ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Atualizar</span>
            </button>

            <button
              onClick={() => {
                playCockpitClick();
                onClose();
              }}
              className="w-9 h-9 rounded-lg bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] hover:text-[#d8e3fb] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* Supabase Status / Notice Bar */}
          {seedNotice && (
            <div className="p-3 rounded-xl bg-[#032e22] border border-[#10b981] text-[#4edea3] text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                <span>{seedNotice}</span>
              </div>
              <button
                onClick={() => setSeedNotice(null)}
                className="text-[#94a3b8] hover:text-[#d8e3fb] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Annual KPI Cards */}
          {report && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Lucro Líquido Anual Total */}
              <div className="bg-[#152031] border border-[#334155] rounded-xl p-3.5 sm:p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-bl-full pointer-events-none" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Lucro Líquido Anual
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#003824] text-[#10b981] border border-[#10b981]/30">
                    +{report.overallProfitMarginPct}% margem
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#10b981] tracking-tight">
                  {formatCurrency(report.totalNetProfit)}
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1 flex items-center justify-between">
                  <span>Média Mensal:</span>
                  <span className="font-mono font-bold text-[#d8e3fb]">
                    {formatCurrency(report.averageMonthlyProfit)}/mês
                  </span>
                </div>
              </div>

              {/* Card 2: Faturamento Bruto Anual */}
              <div className="bg-[#152031] border border-[#334155] rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Receita Bruta (Fretes)
                  </span>
                  <Wallet className="w-4 h-4 text-[#ffb95f]" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#ffb95f] tracking-tight">
                  {formatCurrency(report.totalGrossFreight)}
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1 flex items-center justify-between">
                  <span>Despesas Totais:</span>
                  <span className="font-mono font-bold text-[#f87171]">
                    {formatCurrency(report.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* Card 3: Viagens Finalizadas & Quilometragem */}
              <div className="bg-[#152031] border border-[#334155] rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Viagens Finalizadas
                  </span>
                  <Truck className="w-4 h-4 text-[#38bdf8]" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#38bdf8] tracking-tight">
                  {report.totalCompletedTrips}{' '}
                  <span className="text-xs text-[#94a3b8] font-normal">viagens</span>
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1 flex items-center justify-between">
                  <span>Distância Total:</span>
                  <span className="font-mono font-bold text-[#bec6e0]">
                    {formatKm(report.totalDistanceKm)}
                  </span>
                </div>
              </div>

              {/* Card 4: Rentabilidade por Quilômetro */}
              <div className="bg-[#152031] border border-[#334155] rounded-xl p-3.5 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">
                    Lucro Médio por KM
                  </span>
                  <TrendingUp className="w-4 h-4 text-[#4edea3]" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#4edea3] tracking-tight">
                  R$ {report.averageProfitPerKm.toFixed(2)}{' '}
                  <span className="text-xs text-[#94a3b8] font-normal">/km</span>
                </div>
                <div className="text-[11px] text-[#94a3b8] mt-1 flex items-center justify-between">
                  <span>Melhor Mês:</span>
                  <span className="font-mono font-bold text-[#10b981]">
                    {report.bestMonth ? `${report.bestMonth.monthLabel}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Chart Section Header with View Modes */}
          <div className="bg-[#152031] border border-[#334155] rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#334155]/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                <h3 className="text-sm font-black text-[#d8e3fb] uppercase tracking-wide">
                  Evolução do Lucro nos Últimos 12 Meses
                </h3>
              </div>

              {/* Chart Mode Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-[#081425] rounded-xl border border-[#334155]">
                <button
                  onClick={() => {
                    playCockpitClick();
                    setChartViewMode('lucro');
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'lucro'
                      ? 'bg-[#10b981] text-[#081425] font-black shadow-xs'
                      : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Lucro Líquido</span>
                </button>

                <button
                  onClick={() => {
                    playCockpitClick();
                    setChartViewMode('comparativo');
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'comparativo'
                      ? 'bg-[#ffb95f] text-[#081425] font-black shadow-xs'
                      : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Frete x Despesas x Lucro</span>
                </button>

                <button
                  onClick={() => {
                    playCockpitClick();
                    setChartViewMode('margem');
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'margem'
                      ? 'bg-[#38bdf8] text-[#081425] font-black shadow-xs'
                      : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>Margem %</span>
                </button>
              </div>
            </div>

            {/* Recharts Bar Chart Container */}
            <div className="w-full h-80 sm:h-96">
              {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#94a3b8]">
                  <RotateCw className="w-8 h-8 text-[#10b981] animate-spin" />
                  <span className="text-xs">Consultando viagens finalizadas no Supabase...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#94a3b8]">
                  <AlertCircle className="w-8 h-8 text-[#ffb95f]" />
                  <span className="text-xs">Nenhuma viagem finalizada encontrada no período.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 15, left: 10, bottom: 25 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload[0]) {
                        setSelectedMonth(data.activePayload[0].payload);
                        playCockpitClick();
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(val) => {
                        if (viewMode === 'margem') return `${val}%`;
                        return `R$ ${(val / 1000).toFixed(0)}k`;
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#475569" />

                    {viewMode === 'lucro' && (
                      <Bar
                        dataKey="netProfit"
                        name="Lucro Líquido"
                        radius={[6, 6, 0, 0]}
                        animationDuration={800}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              selectedMonth?.monthKey === entry.monthKey
                                ? '#34d399'
                                : entry.netProfit >= 0
                                ? '#10b981'
                                : '#ef4444'
                            }
                            stroke={selectedMonth?.monthKey === entry.monthKey ? '#ffffff' : 'transparent'}
                            strokeWidth={1.5}
                          />
                        ))}
                      </Bar>
                    )}

                    {viewMode === 'comparativo' && (
                      <>
                        <Legend
                          verticalAlign="top"
                          height={36}
                          wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                        />
                        <Bar
                          dataKey="grossFreight"
                          name="Frete Bruto"
                          fill="#ffb95f"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="totalExpenses"
                          name="Despesas Totais"
                          fill="#f87171"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="netProfit"
                          name="Lucro Líquido"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </>
                    )}

                    {viewMode === 'margem' && (
                      <>
                        <ReferenceLine
                          y={25}
                          stroke="#ffb95f"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Meta Margem 25%',
                            fill: '#ffb95f',
                            fontSize: 10,
                            position: 'top',
                          }}
                        />
                        <Bar
                          dataKey="profitMarginPct"
                          name="Margem de Lucro %"
                          fill="#38bdf8"
                          radius={[6, 6, 0, 0]}
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-margin-${index}`}
                              fill={entry.profitMarginPct >= 25 ? '#10b981' : '#38bdf8'}
                            />
                          ))}
                        </Bar>
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick Chart Guide / Legend */}
            <div className="mt-3 pt-3 border-t border-[#334155]/60 flex flex-wrap items-center justify-between text-[11px] text-[#94a3b8] gap-2">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#38bdf8]" />
                Clique em uma barra do gráfico para detalhar o mês selecionado abaixo.
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[#10b981]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  Lucro Positivo
                </span>
                <span className="flex items-center gap-1.5 text-[#ffb95f]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffb95f]" />
                  Frete Bruto
                </span>
                <span className="flex items-center gap-1.5 text-[#f87171]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" />
                  Custos (Diesel/Pedágio)
                </span>
              </div>
            </div>
          </div>

          {/* Drill-down of Selected Month */}
          {selectedMonth && (
            <div className="bg-[#152031] border border-[#334155] rounded-xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-[#334155]/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#ffb95f]" />
                  <h4 className="font-extrabold text-[#d8e3fb] text-sm">
                    Detalhamento do Mês: <span className="text-[#ffb95f]">{selectedMonth.monthName}</span>
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#94a3b8]">Viagens: {selectedMonth.tripCount}</span>
                  <span>•</span>
                  <span className="text-[#4edea3]">Margem: {selectedMonth.profitMarginPct}%</span>
                  <span>•</span>
                  <span className="text-[#38bdf8]">{formatKm(selectedMonth.totalDistanceKm)} rodados</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                <div className="bg-[#081425] p-3 rounded-xl border border-[#334155]">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Frete Bruto</div>
                  <div className="text-base font-black font-mono text-[#ffb95f]">
                    {formatCurrency(selectedMonth.grossFreight)}
                  </div>
                </div>

                <div className="bg-[#081425] p-3 rounded-xl border border-[#334155]">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Diesel & Arla</div>
                  <div className="text-base font-black font-mono text-[#f87171]">
                    {formatCurrency(selectedMonth.fuelExpenses)}
                  </div>
                </div>

                <div className="bg-[#081425] p-3 rounded-xl border border-[#334155]">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Pedágios & Outros</div>
                  <div className="text-base font-black font-mono text-[#f87171]">
                    {formatCurrency(selectedMonth.tollExpenses + selectedMonth.otherExpenses)}
                  </div>
                </div>

                <div className="bg-[#081425] p-3 rounded-xl border border-[#10b981]/40">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Lucro Líquido no Bolso</div>
                  <div className="text-base font-black font-mono text-[#10b981]">
                    {formatCurrency(selectedMonth.netProfit)}
                  </div>
                </div>
              </div>

              {/* Trips in this month */}
              {selectedMonth.tripsSummary.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-[#94a3b8] uppercase">
                    Rotas Concluídas em {selectedMonth.monthLabel}:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedMonth.tripsSummary.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-[#081425] border border-[#334155] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#d8e3fb]">{t.origin} ➔ {t.destination}</div>
                          <div className="text-[11px] text-[#94a3b8]">{t.cargo}</div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-[11px] text-[#94a3b8]">Bruto: {formatCurrency(t.grossFreight)}</div>
                          <div className="font-extrabold text-[#10b981]">Lucro: {formatCurrency(t.profit)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monthly Breakdown Table */}
          <div className="bg-[#152031] border border-[#334155] rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-extrabold text-sm text-[#d8e3fb] uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#38bdf8]" />
                Tabela Consolidada dos 12 Meses
              </h4>
              <button
                onClick={handleExportCsv}
                className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Planilha
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#334155] text-[#94a3b8] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mês</th>
                    <th className="py-2.5 px-2 text-center">Viagens</th>
                    <th className="py-2.5 px-3 text-right">KM Total</th>
                    <th className="py-2.5 px-3 text-right">Frete Bruto</th>
                    <th className="py-2.5 px-3 text-right">Despesas</th>
                    <th className="py-2.5 px-3 text-right">Lucro Líquido</th>
                    <th className="py-2.5 px-3 text-right">Margem</th>
                    <th className="py-2.5 px-3 text-right">R$/km</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]/50">
                  {chartData.map((m) => (
                    <tr
                      key={m.monthKey}
                      onClick={() => {
                        setSelectedMonth(m);
                        playCockpitClick();
                      }}
                      className={`hover:bg-[#1e293b] cursor-pointer transition-colors ${
                        selectedMonth?.monthKey === m.monthKey ? 'bg-[#1e293b]/80' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-sans font-bold text-[#d8e3fb]">
                        {m.monthName}
                      </td>
                      <td className="py-2 px-2 text-center text-[#bec6e0]">
                        {m.tripCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#081425] border border-[#334155]">
                            {m.tripCount}
                          </span>
                        ) : (
                          <span className="text-[#64748b]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-[#bec6e0]">
                        {m.totalDistanceKm > 0 ? formatKm(m.totalDistanceKm) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-[#ffb95f] font-bold">
                        {m.grossFreight > 0 ? formatCurrency(m.grossFreight) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-[#f87171]">
                        {m.totalExpenses > 0 ? formatCurrency(m.totalExpenses) : '-'}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-black ${
                          m.netProfit > 0
                            ? 'text-[#10b981]'
                            : m.netProfit < 0
                            ? 'text-[#ef4444]'
                            : 'text-[#64748b]'
                        }`}
                      >
                        {m.netProfit !== 0 ? formatCurrency(m.netProfit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-[#4edea3]">
                        {m.grossFreight > 0 ? `${m.profitMarginPct}%` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-[#38bdf8]">
                        {m.totalDistanceKm > 0 ? `R$ ${m.profitPerKm.toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {report && (
                  <tfoot>
                    <tr className="border-t-2 border-[#475569] font-black bg-[#081425] text-xs">
                      <td className="py-2.5 px-3 text-[#d8e3fb]">TOTAL ANUAL</td>
                      <td className="py-2.5 px-2 text-center text-[#bec6e0]">{report.totalCompletedTrips}</td>
                      <td className="py-2.5 px-3 text-right text-[#bec6e0]">{formatKm(report.totalDistanceKm)}</td>
                      <td className="py-2.5 px-3 text-right text-[#ffb95f]">{formatCurrency(report.totalGrossFreight)}</td>
                      <td className="py-2.5 px-3 text-right text-[#f87171]">{formatCurrency(report.totalExpenses)}</td>
                      <td className="py-2.5 px-3 text-right text-[#10b981] text-sm">{formatCurrency(report.totalNetProfit)}</td>
                      <td className="py-2.5 px-3 text-right text-[#4edea3]">{report.overallProfitMarginPct}%</td>
                      <td className="py-2.5 px-3 text-right text-[#38bdf8]">R$ {report.averageProfitPerKm.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Supabase Cloud Actions & Sync Assistance */}
          <div className="bg-[#081425] border border-[#334155] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#003824] border border-[#10b981]/40 flex items-center justify-center text-[#10b981] shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#d8e3fb]">
                  Sincronização com Supabase (PostgreSQL)
                </div>
                <div className="text-[11px] text-[#94a3b8]">
                  {checkIsConfigured()
                    ? 'Conexão ativa. Você pode semear viagens históricas para alimentar seus relatórios na nuvem.'
                    : 'Configure o Supabase no botão de nuvem para persistir suas rotas e despesas automaticamente.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {checkIsConfigured() ? (
                <button
                  type="button"
                  onClick={handleSeedSupabase}
                  disabled={isSeeding}
                  className="w-full sm:w-auto h-9 px-3 rounded-lg bg-[#032e22] hover:bg-[#064e3b] border border-[#10b981]/50 text-[#34d399] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Salvar histórico de 12 meses de viagens finalizadas no seu banco Supabase"
                >
                  <CloudCheck className={`w-4 h-4 ${isSeeding ? 'animate-bounce' : ''}`} />
                  <span>{isSeeding ? 'Sincronizando...' : 'Gravar Histórico no Supabase'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    onClose();
                    if (onOpenSupabaseConfig) onOpenSupabaseConfig();
                  }}
                  className="w-full sm:w-auto h-9 px-3 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#34d399] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-4 h-4 text-[#34d399]" />
                  <span>Configurar Supabase</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#081425] border-t border-[#334155] p-3 sm:p-4 flex items-center justify-between text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>Biblioteca de visualização: <strong className="text-[#d8e3fb]">Recharts v3</strong></span>
          </div>

          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-[#1e293b] hover:bg-[#243248] text-[#d8e3fb] font-bold text-xs cursor-pointer transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};

export const AnnualProfitReportModal = withAdminPermission(AnnualProfitReportModalContent, {
  resourceTitle: 'Relatório Financeiro & Lucro Anual',
});
