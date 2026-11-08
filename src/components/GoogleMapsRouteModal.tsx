import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { calculateAdvancedRoute, TripType, ALL_BRAZILIAN_CITIES } from '../data/brazilCitiesDatabase';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import { AutocompleteInput } from './AutocompleteInput';
import {
  Navigation,
  Compass,
  Receipt,
  Fuel,
  Clock,
  ExternalLink,
  Check,
  X,
  Sparkles,
  Truck,
  Repeat,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import { VehicleAxles } from '../types/cockpit';

interface GoogleMapsRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrigin: string;
  initialDestination: string;
  vehicleAxles: VehicleAxles;
  onApplyRoute: (result: {
    origin: string;
    destination: string;
    distanceKm: number;
    tollCount: number;
    totalTollCost: number;
    highways: string;
    tripType?: TripType;
  }) => void;
}

export const GoogleMapsRouteModal: React.FC<GoogleMapsRouteModalProps> = ({
  isOpen,
  onClose,
  initialOrigin,
  initialDestination,
  vehicleAxles,
  onApplyRoute,
}) => {
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [axles, setAxles] = useState<VehicleAxles>(vehicleAxles);
  const [tripType, setTripType] = useState<TripType>('somente_ida');

  const mapsApiKey = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  const [customDistanceKm, setCustomDistanceKm] = useState<number | null>(null);

  // Calculate metrics with automatic round-trip or one-way logic
  const routeData = calculateAdvancedRoute(origin, destination, axles, tripType);
  const effectiveDistanceKm = customDistanceKm !== null ? customDistanceKm : routeData.totalDistanceKm;

  // Reset custom distance when origin/destination/tripType change
  useEffect(() => {
    setCustomDistanceKm(null);
  }, [origin, destination, tripType]);

  // Find coordinates for origin and destination from comprehensive cities database
  const originHub = ALL_BRAZILIAN_CITIES.find((c) =>
    origin.toLowerCase().includes(c.city.toLowerCase())
  ) || ALL_BRAZILIAN_CITIES[0];

  const destHub = ALL_BRAZILIAN_CITIES.find((c) =>
    destination.toLowerCase().includes(c.city.toLowerCase())
  ) || ALL_BRAZILIAN_CITIES[18];

  const centerLat = (originHub.lat + destHub.lat) / 2;
  const centerLng = (originHub.lng + destHub.lng) / 2;

  if (!isOpen) return null;

  const handleOpenGoogleMapsNavigation = () => {
    playCockpitClick();
    const encodedOrigin = encodeURIComponent(origin.trim() + ', Brasil');
    const encodedDest = encodeURIComponent(destination.trim() + ', Brasil');

    let mapsUrl = '';
    if (tripType === 'ida_e_volta') {
      // Circuit: Origin -> Destination -> Origin
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedOrigin}&waypoints=${encodedDest}&travelmode=driving`;
    } else {
      mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDest}&travelmode=driving`;
    }

    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleApplyToTrip = () => {
    playSuccessChime();
    onApplyRoute({
      origin,
      destination,
      distanceKm: effectiveDistanceKm,
      tollCount: routeData.totalTollCount,
      totalTollCost: routeData.totalTollCost,
      highways: routeData.highways,
      tripType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b]">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb] flex items-center gap-2">
                Roteirizador Inteligente & Google Maps
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#003824] text-[#10b981] border border-[#10b981]/30">
                  Cálculo Automático
                </span>
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Auto-preenchimento de cidades/estados, cálculo de KM e pedágios com opção de Ida e Volta.
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

        {/* Origin & Destination Autocomplete Inputs */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AutocompleteInput
              label="Cidade de Origem (Carregamento)"
              value={origin}
              onChange={(val) => setOrigin(val)}
              placeholder="Digite a cidade ou estado (ex: Rondonópolis, MT, Sorriso)..."
              showGpsButton={true}
              onUseGpsLocation={() => {
                try {
                  const saved = localStorage.getItem('cabine_last_gps');
                  if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.nearestCity) setOrigin(parsed.nearestCity);
                  }
                } catch {
                  // Ignore
                }
              }}
            />

            <AutocompleteInput
              label="Cidade de Destino (Descarga)"
              value={destination}
              onChange={(val) => setDestination(val)}
              placeholder="Digite a cidade ou estado (ex: Santos, SP, Paranaguá)..."
            />
          </div>

          {/* Trip Type Selector: Somente Ida vs Ida e Volta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#081425] rounded-xl border border-[#334155]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5">
                <RotateCw className="w-4 h-4 text-[#ffb95f]" />
                Modalidade do Trajeto:
              </span>
              <p className="text-[11px] text-[#94a3b8]">
                Selecione se o frete cobre apenas o trajeto de ida ou ida e volta completo.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-[#152031] p-1 rounded-xl border border-[#334155] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setTripType('somente_ida');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tripType === 'somente_ida'
                    ? 'bg-[#2563eb] text-white shadow-md'
                    : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Somente Ida (1x)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setTripType('ida_e_volta');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tripType === 'ida_e_volta'
                    ? 'bg-[#10b981] text-[#022c22] font-black shadow-md'
                    : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Ida e Volta (2x)</span>
              </button>
            </div>
          </div>

          {/* Quick Route Corridor Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#94a3b8] mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" /> Corredores Frequentes:
            </span>
            {[
              { o: 'Rondonópolis - MT', d: 'Porto de Santos - SP' },
              { o: 'Sorriso - MT', d: 'Porto de Santos - SP' },
              { o: 'Cascavel - PR', d: 'Porto de Paranaguá - PR' },
              { o: 'Rio Verde - GO', d: 'Porto de Santos - SP' },
              { o: 'Chapecó - SC', d: 'Porto de Itajaí - SC' },
              { o: 'Betim - MG', d: 'Salvador - BA' },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setOrigin(p.o);
                  setDestination(p.d);
                }}
                className="h-7 px-2.5 rounded-md bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-[11px] font-semibold text-[#bec6e0] transition-colors cursor-pointer"
              >
                {p.o.split('-')[0].trim()} ➔ {p.d.split('-')[0].trim()}
              </button>
            ))}
          </div>
        </div>

        {/* Live Metrics Grid from Google Maps Corridor Engine */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center justify-between">
              <span className="flex items-center gap-1"><Navigation className="w-3 h-3 text-[#f59e0b]" /> Distância Total</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="1"
                value={effectiveDistanceKm}
                onChange={(e) => setCustomDistanceKm(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-[#152031] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-2 py-0.5 text-[#d8e3fb] font-mono text-base font-extrabold outline-hidden"
                title="Você pode ajustar manualmente a quilometragem conforme o velocímetro"
              />
              <span className="text-xs font-mono font-bold text-[#ffb95f]">KM</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] truncate font-mono mt-0.5">
              {tripType === 'ida_e_volta' ? `2x de ${formatKm(Math.round(effectiveDistanceKm / 2))}` : 'Trecho de ida'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center gap-1">
              <Receipt className="w-3 h-3 text-[#ffb95f]" /> Pedágios
            </div>
            <div className="font-mono text-xl font-extrabold text-[#ffb95f] mt-0.5">
              {routeData.totalTollCount} Praças
            </div>
            <div className="text-[10px] text-[#4edea3] font-mono font-bold truncate">
              {formatCurrency(routeData.totalTollCost)} ({axles} eixos)
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#38bdf8]" /> Tempo Estimado
            </div>
            <div className="font-mono text-xl font-extrabold text-[#d8e3fb] mt-0.5">
              ~{routeData.drivingHours}h
            </div>
            <div className="text-[10px] text-[#94a3b8]">Média 68 km/h</div>
          </div>

          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center gap-1">
              <Fuel className="w-3 h-3 text-[#ea580c]" /> Diesel Estimado
            </div>
            <div className="font-mono text-xl font-extrabold text-[#f59e0b] mt-0.5">
              {routeData.estimatedDieselLiters} L
            </div>
            <div className="text-[10px] text-[#94a3b8] font-mono">
              ~{formatCurrency(routeData.estimatedDieselCost)}
            </div>
          </div>
        </div>

        {/* Embedded Interactive Map Container */}
        <div className="w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-[#334155] relative bg-[#040e1f]">
          {mapsApiKey ? (
            <APIProvider apiKey={mapsApiKey} language="pt-BR" region="BR">
              <Map
                style={{ width: '100%', height: '100%' }}
                defaultCenter={{ lat: centerLat, lng: centerLng }}
                defaultZoom={5}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                {/* Origin Marker */}
                <AdvancedMarker position={{ lat: originHub.lat, lng: originHub.lng }} title={origin}>
                  <Pin background="#10b981" glyphColor="#022c22" borderColor="#022c22" />
                </AdvancedMarker>

                {/* Destination Marker */}
                <AdvancedMarker position={{ lat: destHub.lat, lng: destHub.lng }} title={destination}>
                  <Pin background="#f59e0b" glyphColor="#0f172a" borderColor="#0f172a" />
                </AdvancedMarker>
              </Map>
            </APIProvider>
          ) : (
            /* Visual Highway Waypoint Simulator */
            <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#081425] via-[#111c2d] to-[#152031]">
              <div className="flex items-center justify-between text-xs text-[#94a3b8] border-b border-[#334155] pb-2">
                <span className="font-bold flex items-center gap-1.5 text-[#d8e3fb]">
                  <Truck className="w-4 h-4 text-[#f59e0b]" />
                  Visualizador de Rota: {tripType === 'ida_e_volta' ? 'Ida e Volta' : 'Somente Ida'}
                </span>
                <span className="font-mono text-[11px] text-[#4edea3]">
                  {formatKm(routeData.totalDistanceKm)}
                </span>
              </div>

              {/* Waypoint line */}
              <div className="relative py-6 px-4">
                <div className="w-full h-1 bg-[#334155] rounded-full absolute top-1/2 -translate-y-1/2 left-0 right-0 z-0" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-[#10b981] border-2 border-[#022c22] flex items-center justify-center text-[10px] font-bold text-[#022c22]">
                      A
                    </div>
                    <span className="text-[11px] font-bold text-[#d8e3fb] mt-1">{origin.split('-')[0].trim()}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="px-2 py-0.5 rounded bg-[#472a00] border border-[#f59e0b] text-[10px] font-mono text-[#ffb95f] font-bold">
                      {routeData.totalTollCount} Praças
                    </div>
                    <span className="text-[10px] text-[#94a3b8] mt-1">{routeData.highways.split('➔')[0]}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full bg-[#f59e0b] border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold text-[#0f172a]">
                      B
                    </div>
                    <span className="text-[11px] font-bold text-[#ffb95f] mt-1">{destination.split('-')[0].trim()}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-[#94a3b8] flex items-center justify-between border-t border-[#334155] pt-2">
                <span>Praças de Pedágio (ANTT & Concessionárias)</span>
                <span className="text-[#ffb95f] font-bold">{formatCurrency(routeData.totalTollCost)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-2 flex flex-col sm:flex-row gap-2.5">
          {/* Direct Google Maps Navigation Button */}
          <button
            type="button"
            onClick={handleOpenGoogleMapsNavigation}
            className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <ExternalLink className="w-5 h-5" />
            <span>Navegar no Google Maps {tripType === 'ida_e_volta' ? '(Ida + Volta)' : ''}</span>
          </button>

          {/* Apply this route and sync distance & tolls to the cockpit */}
          <button
            type="button"
            onClick={handleApplyToTrip}
            className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Sincronizar no Cockpit ({formatKm(effectiveDistanceKm)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
