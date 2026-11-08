import React, { useState, useEffect } from 'react';
import { Trip, CargoType, VehicleAxles, User, isAdminRole, isUserAdmin } from '../types/cockpit';
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
  Compass,
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
  const isAdmin = isUserAdmin(currentUser);

  // Form states
  const [origin, setOrigin] = useState(trip.origin);
  const [destination, setDestination] = useState(trip.destination);
  const [tripType, setTripType] = useState<TripType>('somente_ida');
  const [routeHighlights, setRouteHighlights] = useState(trip.routeHighlights);
  const [cargo, setCargo] = useState(trip.cargo);
  const [cargoType, setCargoType] = useState<CargoType>(trip.cargoType);
  const [cargoWeightTon, setCargoWeightTon] = useState(trip.cargoWeightTon);

  // Vehicle / Truck Model Configuration
  const [vehicleModel, setVehicleModel] = useState(trip.vehicleModel || 'Scania R540 6x4 Super');
  const [vehiclePlate, setVehiclePlate] = useState(trip.vehiclePlate || 'BRA-2026');
  const [axles, setAxles] = useState<VehicleAxles>(trip.axles || 6);

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
    setVehicleModel(trip.vehicleModel || 'Scania R540 6x4 Super');
    setVehiclePlate(trip.vehiclePlate || 'BRA-2026');
    setAxles(trip.axles || 6);
    setGrossFreight(trip.grossFreight);
    setAdvancePayment(trip.advancePayment);
    setTotalDistanceKm(trip.totalDistanceKm);
    setStartOdometerKm(trip.startOdometerKm || 435000);
    setCurrentOdometerKm(trip.currentOdometerKm || 435000);
    setCompletedDistanceKm(trip.completedDistanceKm || 0);
    setTargetConsumptionKmL(trip.targetConsumptionKmL);
  }, [trip]);

  // Automatic calculation & auto-fill of KM whenever Origin or Destination changes
  useEffect(() => {
    if (origin && destination && origin.trim().length >= 3 && destination.trim().length >= 3) {
      const calc = calculateAdvancedRoute(origin, destination, axles, tripType);
      if (calc.totalDistanceKm > 0) {
        setTotalDistanceKm(calc.totalDistanceKm);
        if (calc.highways) {
          setRouteHighlights(calc.highways);
        }
      }
    }
  }, [origin, destination, axles, tripType]);

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
      vehicleModel: vehicleModel.trim() || trip.vehicleModel,
      vehiclePlate: vehiclePlate.trim().toUpperCase() || trip.vehiclePlate,
      axles,
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

            {/* Live Auto-fill KM Badge */}
            {origin && destination && totalDistanceKm > 0 && (
              <div className="sm:col-span-2 p-2.5 rounded-xl bg-[#003824]/80 border border-[#10b981] flex flex-wrap items-center justify-between gap-2 text-xs text-[#a7f3d0] animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                  <span>
                    KM Preenchido Automaticamente: <strong className="text-white font-mono font-black text-sm">{formatKm(totalDistanceKm)}</strong>
                    {routeHighlights && (
                      <span className="text-[#6ee7b7] text-[11px] ml-1.5 hidden md:inline">
                        ({routeHighlights})
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#081425] px-2 py-0.5 rounded text-[#38bdf8] border border-[#009365]/50">
                  {tripType === 'ida_e_volta' ? 'Ida + Volta (2x)' : 'Somente Ida'}
                </span>
              </div>
            )}
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

          {/* Distância Total da Rota (Calculada com Precisão & Editável pelo Motorista) */}
          <div className="p-3 bg-[#081425] rounded-xl border border-[#334155] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#bec6e0] uppercase tracking-wide flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#f59e0b]" />
                Distância Total Prevista da Rota (KM)
              </span>
              <span className="text-[10px] text-[#4edea3] font-mono font-bold">
                Editável pelo Motorista
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={totalDistanceKm}
                  onChange={(e) => setTotalDistanceKm(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full h-11 bg-[#152031] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl pl-3 pr-12 text-[#ffb95f] font-mono font-extrabold text-sm outline-hidden"
                  placeholder="Ex: 95"
                  title="Distância total rodoviária estimada em KM. Você pode ajustar manualmente conforme seu velocímetro ou rota desejada."
                />
                <span className="absolute right-3 top-3 text-xs font-mono font-bold text-[#94a3b8]">
                  KM
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  if (origin && destination) {
                    const calc = calculateAdvancedRoute(origin, destination, trip.axles, tripType);
                    setTotalDistanceKm(calc.totalDistanceKm);
                    setRouteHighlights(calc.highways);
                  }
                }}
                className="h-11 px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#f59e0b]/40 text-[#ffb95f] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                title="Recalcular distância rodoviária exata entre as cidades"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Recalcular</span>
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

          {/* Dados do Veículo / Modelo do Caminhão */}
          <div className="p-3 bg-[#081425] rounded-xl border border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#ffb95f] uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#ffb95f]" />
                Modelo do Caminhão & Placa
              </span>
              <span className="text-[10px] text-[#4edea3] font-mono font-bold">
                Editável pelo Motorista
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-[#bec6e0] uppercase mb-1">
                  Modelo do Veículo / Caminhão
                </label>
                <input
                  type="text"
                  list="edit-truck-models"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Ex: Hyundai HR, VW Delivery 11.180, Scania R540..."
                  className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#d8e3fb] font-semibold text-xs outline-hidden"
                />
                <datalist id="edit-truck-models">
                  <option value="Hyundai HR 2.5 Turbo" />
                  <option value="Volkswagen Delivery Express" />
                  <option value="Volkswagen Delivery 9.170" />
                  <option value="Volkswagen Delivery 11.180" />
                  <option value="Kia Bongo K2500" />
                  <option value="Mercedes-Benz Accelo 815" />
                  <option value="Mercedes-Benz Accelo 1016" />
                  <option value="Iveco Daily 35-150 / 65-170" />
                  <option value="Ford Cargo 816 / F-4000" />
                  <option value="Volkswagen Constellation 14.190" />
                  <option value="Mercedes-Benz Atego 1419" />
                  <option value="Volkswagen Constellation 24.280" />
                  <option value="Mercedes-Benz Atego 2426" />
                  <option value="Volvo VM 330 8x2" />
                  <option value="Scania R540 6x4 Super" />
                  <option value="Volvo FH 540 6x4 Globetrotter" />
                  <option value="Mercedes-Benz Actros 2651 6x4" />
                  <option value="DAF XF 530 6x4 Super Space Cab" />
                  <option value="Volkswagen Meteor 29.520 6x4" />
                  <option value="Scania R450 6x2" />
                  <option value="Volvo FH 460 6x2" />
                  <option value="Iveco S-Way 540 6x4" />
                  <option value="Bitrem 7 Eixos (Cavalo 6x4)" />
                  <option value="Rodotrem 9 Eixos (Dolly + Semirreboques)" />
                </datalist>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-[#bec6e0] uppercase mb-1">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="BRA-2026"
                  maxLength={8}
                  className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#ffb95f] font-mono font-black text-xs outline-hidden uppercase"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-[#bec6e0] uppercase mb-1">
                  Eixos do Veículo
                </label>
                <select
                  value={axles}
                  onChange={(e) => {
                    const newAxles = parseInt(e.target.value, 10) as VehicleAxles;
                    setAxles(newAxles);
                  }}
                  className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl px-2.5 text-[#d8e3fb] font-bold text-xs outline-hidden"
                >
                  <option value={2}>2 Eixos (VUC, Delivery, HR, Toco)</option>
                  <option value={3}>3 Eixos (Truck 6x2)</option>
                  <option value={4}>4 Eixos (Bitruck 8x2)</option>
                  <option value={5}>5 Eixos (Cavalo + Carreta 2E)</option>
                  <option value={6}>6 Eixos (Carreta LS 3E)</option>
                  <option value={7}>7 Eixos (Bitrem)</option>
                  <option value={9}>9 Eixos (Rodotrem)</option>
                </select>
              </div>
            </div>
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

            {/* Quick action to auto-fill final odometer based on route distance */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#334155]/60 text-xs">
              <span className="text-[11px] text-[#94a3b8]">
                KM Final Projetado (Saída + Rota): <strong className="text-[#4edea3] font-mono font-bold">{formatKm(startOdometerKm + totalDistanceKm)}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  handleCurrentOdometerChange(startOdometerKm + totalDistanceKm);
                }}
                className="text-[11px] font-bold text-[#ffb95f] hover:text-[#ffd699] hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                title="Preencher o KM Final somando a distância calculada da viagem"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Preencher KM Final Projetado</span>
              </button>
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
