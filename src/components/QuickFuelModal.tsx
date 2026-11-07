import React, { useState } from 'react';
import { Expense } from '../types/cockpit';
import { formatCurrency } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import { FUEL_OPTIONS, STATION_NETWORKS, getSuggestedFuelPrice } from '../data/fuelTypes';
import { Fuel, Droplet, Gauge, Check, X, Building2, CreditCard, Navigation, Sparkles } from 'lucide-react';

interface QuickFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordFuel: (expense: Expense, newOdometer?: number) => void;
  currentOdometer: number;
  defaultDieselPrice: number;
  defaultArlaPrice: number;
}

export const QuickFuelModal: React.FC<QuickFuelModalProps> = ({
  isOpen,
  onClose,
  onRecordFuel,
  currentOdometer,
  defaultDieselPrice,
  defaultArlaPrice,
}) => {
  const [fuelType, setFuelType] = useState<string>('diesel_s10');
  const [liters, setLiters] = useState<number>(300);
  const [pricePerLiter, setPricePerLiter] = useState<number>(defaultDieselPrice);
  const [stationName, setStationName] = useState<string>('Rede Ipiranga RodoRede');
  const [odometer, setOdometer] = useState<number>(currentOdometer);
  const [paymentMethod, setPaymentMethod] = useState<'Cartão Frete' | 'PIX' | 'Dinheiro'>('Cartão Frete');

  if (!isOpen) return null;

  const totalAmount = Math.round(liters * pricePerLiter * 100) / 100;

  const handleFuelTypeChange = (typeId: string) => {
    playCockpitClick();
    setFuelType(typeId);
    if (typeId === 'arla_32') {
      setPricePerLiter(defaultArlaPrice);
      setLiters(25);
    } else if (typeId === 'diesel_s500') {
      setPricePerLiter(Math.max(4.5, defaultDieselPrice - 0.3));
    } else if (typeId === 'gasolina_comum') {
      setPricePerLiter(6.15);
      setLiters(50);
    } else {
      setPricePerLiter(defaultDieselPrice);
    }
  };

  const handleLitersPreset = (amount: number) => {
    playCockpitClick();
    setLiters(amount);
  };

  const handleAutofillGpsLocation = () => {
    playSuccessChime();
    try {
      const saved = localStorage.getItem('cabine_last_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nearestCity) {
          setStationName(`Posto em ${parsed.nearestCity} (${parsed.highway})`);
        }
      } else {
        setStationName('Posto Rodoviário (GPS Ativo)');
      }
    } catch {
      setStationName('Posto Rodoviário');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (liters <= 0 || pricePerLiter <= 0) return;

    playSuccessChime();

    const isArla = fuelType === 'arla_32';
    const fuelObj = FUEL_OPTIONS.find((f) => f.id === fuelType);
    const typeLabel = fuelObj ? fuelObj.name.split('(')[0].trim() : 'Combustível';

    const newExpense: Expense = {
      id: `fuel-${Date.now()}`,
      category: isArla ? 'arla' : 'combustivel',
      description: `${typeLabel} - ${liters}L (${stationName})`,
      amount: totalAmount,
      liters: liters,
      odometerKm: odometer,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      location: stationName,
      paymentMethod: paymentMethod,
    };

    onRecordFuel(newExpense, odometer > currentOdometer ? odometer : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border-t sm:border border-[#475569] rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-5 shadow-2xl flex flex-col">
        {/* Top bar with close button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#472a00] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b]">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#d8e3fb]">
                Abastecimento de Bomba & Arla
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Preenchimento automático de preços médios e localização GPS da parada.
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Fuel Type Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#94a3b8] uppercase">
                Tipo de Combustível / Fluido
              </label>
              <button
                type="button"
                onClick={() => setPricePerLiter(getSuggestedFuelPrice(fuelType))}
                className="text-[11px] font-bold text-[#f59e0b] hover:text-[#ffb95f] flex items-center gap-1 cursor-pointer"
                title="Preencher preço médio de referência ANP"
              >
                <Sparkles className="w-3 h-3 text-[#f59e0b]" /> Preço Médio ANP
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FUEL_OPTIONS.slice(0, 4).map((f) => {
                const isSelected = fuelType === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFuelTypeChange(f.id)}
                    className={`h-12 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? f.id === 'arla_32'
                          ? 'bg-[#4edea3] text-[#002113] border-[#4edea3] shadow-md font-extrabold'
                          : 'bg-[#f59e0b] text-[#0f172a] border-[#f59e0b] shadow-md font-extrabold'
                        : 'bg-[#1e293b] text-[#d8e3fb] border-[#334155] hover:border-[#475569]'
                    }`}
                  >
                    {f.id === 'arla_32' ? <Droplet className="w-4 h-4" /> : <Fuel className="w-4 h-4" />}
                    <span className="truncate">{f.name.split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets for Liters - Giant 56px touch buttons */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1.5">
              Litragem Rápida Pré-configurada
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(fuelType === 'arla_32' ? [20, 25, 50, 100, 200] : [50, 100, 200, 300, 500]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleLitersPreset(preset)}
                  className={`h-14 rounded-xl font-mono text-sm font-extrabold border transition-all cursor-pointer ${
                    liters === preset
                      ? 'bg-[#ffb95f] text-[#472a00] border-[#ffb95f] scale-102 shadow-md'
                      : 'bg-[#1e293b] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
                  }`}
                >
                  +{preset}L
                </button>
              ))}
            </div>
          </div>

          {/* Inputs: Liters and Price per Liter (56px high) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Litros no Total
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={liters || ''}
                  onChange={(e) => setLiters(parseFloat(e.target.value) || 0)}
                  className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-mono font-extrabold text-xl outline-hidden"
                />
                <span className="absolute right-4 top-4 text-xs font-bold text-[#94a3b8]">
                  L
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Preço por Litro (R$)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={pricePerLiter || ''}
                  onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                  className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-mono font-extrabold text-xl outline-hidden"
                />
                <span className="absolute right-4 top-4 text-xs font-bold text-[#94a3b8]">
                  R$/L
                </span>
              </div>
            </div>
          </div>

          {/* Current Odometer and Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[#ffb95f]" />
                Odômetro da Cabine (KM)
              </label>
              <input
                type="number"
                value={odometer || ''}
                onChange={(e) => setOdometer(parseInt(e.target.value, 10) || 0)}
                className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-mono font-extrabold text-lg outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-[#bec6e0]" />
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'Cartão Frete' | 'PIX' | 'Dinheiro')}
                className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-bold text-sm outline-hidden"
              >
                <option value="Cartão Frete">Cartão Frete (Pamcard / Repom)</option>
                <option value="PIX">PIX Direto</option>
                <option value="Dinheiro">Dinheiro em Espécie</option>
              </select>
            </div>
          </div>

          {/* Station Selector Chips with GPS Autofill */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#94a3b8] uppercase flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#94a3b8]" />
                Rede do Posto / Localização
              </label>
              <button
                type="button"
                onClick={handleAutofillGpsLocation}
                className="text-[11px] font-bold text-[#4edea3] hover:text-[#6ffbbe] flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3 text-[#4edea3]" />
                Preencher com Meu GPS
              </button>
            </div>

            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-xs text-[#d8e3fb] font-medium outline-hidden mb-2"
            />

            <div className="flex flex-wrap gap-1.5">
              {STATION_NETWORKS.map((network) => (
                <button
                  key={network.name}
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setStationName(network.name);
                  }}
                  className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    stationName.includes(network.banner)
                      ? 'bg-[#243248] text-[#f59e0b] border-[#f59e0b]'
                      : 'bg-[#1e293b] text-[#94a3b8] border-[#334155] hover:text-[#d8e3fb]'
                  }`}
                >
                  {network.banner}
                </button>
              ))}
            </div>
          </div>

          {/* Total Calculation Display */}
          <div className="bg-[#081425] border border-[#334155] rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-[#94a3b8]">
                Total a Pagar no Caixa
              </span>
              <div className="text-xs text-[#94a3b8] mt-0.5">
                {liters}L × {formatCurrency(pricePerLiter)}/L
              </div>
            </div>
            <div className="font-mono text-2xl lg:text-3xl font-extrabold text-[#f59e0b]">
              {formatCurrency(totalAmount)}
            </div>
          </div>

          {/* Primary Action Button - 56px minimum height */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-14 min-h-[56px] rounded-xl bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-[#0f172a] font-extrabold text-base flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              Confirmar Abastecimento ({formatCurrency(totalAmount)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
