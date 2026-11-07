import React, { useState } from 'react';
import { Trip, User } from '../types/cockpit';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import { generateTripPdf } from '../utils/tripPdfGenerator';
import {
  FileText,
  Printer,
  Send,
  X,
  Fuel,
  PiggyBank,
  CheckCircle,
  FileDown,
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface TripReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentUser?: User | null;
}

export const TripReportModal: React.FC<TripReportModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUser,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute expenses breakdown
  const fuelExpenses = trip.expenses.filter((e) => e.category === 'combustivel' || e.category === 'arla');
  const fuelTotal = fuelExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLiters = fuelExpenses.reduce((sum, e) => sum + (e.liters || 0), 0);

  const tollExpenses = trip.expenses.filter((e) => e.category === 'pedagio');
  const tollTotal = tollExpenses.reduce((sum, e) => sum + e.amount, 0);

  const foodExpenses = trip.expenses.filter((e) => e.category === 'alimentacao');
  const foodTotal = foodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const maintExpenses = trip.expenses.filter((e) => e.category === 'manutencao' || e.category === 'pneu_borracharia');
  const maintTotal = maintExpenses.reduce((sum, e) => sum + e.amount, 0);

  const otherExpenses = trip.expenses.filter(
    (e) => e.category !== 'combustivel' && e.category !== 'arla' && e.category !== 'pedagio' && e.category !== 'alimentacao' && e.category !== 'manutencao' && e.category !== 'pneu_borracharia'
  );
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalDirectExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedWearMaintenance = trip.completedDistanceKm * 0.85; // Provisão pneus e depreciação
  const totalTripCost = totalDirectExpenses + estimatedWearMaintenance;

  const netPocketProfit = trip.grossFreight - totalDirectExpenses;
  const realNetProfit = trip.grossFreight - totalTripCost;
  const netMarginPct = trip.grossFreight > 0 ? (realNetProfit / trip.grossFreight) * 100 : 0;
  const pocketMarginPct = trip.grossFreight > 0 ? (netPocketProfit / trip.grossFreight) * 100 : 0;
  const profitPerKm = trip.completedDistanceKm > 0 ? realNetProfit / trip.completedDistanceKm : 0;
  const costPerKm = trip.completedDistanceKm > 0 ? totalDirectExpenses / trip.completedDistanceKm : 0;

  const generateWhatsAppReport = () => {
    return `*RELATÓRIO DE FECHAMENTO DE VIAGEM - CABINE OPERACIONAL*\n` +
      `-----------------------------------------\n` +
      `🚛 *Rota:* ${trip.origin} ➔ ${trip.destination}\n` +
      `🛣️ *Distância Rodada:* ${formatKm(trip.completedDistanceKm)} de ${formatKm(trip.totalDistanceKm)}\n` +
      `📦 *Carga:* ${trip.cargo} (${trip.cargoWeightTon} Toneladas)\n` +
      `🚚 *Veículo:* ${trip.vehicleModel} | Placa: ${trip.vehiclePlate}\n` +
      `👤 *Motorista:* ${currentUser?.name || 'Não informado'}\n` +
      `-----------------------------------------\n` +
      `💰 *RECEITAS:*\n` +
      `• *Frete Bruto:* ${formatCurrency(trip.grossFreight)}\n` +
      `• *Adiantamento Recebido:* ${formatCurrency(trip.advancePayment)}\n` +
      `• *Saldo a Receber na Descarga:* ${formatCurrency(trip.balancePayment)}\n\n` +
      `⛽ *DESPESAS OPERACIONAIS:*\n` +
      `• *Diesel & Arla:* ${formatCurrency(fuelTotal)} (${totalLiters}L abastecidos)\n` +
      `• *Média de Consumo Aferida:* ${trip.actualConsumptionKmL.toFixed(2)} km/L\n` +
      `• *Pedágios:* ${formatCurrency(tollTotal)}\n` +
      `• *Alimentação:* ${formatCurrency(foodTotal)}\n` +
      `• *Manutenção Emergencial & Pneus:* ${formatCurrency(maintTotal)}\n` +
      `• *Outros Gastos:* ${formatCurrency(otherTotal)}\n` +
      `• *Total Despesas Diretas:* ${formatCurrency(totalDirectExpenses)}\n\n` +
      `📊 *RESULTADO FINAL DA VIAGEM:*\n` +
      `💵 *Sobra em Dinheiro no Bolso:* ${formatCurrency(netPocketProfit)} (${pocketMarginPct.toFixed(1)}%)\n` +
      `📈 *Lucro Líquido Real (c/ Provisão Pneus):* ${formatCurrency(realNetProfit)}\n` +
      `🎯 *Margem Líquida Real:* ${netMarginPct.toFixed(1)}%\n` +
      `⚡ *Lucro por KM:* ${formatCurrency(profitPerKm)}/km\n` +
      `-----------------------------------------\n` +
      `Fechamento gerado pelo aplicativo Cabine Operacional.`;
  };

  const handleShareWhatsApp = () => {
    playCockpitClick();
    const encoded = encodeURIComponent(generateWhatsAppReport());
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    playCockpitClick();
    window.print();
  };

  const handleGeneratePdf = () => {
    playCockpitClick();
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);

    try {
      generateTripPdf({
        trip,
        currentUser,
      });
      playSuccessChime();
      setPdfSuccessMessage('PDF contábil gerado com sucesso! Arquivo baixado para envio à contabilidade ou gestão de frota.');
      setTimeout(() => {
        setPdfSuccessMessage(null);
      }, 7000);
    } catch (err) {
      console.error('Erro ao gerar PDF da viagem:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#243248] border border-[#bec6e0] flex items-center justify-center text-[#bec6e0]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                Balanço Financeiro da Viagem
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Demonstrativo consolidado de receitas, despesas, margem de lucro e DRE gerencial.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-10 h-10 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success message when PDF is generated */}
        {pdfSuccessMessage && (
          <div className="mt-3 bg-[#064e3b] border border-[#10b981] text-[#a7f3d0] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-[#34d399] shrink-0" />
            <span>{pdfSuccessMessage}</span>
          </div>
        )}

        {/* PDF Prompt for Management & Accounting */}
        <div className="mt-3 bg-gradient-to-r from-[#0d2847] via-[#0f1d33] to-[#1e293b] border border-[#38bdf8]/40 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#0284c7]/20 border border-[#38bdf8]/50 flex items-center justify-center text-[#38bdf8] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#f8fafc] flex items-center gap-1.5">
                <span>Relatório Oficial para Contabilidade & Gestão</span>
                <span className="bg-[#0284c7]/30 text-[#38bdf8] border border-[#38bdf8]/30 px-1.5 py-0.2 rounded text-[10px] font-mono">PDF A4</span>
              </div>
              <p className="text-[11px] text-[#94a3b8]">
                Contém DRE completo, margem de lucro, média de consumo, lista de comprovantes e campos para assinaturas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto h-11 px-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 cursor-pointer shrink-0 transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar Resumo em PDF'}</span>
          </button>
        </div>

        {/* Printable Statement Content */}
        <div className="mt-4 space-y-4 print:text-black">
          {/* Trip Summary Card */}
          <div className="bg-[#081425] border border-[#334155] rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#334155] pb-2 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  Identificação da Rota
                </span>
                <div className="text-base font-extrabold text-[#d8e3fb]">
                  {trip.origin} ➔ {trip.destination}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-[#94a3b8]">
                  Veículo & Placa
                </span>
                <div className="font-mono text-sm font-bold text-[#ffb95f]">
                  {trip.vehiclePlate} ({trip.vehicleModel})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[#94a3b8]">Carga:</span>
                <div className="font-bold text-[#d8e3fb] truncate">{trip.cargo}</div>
              </div>
              <div>
                <span className="text-[#94a3b8]">Peso:</span>
                <div className="font-mono font-bold text-[#d8e3fb]">{trip.cargoWeightTon} Ton</div>
              </div>
              <div>
                <span className="text-[#94a3b8]">Distância:</span>
                <div className="font-mono font-bold text-[#d8e3fb]">{formatKm(trip.completedDistanceKm)} / {formatKm(trip.totalDistanceKm)}</div>
              </div>
              <div>
                <span className="text-[#94a3b8]">Média Aferida:</span>
                <div className="font-mono font-bold text-[#4edea3]">{trip.actualConsumptionKmL.toFixed(2)} km/L</div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#4edea3] mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#4edea3]" />
              Receita do Frete
            </h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#c6c6cd]">Valor Bruto Contratado</span>
                <span className="font-mono font-bold text-[#d8e3fb]">{formatCurrency(trip.grossFreight)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>• Adiantamento Recebido (70%)</span>
                <span className="font-mono text-[#4edea3]">{formatCurrency(trip.advancePayment)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#94a3b8]">
                <span>• Saldo a Receber na Descarga (30%)</span>
                <span className="font-mono text-[#ffb95f]">{formatCurrency(trip.balancePayment)}</span>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown */}
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b] mb-2 flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-[#f59e0b]" />
              Despesas Realizadas na Viagem
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-[#334155]/50">
                <span className="text-[#c6c6cd]">Diesel & Arla ({totalLiters} Litros)</span>
                <span className="font-mono font-bold text-[#f59e0b]">{formatCurrency(fuelTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#334155]/50">
                <span className="text-[#c6c6cd]">Pedágios Concessionárias</span>
                <span className="font-mono font-bold text-[#ffb95f]">{formatCurrency(tollTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#334155]/50">
                <span className="text-[#c6c6cd]">Alimentação & Paradas</span>
                <span className="font-mono font-bold text-[#d8e3fb]">{formatCurrency(foodTotal)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#334155]/50">
                <span className="text-[#c6c6cd]">Borracharia / Manutenção</span>
                <span className="font-mono font-bold text-[#d8e3fb]">{formatCurrency(maintTotal)}</span>
              </div>
              {otherTotal > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-[#334155]/50">
                  <span className="text-[#c6c6cd]">Outras Despesas (Chapa/Descarga)</span>
                  <span className="font-mono font-bold text-[#d8e3fb]">{formatCurrency(otherTotal)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 font-bold text-[#d8e3fb]">
                <span>Total de Despesas Diretas</span>
                <span className="font-mono text-base text-[#ea580c]">{formatCurrency(totalDirectExpenses)}</span>
              </div>
            </div>
          </div>

          {/* Final Financial Results Banner */}
          <div className="p-4 rounded-xl bg-[#003824]/60 border-2 border-[#10b981] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase font-extrabold text-[#4edea3] flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4" />
                Lucro Líquido Real no Bolso
              </div>
              <div className="text-xs text-[#94a3b8] mt-0.5">
                Margem de {netMarginPct.toFixed(1)}% ({formatCurrency(profitPerKm)}/km rodado) • Custo {formatCurrency(costPerKm)}/km
              </div>
            </div>
            <div className="font-mono text-3xl font-extrabold text-[#10b981]">
              {formatCurrency(netPocketProfit)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="flex-1 h-14 min-h-[56px] rounded-xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#1d4ed8] hover:brightness-110 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.99] cursor-pointer"
            >
              <FileDown className="w-5 h-5 stroke-[2.5]" />
              <span>{isGeneratingPdf ? 'Gerando Documento...' : 'Gerar PDF Formatado'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
            >
              <Send className="w-5 h-5 stroke-[2.5]" />
              <span>Enviar no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="h-14 min-h-[56px] px-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#475569] text-[#d8e3fb] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer shrink-0"
              title="Imprimir direto do navegador"
            >
              <Printer className="w-5 h-5 text-[#bec6e0]" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
