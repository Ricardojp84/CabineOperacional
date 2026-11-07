import React, { useState, useEffect } from 'react';
import { Trip, CargoType, VehicleAxles, User, isAdminRole } from '../types/cockpit';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import {
  Truck,
  Check,
  X,
  ShieldAlert,
  CheckCircle2,
  RotateCw,
  ArrowRight,
  Repeat,
  Lock,
  ShieldCheck,
  Info,
  Scale,
  Gauge,
  MapPin,
} from 'lucide-react';
import { calculateAdvancedRoute, TripType } from '../data/brazilCitiesDatabase';
import { AutocompleteInput } from './AutocompleteInput';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  onSaveTrip: (updated: Trip) => void;
  onFinishTrip: () => void;
  currentUser?: User | null;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  isOpen,
  onClose,
  trip,
  onSaveTrip,
  onFinishTrip,
  currentUser,
}) => {
  const isAdmin = isAdminRole(currentUser?.role);

  // Form states
  const [origin, setOrigin] = useState(trip.origin);
  const [destination, setDestination] = useState(trip.destination);
  const [tripType, setTripType] = useState<TripType>('somente_ida');
  const [routeHighlights, setRouteHighlights] = useState(trip.routeHighlights);
  const [cargo, setCargo] = useState(trip.cargo);
  const [cargoType, setCargoType] = useState<CargoType>(trip.cargoType);
  const [cargoWeightTon, setCargoWeightTon] = useState(trip.cargoWeightTon);

  // Administrative Financials (Locked for Drivers)
  const [grossFreight, setGrossFreight] = useState(trip.grossFreight);
  const [advancePayment, setAdvancePayment] = useState(trip.advancePayment);
  const [targetConsumptionKmL, setTargetConsumptionKmL] = useState(trip.targetConsumptionKmL);

  // Distances and Odometers (Editable by both Admin & Driver)
  const [totalDistanceKm, setTotalDistanceKm] = useState(trip.totalDistanceKm);
  const [startOdometerKm, setStartOdometerKm] = useState(trip.startOdometerKm || 435000);
  const [currentOdometerKm, setCurrentOdometerKm] = useState(trip.currentOdometerKm || 435000);
  const [completedDistanceKm, setCompletedDistanceKm] = useState(trip.completedDistanceKm || 0);

  useEffect(() => {
    setOrigin(trip.origin);
    setDestination(trip.destination);
    setRouteHighlights(trip.routeHighlights);
    setCargo(trip.cargo);
    setCargoType(trip.cargoType);
    setCargoWeightTon(trip.cargoWeightTon);
    setGrossFreight(trip.grossFreight);
    setAdvancePayment(trip.advancePayment);
    setTotalDistanceKm(trip.totalDistanceKm);
    setStartOdometerKm(trip.startOdometerKm || 435000);
    setCurrentOdometerKm(trip.currentOdometerKm || 435000);
    setCompletedDistanceKm(trip.completedDistanceKm || 0);
    setTargetConsumptionKmL(trip.targetConsumptionKmL);
  }, [trip]);

  if (!isOpen) return null;

  // Auto calculate completed distance when odometers change
  const handleStartOdometerChange = (val: number) => {
    setStartOdometerKm(val);
    if (currentOdometerKm >= val) {
      setCompletedDistanceKm(currentOdometerKm - val);
    }
  };

  const handleCurrentOdometerChange = (val: number) => {
    setCurrentOdometerKm(val);
    if (val >= startOdometerKm) {
      setCompletedDistanceKm(val - startOdometerKm);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessChime();

    const updated: Trip = {
      ...trip,
      origin,
      destination,
      routeHighlights,
      cargo,
      cargoType: isAdmin ? cargoType : trip.cargoType,
      cargoWeightTon,
      grossFreight: isAdmin ? grossFreight : trip.grossFreight,
      advancePayment: isAdmin ? advancePayment : trip.advancePayment,
      balancePayment: isAdmin
        ? grossFreight - advancePayment
        : trip.grossFreight - trip.advancePayment,
      totalDistanceKm,
      startOdometerKm,
      currentOdometerKm,
      completedDistanceKm,
      targetConsumptionKmL: isAdmin ? targetConsumptionKmL : trip.targetConsumptionKmL,
    };

    onSaveTrip(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isAdmin
                  ? 'bg-[#243248] border-[#ffb95f] text-[#ffb95f]'
                  : 'bg-[#003824] border-[#10b981] text-[#10b981]'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                  Editar Parâmetros da Viagem
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    isAdmin
                      ? 'bg-[#472a00] text-[#ffb95f] border border-[#f59e0b]/40'
                      : 'bg-[#003824] text-[#4edea3] border border-[#10b981]/40'
                  }`}
                >
                  {isAdmin ? 'Administrador' : 'Modo Motorista'}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">
                {isAdmin
                  ? 'Permissão total: edite valores financeiros, metas e parâmetros da rota.'
                  : 'Permissão operacional: edite origem, destino, peso da carga, KM inicial e KM final.'}
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

        {/* Role Notice Banner */}
        {!isAdmin && (
          <div className="mt-3 p-3 rounded-xl bg-[#081425] border border-[#334155] flex items-start gap-2.5 text-xs text-[#94a3b8]">
            <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#d8e3fb] block">Perfil de Motorista Ativo</span>
              Você pode atualizar os dados básicos de rota, peso transportado e quilometragem do odômetro. Os campos financeiros de frete e adiantamento são protegidos e gerenciados pela administração.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* 1. Origem e Destino (Início e Fim da Rota) - Editável pelo Motorista */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AutocompleteInput
              label="Início da Rota (Origem)"
              value={origin}
              onChange={(val) => {
                setOrigin(val);
                const calc = calculateAdvancedRoute(val, destination, trip.axles, tripType);
                setTotalDistanceKm(calc.totalDistanceKm);
                setRouteHighlights(calc.highways);
              }}
              placeholder="Ex: Rondonópolis - MT"
              showGpsButton={true}
              onUseGpsLocation={() => {
                try {
                  const saved = localStorage.getItem('cabine_last_gps');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.nearestCity) setOrigin(parsed.nearestCity);
                  }
                } catch {}
              }}
            />

            <AutocompleteInput
              label="Destino da Rota (Descarga)"
              value={destination}
              onChange={(val) => {
                setDestination(val);
                const calc = calculateAdvancedRoute(origin, val, trip.axles, tripType);
                setTotalDistanceKm(calc.totalDistanceKm);
                setRouteHighlights(calc.highways);
              }}
              placeholder="Ex: Porto de Santos - SP"
            />
          </div>

          {/* Trip Type Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-[#081425] rounded-xl border border-[#334155]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-[#ffb95f]" />
                Modalidade do Percurso:
              </span>
              <p className="text-[11px] text-[#94a3b8]">
                Selecione se deseja calcular somente ida ou percurso duplo de ida e volta.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#152031] p-1 rounded-xl border border-[#334155] shrink-0">
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setTripType('somente_ida');
                  const calc = calculateAdvancedRoute(origin, destination, trip.axles, 'somente_ida');
                  setTotalDistanceKm(calc.totalDistanceKm);
                  setRouteHighlights(calc.highways);
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
                  const calc = calculateAdvancedRoute(origin, destination, trip.axles, 'ida_e_volta');
                  setTotalDistanceKm(calc.totalDistanceKm);
                  setRouteHighlights(calc.highways);
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

          {/* Roteiro Rodoviário */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Roteiro / Rodovias Principais
            </label>
            <input
              type="text"
              value={routeHighlights}
              onChange={(e) => setRouteHighlights(e.target.value)}
              className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-medium text-xs outline-hidden"
            />
          </div>

          {/* 2. Carga & Peso do Frete (Editável pelo Motorista) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Descrição da Carga
              </label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4edea3] uppercase mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#4edea3]" />
                Peso do Frete (Ton)
              </label>
              <input
                type="number"
                step="0.1"
                value={cargoWeightTon}
                onChange={(e) => setCargoWeightTon(parseFloat(e.target.value) || 0)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#10b981] focus:border-[#4edea3] rounded-xl px-3 text-[#4edea3] font-mono font-bold text-sm outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                <span>Tipo Carga ANTT</span>
                {!isAdmin && <Lock className="w-3 h-3 text-[#64748b]" />}
              </label>
              <select
                disabled={!isAdmin}
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value as CargoType)}
                className={`w-full h-12 rounded-xl px-2.5 text-xs outline-hidden border-1.5 ${
                  isAdmin
                    ? 'bg-[#081425] border-[#334155] text-[#d8e3fb] focus:border-[#f59e0b]'
                    : 'bg-[#0a0f1d] border-[#1e293b] text-[#64748b] cursor-not-allowed'
                }`}
              >
                <option value="granel_solido">Granel Sólido</option>
                <option value="carga_geral">Carga Geral</option>
                <option value="granel_liquido">Granel Líquido</option>
                <option value="frigorificada">Frigorificada</option>
                <option value="perigosa">Perigosa</option>
                <option value="neogranel">Neogranel</option>
              </select>
            </div>
          </div>

          {/* 3. KM Inicial e KM Final / Odômetro (Editável pelo Motorista) */}
          <div className="p-3.5 bg-[#081425] rounded-xl border border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#d8e3fb] uppercase tracking-wide flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-[#ffb95f]" />
                Controle de Odômetro & KM Rodados
              </span>
              <span className="text-[10px] text-[#4edea3] font-mono font-bold">
                Editável pelo Motorista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#bec6e0] uppercase mb-1">
                  KM Inicial (Saída)
                </label>
                <input
                  type="number"
                  step="1"
                  value={startOdometerKm}
                  onChange={(e) => handleStartOdometerChange(parseFloat(e.target.value) || 0)}
                  className="w-full h-12 bg-[#152031] border-1.5 border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#ffb95f] font-mono font-bold text-sm outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#bec6e0] uppercase mb-1">
                  KM Final (Atual)
                </label>
                <input
                  type="number"
                  step="1"
                  value={currentOdometerKm}
                  onChange={(e) => handleCurrentOdometerChange(parseFloat(e.target.value) || 0)}
                  className="w-full h-12 bg-[#152031] border-1.5 border-[#334155] focus:border-[#4edea3] rounded-xl px-3 text-[#4edea3] font-mono font-bold text-sm outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#bec6e0] uppercase mb-1">
                  KM Rodados Efetivos
                </label>
                <input
                  type="number"
                  step="1"
                  value={completedDistanceKm}
                  onChange={(e) => setCompletedDistanceKm(parseFloat(e.target.value) || 0)}
                  className="w-full h-12 bg-[#152031] border-1.5 border-[#334155] focus:border-[#38bdf8] rounded-xl px-3 text-[#38bdf8] font-mono font-bold text-sm outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 4. Dados Financeiros (Frete Bruto e Adiantamento) - Restrito para Administradores */}
          <div className="p-3.5 bg-[#081425] rounded-xl border border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#ffb95f] uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#ffb95f]" />
                Dados Financeiros do Frete
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isAdmin
                    ? 'bg-[#003824] text-[#10b981] border border-[#10b981]/40'
                    : 'bg-[#690005]/40 text-[#ffb4ab] border border-[#ff5449]/40'
                }`}
              >
                {isAdmin ? 'Acesso Liberado (Admin)' : 'Bloqueado para Motorista'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                  <span>Valor do Frete Bruto (R$)</span>
                  {!isAdmin && <Lock className="w-3 h-3 text-[#ea580c]" />}
                </label>
                <input
                  type="number"
                  step="100"
                  disabled={!isAdmin}
                  value={grossFreight}
                  onChange={(e) => setGrossFreight(parseFloat(e.target.value) || 0)}
                  className={`w-full h-14 rounded-xl px-4 font-mono font-extrabold text-xl outline-hidden border-1.5 ${
                    isAdmin
                      ? 'bg-[#152031] border-[#ffb95f] text-[#ffb95f] focus:border-[#d97706]'
                      : 'bg-[#0a0f1d] border-[#1e293b] text-[#64748b] cursor-not-allowed'
                  }`}
                />
                {!isAdmin && (
                  <span className="text-[10px] text-[#94a3b8] mt-1 block">
                    Somente o Administrador/Gestor pode alterar o valor contratual.
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                  <span>Adiantamento Recebido (R$)</span>
                  {!isAdmin && <Lock className="w-3 h-3 text-[#ea580c]" />}
                </label>
                <input
                  type="number"
                  step="100"
                  disabled={!isAdmin}
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                  className={`w-full h-14 rounded-xl px-4 font-mono font-extrabold text-xl outline-hidden border-1.5 ${
                    isAdmin
                      ? 'bg-[#152031] border-[#4edea3] text-[#4edea3] focus:border-[#10b981]'
                      : 'bg-[#0a0f1d] border-[#1e293b] text-[#64748b] cursor-not-allowed'
                  }`}
                />
                {!isAdmin && (
                  <span className="text-[10px] text-[#94a3b8] mt-1 block">
                    Adiantamento contratado fixado pela gestão de frota.
                  </span>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="pt-1">
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Meta de Consumo de Combustível (km/L)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={targetConsumptionKmL}
                  onChange={(e) => setTargetConsumptionKmL(parseFloat(e.target.value) || 1)}
                  className="w-full h-12 bg-[#152031] border-1.5 border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="submit"
              className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              Salvar Alterações
            </button>

            <button
              type="button"
              onClick={() => {
                playSuccessChime();
                onFinishTrip();
                onClose();
              }}
              className="h-14 min-h-[56px] px-5 rounded-xl bg-[#003824] hover:bg-[#004d32] border border-[#10b981] text-[#10b981] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              Finalizar Viagem
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
