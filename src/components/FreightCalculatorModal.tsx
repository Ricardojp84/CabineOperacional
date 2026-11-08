import React, { useState, useEffect } from 'react';
import { CargoType, VehicleAxles } from '../types/cockpit';
import {
  calculateAnttMinimumFloor,
  formatCurrency,
  getCargoLabel,
  getVehicleAxleLabel,
} from '../utils/formatters';
import { calculateAdvancedRoute, TripType } from '../data/brazilCitiesDatabase';
import { AutocompleteInput } from './AutocompleteInput';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Send,
  Copy,
  Check,
  X,
  Fuel,
  Receipt,
  Wrench,
  PiggyBank,
  Repeat,
  RotateCw,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface FreightCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAxles?: VehicleAxles;
  defaultCargoType?: CargoType;
  defaultDistanceKm?: number;
  defaultDieselPrice?: number;
}

export const FreightCalculatorModal: React.FC<FreightCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultAxles = 9,
  defaultCargoType = 'granel_solido',
  defaultDistanceKm = 1480,
  defaultDieselPrice = 6.29,
}) => {
  const [originCity, setOriginCity] = useState<string>('Rondonópolis - MT');
  const [destCity, setDestCity] = useState<string>('Porto de Santos - SP');
  const [tripType, setTripType] = useState<TripType>('somente_ida');
  const [distanceKm, setDistanceKm] = useState<number>(defaultDistanceKm);
  const [axles, setAxles] = useState<VehicleAxles>(defaultAxles);
  const [cargoType, setCargoType] = useState<CargoType>(defaultCargoType);
  const [offeredFreight, setOfferedFreight] = useState<number>(22400);
  const [consumptionKmL, setConsumptionKmL] = useState<number>(2.15);
  const [dieselPrice, setDieselPrice] = useState<number>(defaultDieselPrice);
  const [tollCost, setTollCost] = useState<number>(1380);
  const [maintenanceCostPerKm, setMaintenanceCostPerKm] = useState<number>(0.85);
  const [copiedProposal, setCopiedProposal] = useState(false);

  // Auto-calculate road distance and tolls when cities, axles, or tripType change
  useEffect(() => {
    if (originCity && destCity) {
      const calc = calculateAdvancedRoute(originCity, destCity, axles, tripType);
      setDistanceKm(calc.totalDistanceKm);
      setTollCost(calc.totalTollCost);
    }
  }, [originCity, destCity, axles, tripType]);

  if (!isOpen) return null;

  // Calculations
  const anttFloor = calculateAnttMinimumFloor(distanceKm, axles, cargoType);
  const fuelLitersNeeded = distanceKm / Math.max(0.5, consumptionKmL);
  const dieselCostTotal = fuelLitersNeeded * dieselPrice;
  const arlaCostTotal = fuelLitersNeeded * 0.05 * 2.85; // Arla is ~5% of diesel consumption
  const maintCostTotal = distanceKm * maintenanceCostPerKm;
  const operationalCostTotal = dieselCostTotal + arlaCostTotal + tollCost + maintCostTotal;

  const netProfit = offeredFreight - operationalCostTotal;
  const netMarginPct = offeredFreight > 0 ? (netProfit / offeredFreight) * 100 : 0;
  const profitPerKm = distanceKm > 0 ? netProfit / distanceKm : 0;
  const offeredPerKm = distanceKm > 0 ? offeredFreight / distanceKm : 0;

  const isBelowAntt = offeredFreight < anttFloor.total;
  const isLoss = netProfit <= 0;

  const generateWhatsAppProposal = () => {
    return `*PROPOSTA FORMAL DE FRETE - CABINE OPERACIONAL*\n` +
      `-----------------------------------------\n` +
      `🚛 *Trajeto:* ${originCity} ➔ ${destCity}\n` +
      `📍 *Distância:* ${distanceKm} km\n` +
      `📦 *Carga:* ${getCargoLabel(cargoType)}\n` +
      `⚙️ *Veículo:* ${getVehicleAxleLabel(axles)}\n\n` +
      `📊 *ANÁLISE DE CUSTOS & PISO REGULATÓRIO:*\n` +
      `• *Piso Mínimo ANTT (Lei 13.703):* ${formatCurrency(anttFloor.total)}\n` +
      `• *Consumo Diesel Estimado:* ${fuelLitersNeeded.toFixed(0)} L (${formatCurrency(dieselCostTotal)})\n` +
      `• *Pedágio Previsto:* ${formatCurrency(tollCost)}\n` +
      `• *Custo Operacional Total:* ${formatCurrency(operationalCostTotal)}\n\n` +
      `💰 *Valor Solicitado do Frete:* ${formatCurrency(Math.max(offeredFreight, anttFloor.total))}\n` +
      `• *Valor por KM:* ${formatCurrency(Math.max(offeredFreight, anttFloor.total) / distanceKm)}/km\n` +
      `• *Condição:* 70% Adiantamento na Carga + 30% Saldo na Descarga\n` +
      `• *Pedágio e Vale-Pedágio:* Fornecido integralmente pelo Embarcador\n` +
      `-----------------------------------------\n` +
      `Enviado via Cockpit Cabine Operacional.`;
  };

  const handleCopyProposal = () => {
    playSuccessChime();
    navigator.clipboard.writeText(generateWhatsAppProposal());
    setCopiedProposal(true);
    setTimeout(() => setCopiedProposal(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    playCockpitClick();
    const encoded = encodeURIComponent(generateWhatsAppProposal());
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#003824] border border-[#10b981] flex items-center justify-center text-[#10b981]">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                Simulador de Frete ANTT vs Custo Real
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Cálculo com Resolução ANTT vigente e custos reais de combustível e manutenção.
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

        {/* Form Body */}
        <div className="mt-4 space-y-4">
          {/* Origin & Destination Autocomplete Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AutocompleteInput
              label="Origem (Carregamento)"
              value={originCity}
              onChange={(val) => setOriginCity(val)}
              placeholder="Digite a cidade ou estado..."
            />

            <AutocompleteInput
              label="Destino (Descarga)"
              value={destCity}
              onChange={(val) => setDestCity(val)}
              placeholder="Digite a cidade ou estado..."
            />
          </div>

          {/* Trip Type Selector: Somente Ida vs Ida e Volta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-[#081425] rounded-xl border border-[#334155]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-[#ffb95f]" />
                Modalidade do Frete:
              </span>
              <p className="text-[11px] text-[#94a3b8]">
                Selecione se o piso ANTT e os custos devem calcular o retorno.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#152031] p-1 rounded-xl border border-[#334155] shrink-0">
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setTripType('somente_ida');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tripType === 'somente_ida'
                    ? 'bg-[#2563eb] text-white shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Somente Ida</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setTripType('ida_e_volta');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tripType === 'ida_e_volta'
                    ? 'bg-[#10b981] text-[#022c22] font-black shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Ida e Volta (2x)</span>
              </button>
            </div>
          </div>

          {/* Vehicle Config & Cargo Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Configuração de Eixos
              </label>
              <select
                value={axles}
                onChange={(e) => {
                  playCockpitClick();
                  setAxles(parseInt(e.target.value, 10) as VehicleAxles);
                }}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-2.5 text-[#d8e3fb] font-bold text-xs outline-hidden"
              >
                <option value={2}>2 Eixos (VUC, Delivery, HR, Toco)</option>
                <option value={3}>3 Eixos - Truck</option>
                <option value={4}>4 Eixos - Bitruck</option>
                <option value={5}>5 Eixos - Cavalo + Carreta</option>
                <option value={6}>6 Eixos - Carreta LS</option>
                <option value={7}>7 Eixos - Bitrem</option>
                <option value={9}>9 Eixos - Rodotrem / Bitrenzão</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Tipo de Carga
              </label>
              <select
                value={cargoType}
                onChange={(e) => {
                  playCockpitClick();
                  setCargoType(e.target.value as CargoType);
                }}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-2.5 text-[#d8e3fb] font-bold text-xs outline-hidden"
              >
                <option value="granel_solido">Granel Sólido (Grãos)</option>
                <option value="carga_geral">Carga Geral</option>
                <option value="granel_liquido">Granel Líquido</option>
                <option value="frigorificada">Frigorificada</option>
                <option value="perigosa">Perigosa (MOPP)</option>
                <option value="neogranel">Neogranel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Distância Total (KM)
              </label>
              <input
                type="number"
                min="10"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono font-extrabold text-base outline-hidden"
              />
            </div>
          </div>

          {/* Value Offered vs Diesel and Tolls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 text-[#ffb95f]">
                Valor do Frete Ofertado (R$)
              </label>
              <input
                type="number"
                step="50"
                value={offeredFreight}
                onChange={(e) => setOfferedFreight(parseFloat(e.target.value) || 0)}
                className="w-full h-14 min-h-[56px] bg-[#081425] border-2 border-[#ffb95f] rounded-xl px-3 text-[#ffb95f] font-mono font-extrabold text-xl outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Diesel (R$/L) & Média
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={dieselPrice}
                  onChange={(e) => setDieselPrice(parseFloat(e.target.value) || 0)}
                  className="w-full h-14 bg-[#081425] border border-[#334155] rounded-xl px-2 text-[#d8e3fb] font-mono font-bold text-sm outline-hidden"
                  placeholder="R$/L"
                  title="Preço Diesel"
                />
                <input
                  type="number"
                  step="0.05"
                  value={consumptionKmL}
                  onChange={(e) => setConsumptionKmL(parseFloat(e.target.value) || 1)}
                  className="w-full h-14 bg-[#081425] border border-[#334155] rounded-xl px-2 text-[#d8e3fb] font-mono font-bold text-sm outline-hidden"
                  placeholder="km/L"
                  title="Consumo km/L"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Pedágio Estimado (R$)
              </label>
              <input
                type="number"
                step="10"
                value={tollCost}
                onChange={(e) => setTollCost(parseFloat(e.target.value) || 0)}
                className="w-full h-14 bg-[#081425] border border-[#334155] rounded-xl px-3 text-[#d8e3fb] font-mono font-extrabold text-base outline-hidden"
              />
            </div>
          </div>

          {/* Comparison Cards: ANTT Floor vs Offered vs Real Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* ANTT Floor */}
            <div className={`p-4 rounded-xl border ${isBelowAntt ? 'bg-[#472a00]/30 border-[#f59e0b]' : 'bg-[#1e293b] border-[#334155]'}`}>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1">
                <span>Piso Mínimo ANTT</span>
                <ShieldCheck className="w-4 h-4 text-[#4edea3]" />
              </div>
              <div className="font-mono text-xl font-extrabold text-[#d8e3fb]">
                {formatCurrency(anttFloor.total)}
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-1">
                CCD R${anttFloor.ccdRate}/km + CC R${anttFloor.ccRate}
              </div>
            </div>

            {/* Total Operational Cost */}
            <div className="p-4 rounded-xl bg-[#1e293b] border border-[#334155]">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1">
                <span>Custo Real da Rota</span>
                <Fuel className="w-4 h-4 text-[#f59e0b]" />
              </div>
              <div className="font-mono text-xl font-extrabold text-[#f59e0b]">
                {formatCurrency(operationalCostTotal)}
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-1">
                R$ {(operationalCostTotal / distanceKm).toFixed(2)}/km rodado
              </div>
            </div>

            {/* Net Driver Pocket Profit */}
            <div className={`p-4 rounded-xl border ${isLoss ? 'bg-[#690005]/40 border-[#ea580c]' : 'bg-[#003824]/40 border-[#10b981]'}`}>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1">
                <span>Lucro Líquido Real</span>
                <PiggyBank className="w-4 h-4 text-[#10b981]" />
              </div>
              <div className={`font-mono text-xl font-extrabold ${isLoss ? 'text-[#ffb4ab]' : 'text-[#10b981]'}`}>
                {formatCurrency(netProfit)}
              </div>
              <div className="text-[11px] font-bold text-[#d8e3fb] mt-1">
                {netMarginPct.toFixed(1)}% de margem ({formatCurrency(profitPerKm)}/km)
              </div>
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              isLoss
                ? 'bg-[#690005]/50 border-[#ea580c] text-[#ffdad6]'
                : isBelowAntt
                ? 'bg-[#472a00]/50 border-[#f59e0b] text-[#ffddb8]'
                : 'bg-[#003824]/50 border-[#10b981] text-[#6ffbbe]'
            }`}
          >
            {isLoss ? (
              <AlertTriangle className="w-6 h-6 text-[#ffb4ab] shrink-0" />
            ) : isBelowAntt ? (
              <AlertTriangle className="w-6 h-6 text-[#f59e0b] shrink-0" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-[#4edea3] shrink-0" />
            )}

            <div className="text-xs">
              <strong className="block text-sm font-extrabold uppercase tracking-wide">
                {isLoss
                  ? 'ALERTA: VIAGEM COM PREJUÍZO OPERACIONAL'
                  : isBelowAntt
                  ? 'ATENÇÃO: VALOR ABAIXO DO PISO MÍNIMO DA ANTT'
                  : 'FRETE EXCELENTE & RENTÁVEL'}
              </strong>
              {isLoss
                ? 'O valor ofertado não cobre diesel, pedágio e pneus. Você estará pagando para rodar.'
                : isBelowAntt
                ? `O valor ofertado está ${formatCurrency(anttFloor.total - offeredFreight)} abaixo da tabela obrigatória da ANTT. Reivindique o valor legal.`
                : `Margem saudável de ${netMarginPct.toFixed(1)}%. Sobra garantida no bolso após combustível, pedágio e desgaste.`}
            </div>
          </div>

          {/* Action Buttons: WhatsApp Proposta & Copiar */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
            >
              <Send className="w-5 h-5 stroke-[2.5]" />
              Enviar Proposta no WhatsApp
            </button>

            <button
              type="button"
              onClick={handleCopyProposal}
              className="h-14 min-h-[56px] px-5 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#475569] text-[#d8e3fb] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              {copiedProposal ? (
                <>
                  <Check className="w-5 h-5 text-[#10b981]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-[#f59e0b]" />
                  <span>Copiar Proposta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
