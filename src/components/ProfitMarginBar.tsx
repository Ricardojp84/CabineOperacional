import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { Fuel, Receipt, Wrench, PiggyBank, ShieldCheck } from 'lucide-react';

interface ProfitMarginBarProps {
  grossFreight: number;
  dieselTotal: number;
  tollTotal: number;
  otherExpensesTotal: number;
  estimatedMaintenance: number;
  netProfit: number;
}

export const ProfitMarginBar: React.FC<ProfitMarginBarProps> = ({
  grossFreight,
  dieselTotal,
  tollTotal,
  otherExpensesTotal,
  estimatedMaintenance,
  netProfit,
}) => {
  const safeGross = Math.max(grossFreight, 1);

  const dieselPct = Math.min(100, Math.max(0, (dieselTotal / safeGross) * 100));
  const tollPct = Math.min(100, Math.max(0, (tollTotal / safeGross) * 100));
  const otherPct = Math.min(100, Math.max(0, (otherExpensesTotal / safeGross) * 100));
  const maintPct = Math.min(100, Math.max(0, (estimatedMaintenance / safeGross) * 100));
  const profitPct = Math.max(0, (netProfit / safeGross) * 100);

  const isProfitPositive = netProfit > 0;

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#4edea3]" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#d8e3fb]">
            Composição do Frete & Lucro Líquido
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#94a3b8] font-medium">Margem Líquida:</span>
          <span
            className={`font-mono text-base font-extrabold px-2.5 py-0.5 rounded-md ${
              isProfitPositive ? 'bg-[#003824] text-[#10b981]' : 'bg-[#690005] text-[#ffb4ab]'
            }`}
          >
            {profitPct.toFixed(1)}% ({formatCurrency(netProfit)})
          </span>
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-5 bg-[#0f172a] rounded-lg overflow-hidden flex p-0.5 gap-0.5 border border-[#334155]">
        {dieselPct > 0 && (
          <div
            style={{ width: `${dieselPct}%` }}
            className="h-full bg-[#f59e0b] rounded-l-md transition-all duration-300 relative group"
            title={`Diesel/Arla: ${dieselPct.toFixed(1)}%`}
          />
        )}
        {tollPct > 0 && (
          <div
            style={{ width: `${tollPct}%` }}
            className="h-full bg-[#ffb95f] transition-all duration-300 relative group"
            title={`Pedágio: ${tollPct.toFixed(1)}%`}
          />
        )}
        {otherPct > 0 && (
          <div
            style={{ width: `${otherPct}%` }}
            className="h-full bg-[#ea580c] transition-all duration-300 relative group"
            title={`Despesas Estrada: ${otherPct.toFixed(1)}%`}
          />
        )}
        {maintPct > 0 && (
          <div
            style={{ width: `${maintPct}%` }}
            className="h-full bg-[#798098] transition-all duration-300 relative group"
            title={`Provisão Pneus/Manutenção: ${maintPct.toFixed(1)}%`}
          />
        )}
        {profitPct > 0 && (
          <div
            style={{ width: `${Math.min(100 - (dieselPct + tollPct + otherPct + maintPct), profitPct)}%` }}
            className="h-full bg-[#10b981] rounded-r-md transition-all duration-300 relative group shadow-sm shadow-emerald-500/50"
            title={`Lucro no Bolso: ${profitPct.toFixed(1)}%`}
          />
        )}
      </div>

      {/* Legend Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-[#334155]/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#f59e0b] shrink-0" />
          <div className="truncate">
            <div className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1">
              <Fuel className="w-3 h-3 text-[#f59e0b]" /> Diesel/Arla ({dieselPct.toFixed(0)}%)
            </div>
            <div className="font-mono text-xs font-bold text-[#d8e3fb]">
              {formatCurrency(dieselTotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#ffb95f] shrink-0" />
          <div className="truncate">
            <div className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1">
              <Receipt className="w-3 h-3 text-[#ffb95f]" /> Pedágio ({tollPct.toFixed(0)}%)
            </div>
            <div className="font-mono text-xs font-bold text-[#d8e3fb]">
              {formatCurrency(tollTotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#ea580c] shrink-0" />
          <div className="truncate">
            <div className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1">
              Outros ({otherPct.toFixed(0)}%)
            </div>
            <div className="font-mono text-xs font-bold text-[#d8e3fb]">
              {formatCurrency(otherExpensesTotal)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#798098] shrink-0" />
          <div className="truncate">
            <div className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1">
              <Wrench className="w-3 h-3 text-[#798098]" /> Desgaste ({maintPct.toFixed(0)}%)
            </div>
            <div className="font-mono text-xs font-bold text-[#d8e3fb]">
              {formatCurrency(estimatedMaintenance)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
          <div className="w-3 h-3 rounded-sm bg-[#10b981] shrink-0" />
          <div className="truncate">
            <div className="text-[11px] font-bold text-[#10b981] flex items-center gap-1">
              <PiggyBank className="w-3 h-3 text-[#10b981]" /> Sobra no Bolso
            </div>
            <div className="font-mono text-xs font-extrabold text-[#10b981]">
              {formatCurrency(netProfit)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
