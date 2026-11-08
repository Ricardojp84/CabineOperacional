import React, { useState, useEffect, useRef } from 'react';
import { CargoType, Trip, VehicleAxles, User, isAdminRole, isUserAdmin } from '../types/cockpit';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import { calculateAdvancedRoute, TripType } from '../data/brazilCitiesDatabase';
import { useCityAutocomplete, CityOption } from '../hooks/useCityAutocomplete';
import {
  Truck,
  Plus,
  X,
  ArrowRight,
  Check,
  Compass,
  Sparkles,
  Repeat,
  RotateCw,
  MapPin,
  Navigation,
  Globe,
  Loader2,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { PRESET_TRIPS } from '../data/mockRoutes';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrip: (trip: Trip) => void;
  onCreateCustomTrip: (trip: Trip) => void;
  currentUser?: User | null;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  onSelectTrip,
  onCreateCustomTrip,
  currentUser,
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');

  // Custom trip form states
  const [origin, setOrigin] = useState('Rio Verde - GO');
  const [destination, setDestination] = useState('Porto de Santos - SP');
  const [tripType, setTripType] = useState<TripType>('somente_ida');
  const [routeHighlights, setRouteHighlights] = useState('BR-060 ➔ BR-153 ➔ SP-310 ➔ SP-160');
  const [cargo, setCargo] = useState('Farelo de Soja a Granel');
  const [cargoType, setCargoType] = useState<CargoType>('granel_solido');
  const [cargoWeightTon, setCargoWeightTon] = useState(48.0);
  const [vehicleModel, setVehicleModel] = useState('Scania R540 6x4');
  const [vehiclePlate, setVehiclePlate] = useState('GO-RVD-9450');
  const [axles, setAxles] = useState<VehicleAxles>(9);
  const [grossFreight, setGrossFreight] = useState(19500);
  const [advancePayment, setAdvancePayment] = useState(13650);
  const [totalDistanceKm, setTotalDistanceKm] = useState(1150);
  const [startOdometerKm, setStartOdometerKm] = useState(435000);
  const [estimatedTollCost, setEstimatedTollCost] = useState(1120);

  // Directly utilize the custom hook useCityAutocomplete for both Origin and Destination
  const originAuto = useCityAutocomplete(origin, {
    debounceMs: 180,
    limit: 8,
    onSelect: (city: CityOption) => {
      setOrigin(city.fullLabel);
    },
  });

  const destAuto = useCityAutocomplete(destination, {
    debounceMs: 180,
    limit: 8,
    onSelect: (city: CityOption) => {
      setDestination(city.fullLabel);
    },
  });

  const originContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  // Close autocomplete dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originContainerRef.current && !originContainerRef.current.contains(e.target as Node)) {
        originAuto.setIsOpen(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(e.target as Node)) {
        destAuto.setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [originAuto, destAuto]);

  // Auto-calculate distance and tolls whenever origin, destination, axles or tripType change
  useEffect(() => {
    if (origin && destination) {
      const calc = calculateAdvancedRoute(origin, destination, axles, tripType);
      setTotalDistanceKm(calc.totalDistanceKm);
      setEstimatedTollCost(calc.totalTollCost);
      if (calc.highways) {
        setRouteHighlights(calc.highways);
      }
    }
  }, [origin, destination, axles, tripType]);

  if (!isOpen) return null;

  const handleUseGpsOrigin = () => {
    try {
      const saved = localStorage.getItem('cabine_last_gps');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nearestCity) {
          playSuccessChime();
          setOrigin(parsed.nearestCity);
          originAuto.setQuery(parsed.nearestCity);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessChime();

    const newTrip: Trip = {
      id: `custom-trip-${Date.now()}`,
      title: `${origin.split('-')[0].trim()} ➔ ${destination.split('-')[0].trim()} (${cargo.split(' ')[0]})`,
      origin,
      destination,
      routeHighlights,
      cargo,
      cargoType,
      cargoWeightTon,
      vehicleModel,
      vehiclePlate,
      axles,
      grossFreight,
      advancePayment,
      balancePayment: grossFreight - advancePayment,
      totalDistanceKm,
      completedDistanceKm: 0,
      currentOdometerKm: startOdometerKm,
      startOdometerKm,
      targetConsumptionKmL: 2.2,
      actualConsumptionKmL: 2.2,
      dieselAvgPricePerL: 6.29,
      arlaAvgPricePerL: 2.85,
      estimatedTollCost,
      startedAt: new Date().toISOString(),
      estimatedArrival: 'Em 48 horas',
      isCompleted: false,
      checkpoints: [
        {
          id: `cp-start-${Date.now()}`,
          name: `Pátio de Carregamento - ${origin}`,
          highway: routeHighlights.split('➔')[0]?.trim() || 'Rodovia',
          city: origin.split('-')[0].trim(),
          state: origin.split('-')[1]?.trim() || 'BR',
          status: 'active',
          type: 'partida',
          actualArrival: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: `cp-toll-1-${Date.now()}`,
          name: 'Praça de Pedágio Rodovia Principal',
          highway: routeHighlights.split('➔')[0]?.trim() || 'Rodovia',
          city: origin.split('-')[0].trim(),
          state: origin.split('-')[1]?.trim() || 'BR',
          status: 'upcoming',
          type: 'pedagio',
          tollFee: Math.round(estimatedTollCost / Math.max(1, Math.round(totalDistanceKm / 125))),
          tollTagDetected: true,
        },
        {
          id: `cp-dest-${Date.now()}`,
          name: `Pátio de Descarga - ${destination}`,
          highway: routeHighlights.split('➔').slice(-1)[0]?.trim() || 'Destino Final',
          city: destination.split('-')[0].trim(),
          state: destination.split('-')[1]?.trim() || 'BR',
          status: 'upcoming',
          type: 'descarga',
        },
      ],
      expenses: [],
    };

    onCreateCustomTrip(newTrip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#243248] border border-[#bec6e0] flex items-center justify-center text-[#bec6e0]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                Iniciar Nova Viagem
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Selecione uma rota pré-configurada ou crie um percurso personalizado com busca IBGE.
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

        {/* Tab Switcher: Rotas Pré-definidas vs Nova Rota Personalizada */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-[#081425] rounded-xl border border-[#334155]">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setMode('presets');
            }}
            className={`h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'presets'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#f59e0b]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Rotas Frequentes ({PRESET_TRIPS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setMode('custom');
            }}
            className={`h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'custom'
                ? 'bg-[#1e293b] text-[#4edea3] border border-[#10b981]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Criar Rota com Busca IBGE</span>
          </button>
        </div>

        {/* Mode 1: Presets Selection */}
        {mode === 'presets' ? (
          <div className="mt-4 space-y-3">
            {PRESET_TRIPS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  playSuccessChime();
                  onSelectTrip(preset);
                  onClose();
                }}
                className="p-4 rounded-xl bg-[#1e293b] border border-[#334155] hover:border-[#f59e0b] hover:bg-[#243248] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-extrabold text-sm text-[#d8e3fb] group-hover:text-[#ffb95f] flex items-center gap-1.5">
                    {preset.origin} <ArrowRight className="w-4 h-4 text-[#f59e0b]" /> {preset.destination}
                  </span>
                  <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-[#003824] text-[#10b981]">
                    {formatCurrency(preset.grossFreight)}
                  </span>
                </div>

                <div className="text-xs text-[#94a3b8] mb-2">
                  {preset.cargo} ({preset.cargoWeightTon}t) • {preset.vehicleModel}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#334155]/60 text-[#bec6e0] font-mono">
                  <span>Distância: {formatKm(preset.totalDistanceKm)}</span>
                  <span>{preset.routeHighlights}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Custom Trip Creation Form Powered directly by useCityAutocomplete */
          <form onSubmit={handleCreateCustom} className="mt-4 space-y-3.5">
            {/* Origin & Destination Autocomplete Fields using useCityAutocomplete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ORIGIN AUTOCOMPLETE FIELD */}
              <div ref={originContainerRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase">
                    Origem (Carregamento)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#38bdf8] font-mono flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#38bdf8]" /> IBGE
                    </span>
                    <button
                      type="button"
                      onClick={handleUseGpsOrigin}
                      className="text-[11px] font-bold text-[#f59e0b] hover:text-[#ffb95f] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Obter localização do GPS do aparelho"
                    >
                      <Navigation className="w-3 h-3 text-[#f59e0b]" />
                      Usar GPS
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Digite a cidade ou estado (ex: Sorriso, MT)..."
                    value={originAuto.query}
                    onFocus={() => originAuto.setIsOpen(true)}
                    onChange={(e) => {
                      originAuto.setQuery(e.target.value);
                      setOrigin(e.target.value);
                      originAuto.setIsOpen(true);
                    }}
                    className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl pl-9 pr-12 text-[#d8e3fb] font-semibold text-xs outline-hidden transition-colors"
                  />
                  <MapPin className="w-4 h-4 text-[#94a3b8] absolute left-3 top-4" />

                  <div className="absolute right-2.5 top-3 flex items-center gap-1">
                    {originAuto.isLoading && <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />}
                    {originAuto.query && !originAuto.isLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          playCockpitClick();
                          originAuto.clear();
                          setOrigin('');
                        }}
                        className="w-6 h-6 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#d8e3fb] flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Origin Dropdown */}
                {originAuto.isOpen && originAuto.cities.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#152031] border border-[#475569] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#334155] max-h-60 overflow-y-auto animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 bg-[#081425] text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#38bdf8]" />
                        Municípios IBGE
                      </span>
                      <span>Selecione para auto-preencher</span>
                    </div>
                    {originAuto.cities.map((city) => (
                      <div
                        key={`orig-${city.fullLabel}-${city.source}`}
                        onClick={() => {
                          playCockpitClick();
                          originAuto.selectCity(city);
                          setOrigin(city.fullLabel);
                        }}
                        className="p-2.5 hover:bg-[#243248] cursor-pointer flex items-center justify-between gap-2 transition-colors text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#d8e3fb] flex items-center gap-1.5">
                            <span>{city.city}</span>
                            <span className="font-mono text-[#ffb95f] font-extrabold px-1.5 py-0.2 bg-[#081425] rounded border border-[#334155]">
                              {city.state}
                            </span>
                            {city.stateName && (
                              <span className="text-[11px] text-[#94a3b8] hidden sm:inline">({city.stateName})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#94a3b8] flex items-center gap-1.5 mt-0.5">
                            {city.highways && city.highways[0] && (
                              <span className="font-mono text-[#bec6e0]">{city.highways[0]}</span>
                            )}
                            {city.region && <span>• {city.region}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {city.role && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0f172a] text-[#4edea3] border border-[#334155]">
                              {city.role}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-[#38bdf8] bg-[#081425] px-1.5 py-0.5 rounded border border-[#334155]">
                            {city.source === 'ibge' ? 'IBGE' : 'ROTAS'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DESTINATION AUTOCOMPLETE FIELD */}
              <div ref={destContainerRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase">
                    Destino (Descarga)
                  </label>
                  <span className="text-[10px] text-[#38bdf8] font-mono flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[#38bdf8]" /> IBGE
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Digite a cidade ou estado (ex: Santos, SP)..."
                    value={destAuto.query}
                    onFocus={() => destAuto.setIsOpen(true)}
                    onChange={(e) => {
                      destAuto.setQuery(e.target.value);
                      setDestination(e.target.value);
                      destAuto.setIsOpen(true);
                    }}
                    className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl pl-9 pr-12 text-[#d8e3fb] font-semibold text-xs outline-hidden transition-colors"
                  />
                  <MapPin className="w-4 h-4 text-[#94a3b8] absolute left-3 top-4" />

                  <div className="absolute right-2.5 top-3 flex items-center gap-1">
                    {destAuto.isLoading && <Loader2 className="w-4 h-4 text-[#f59e0b] animate-spin" />}
                    {destAuto.query && !destAuto.isLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          playCockpitClick();
                          destAuto.clear();
                          setDestination('');
                        }}
                        className="w-6 h-6 rounded-md hover:bg-[#1e293b] text-[#94a3b8] hover:text-[#d8e3fb] flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Destination Dropdown */}
                {destAuto.isOpen && destAuto.cities.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#152031] border border-[#475569] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#334155] max-h-60 overflow-y-auto animate-in fade-in duration-150">
                    <div className="px-3 py-1.5 bg-[#081425] text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-[#38bdf8]" />
                        Municípios IBGE
                      </span>
                      <span>Selecione para auto-preencher</span>
                    </div>
                    {destAuto.cities.map((city) => (
                      <div
                        key={`dest-${city.fullLabel}-${city.source}`}
                        onClick={() => {
                          playCockpitClick();
                          destAuto.selectCity(city);
                          setDestination(city.fullLabel);
                        }}
                        className="p-2.5 hover:bg-[#243248] cursor-pointer flex items-center justify-between gap-2 transition-colors text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[#d8e3fb] flex items-center gap-1.5">
                            <span>{city.city}</span>
                            <span className="font-mono text-[#ffb95f] font-extrabold px-1.5 py-0.2 bg-[#081425] rounded border border-[#334155]">
                              {city.state}
                            </span>
                            {city.stateName && (
                              <span className="text-[11px] text-[#94a3b8] hidden sm:inline">({city.stateName})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#94a3b8] flex items-center gap-1.5 mt-0.5">
                            {city.highways && city.highways[0] && (
                              <span className="font-mono text-[#bec6e0]">{city.highways[0]}</span>
                            )}
                            {city.region && <span>• {city.region}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {city.role && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0f172a] text-[#4edea3] border border-[#334155]">
                              {city.role}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-[#38bdf8] bg-[#081425] px-1.5 py-0.5 rounded border border-[#334155]">
                            {city.source === 'ibge' ? 'IBGE' : 'ROTAS'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Auto-fill KM Badge */}
            {origin && destination && totalDistanceKm > 0 && (
              <div className="p-3 rounded-xl bg-[#003824]/80 border border-[#10b981] flex flex-wrap items-center justify-between gap-2 text-xs text-[#a7f3d0] animate-in fade-in">
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#081425] px-2 py-0.5 rounded text-[#4edea3] border border-[#009365]/50">
                    Pedágios: {formatCurrency(estimatedTollCost)}
                  </span>
                </div>
              </div>
            )}

            {/* Trip Type Selector (Somente Ida vs Ida e Volta) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-[#081425] rounded-xl border border-[#334155]">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-[#ffb95f]" />
                  Modalidade do Percurso:
                </span>
                <p className="text-[11px] text-[#94a3b8]">
                  Defina se a rota contabiliza ida e volta para dobrar km e pedágios automaticamente.
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

            {/* Calculated & Editable Distance and Toll Banner */}
            <div className="p-3 rounded-xl bg-[#081425] border border-[#334155] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#d8e3fb] font-bold">
                  <Compass className="w-4 h-4 text-[#f59e0b]" />
                  <span>Quilometragem Total Prevista</span>
                  {tripType === 'ida_e_volta' && (
                    <span className="text-[10px] text-[#4edea3] font-bold px-1.5 py-0.5 rounded bg-[#003824] border border-[#10b981]/40">
                      Ida e Volta
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#4edea3] font-mono font-bold">
                  Pedágios: {formatCurrency(estimatedTollCost)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={totalDistanceKm}
                    onChange={(e) => setTotalDistanceKm(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full h-11 bg-[#152031] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl pl-3 pr-12 text-[#ffb95f] font-mono font-extrabold text-sm outline-hidden"
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
                      const calc = calculateAdvancedRoute(origin, destination, axles, tripType);
                      setTotalDistanceKm(calc.totalDistanceKm);
                      setEstimatedTollCost(calc.totalTollCost);
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

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Principais Rodovias (Roteiro Calculado)
              </label>
              <input
                type="text"
                value={routeHighlights}
                onChange={(e) => setRouteHighlights(e.target.value)}
                placeholder="Ex: BR-163 ➔ BR-364 ➔ SP-310"
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Carga
                </label>
                <input
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Tipo Carga
                </label>
                <select
                  value={cargoType}
                  onChange={(e) => setCargoType(e.target.value as CargoType)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-2 text-[#d8e3fb] text-xs font-bold outline-hidden"
                >
                  <option value="granel_solido">Granel Sólido</option>
                  <option value="granel_liquido">Granel Líquido</option>
                  <option value="frigorificada">Frigorificada</option>
                  <option value="conteinerizada">Conteinerizada</option>
                  <option value="carga_geral">Carga Geral</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Peso (Ton)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cargoWeightTon}
                  onChange={(e) => setCargoWeightTon(parseFloat(e.target.value) || 0)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-mono font-bold outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Eixos
                </label>
                <select
                  value={axles}
                  onChange={(e) => setAxles(parseInt(e.target.value, 10) as VehicleAxles)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-2 text-[#d8e3fb] text-xs font-bold outline-hidden"
                >
                  <option value={2}>2 Eixos (VUC, Delivery, HR, Toco)</option>
                  <option value={3}>3 Eixos - Truck</option>
                  <option value={4}>4 Eixos - Bitruck</option>
                  <option value={5}>5 Eixos - Cavalo + Carreta</option>
                  <option value={6}>6 Eixos - Carreta LS</option>
                  <option value={7}>7 Eixos - Bitrem</option>
                  <option value={9}>9 Eixos - Rodotrem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                  <span>Frete Bruto (R$)</span>
                  {!isAdmin && <Lock className="w-3 h-3 text-[#ea580c]" />}
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={grossFreight}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setGrossFreight(val);
                    setAdvancePayment(Math.round(val * 0.7));
                  }}
                  className={`w-full h-12 rounded-xl px-3 text-xs font-mono font-bold outline-hidden border-1.5 ${
                    isAdmin
                      ? 'bg-[#081425] border-[#334155] focus:border-[#f59e0b] text-[#4edea3]'
                      : 'bg-[#0a0f1d] border-[#1e293b] text-[#64748b] cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                  <span>Adiantamento 70%</span>
                  {!isAdmin && <Lock className="w-3 h-3 text-[#ea580c]" />}
                </label>
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={advancePayment}
                  onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                  className={`w-full h-12 rounded-xl px-3 text-xs font-mono font-bold outline-hidden border-1.5 ${
                    isAdmin
                      ? 'bg-[#081425] border-[#334155] focus:border-[#f59e0b] text-[#ffb95f]'
                      : 'bg-[#0a0f1d] border-[#1e293b] text-[#64748b] cursor-not-allowed'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Odômetro Inicial (KM)
                </label>
                <input
                  type="number"
                  value={startOdometerKm}
                  onChange={(e) => setStartOdometerKm(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-mono font-bold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Veículo & Placa
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    list="new-trip-models"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Ex: Hyundai HR, VW Delivery 11.180, Scania R540..."
                    className="flex-1 h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                  />
                  <datalist id="new-trip-models">
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
                    <option value="Bitrem 7 Eixos" />
                    <option value="Rodotrem 9 Eixos" />
                  </datalist>
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="Placa"
                    className="w-28 h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#ffb95f] text-xs font-mono font-bold outline-hidden uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-14 min-h-[56px] rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Iniciar Viagem Customizada ({formatKm(totalDistanceKm)})</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
