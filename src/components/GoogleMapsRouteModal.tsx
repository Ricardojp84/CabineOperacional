import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMapView,
  AdvancedMarker,
  Pin,
  InfoWindow,
  Polyline,
  Circle,
  CollisionBehavior,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { calculateAdvancedRoute, TripType, ALL_BRAZILIAN_CITIES } from '../data/brazilCitiesDatabase';
import {
  analyzeRouteTollHotspots,
  RouteTollPoint,
  TollCostSeverity,
} from '../data/tollPlazasDatabase';
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
  Repeat,
  ArrowRight,
  RotateCw,
  AlertTriangle,
  TrendingDown,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  ShieldAlert,
  Route as RouteIcon,
  Info,
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

const SEVERITY_COLORS: Record<
  TollCostSeverity,
  { bg: string; border: string; text: string; pinBg: string; pinBorder: string; label: string }
> = {
  critical: {
    bg: '#450a0a',
    border: '#ef4444',
    text: '#fca5a5',
    pinBg: '#ef4444',
    pinBorder: '#7f1d1d',
    label: 'Pedágio Crítico',
  },
  moderate: {
    bg: '#472a00',
    border: '#f59e0b',
    text: '#fde68a',
    pinBg: '#f59e0b',
    pinBorder: '#78350f',
    label: 'Custo Moderado',
  },
  low: {
    bg: '#022c22',
    border: '#10b981',
    text: '#6ee7b7',
    pinBg: '#10b981',
    pinBorder: '#064e3b',
    label: 'Custo Econômico',
  },
};

/**
 * Pure ease-out cubic interpolation helper for numeric counter transitions.
 */
export function interpolateAnimatedValue(from: number, to: number, rawProgress: number): number {
  const t = Math.max(0, Math.min(1, rawProgress));
  const eased = 1 - Math.pow(1 - t, 3);
  return from + (to - from) * eased;
}

/**
 * Smoothly animates numeric transitions (e.g. toll total recalculations) via requestAnimationFrame.
 * When replaySignal increments (e.g. modal opens), resets baseline to 0 for an incremental count-up.
 */
function useAnimatedNumber(
  targetValue: number,
  durationMs = 580,
  replaySignal?: number
): { value: number; isAnimating: boolean; direction: 'up' | 'down' | 'idle' } {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [direction, setDirection] = useState<'up' | 'down' | 'idle'>('idle');
  const currentRef = useRef<number>(targetValue);
  const lastReplayRef = useRef<number | undefined>(replaySignal);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const isReplay = replaySignal !== undefined && replaySignal !== lastReplayRef.current;
    if (isReplay) {
      lastReplayRef.current = replaySignal;
      currentRef.current = 0;
      setDisplayValue(0);
    }

    const startValue = currentRef.current;
    if (startValue === targetValue) {
      setIsAnimating(false);
      setDirection('idle');
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || durationMs <= 0) {
      currentRef.current = targetValue;
      setDisplayValue(targetValue);
      setIsAnimating(false);
      setDirection('idle');
      return;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    setDirection(targetValue >= startValue ? 'up' : 'down');
    setIsAnimating(true);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const nextValue = interpolateAnimatedValue(startValue, targetValue, progress);
      currentRef.current = nextValue;
      setDisplayValue(nextValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = targetValue;
        setDisplayValue(targetValue);
        setIsAnimating(false);
        setDirection('idle');
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetValue, durationMs, replaySignal]);

  return { value: displayValue, isAnimating, direction };
}

const AnimatedCurrencyCounter: React.FC<{
  value: number;
  durationMs?: number;
  replaySignal?: number;
  className?: string;
}> = ({ value, durationMs = 580, replaySignal, className = '' }) => {
  const { value: animatedVal, isAnimating } = useAnimatedNumber(value, durationMs, replaySignal);
  return (
    <span
      className={`inline-block tabular-nums transition-transform duration-150 ${
        isAnimating ? 'scale-[1.04] brightness-110' : 'scale-100'
      } ${className}`}
    >
      {formatCurrency(Math.round(animatedVal))}
    </span>
  );
};

const TollCostKpiCard: React.FC<{
  totalCost: number;
  tollCount: number;
  axles: VehicleAxles;
  isEcoMode: boolean;
  replaySignal: number;
}> = ({ totalCost, tollCount, axles, isEcoMode, replaySignal }) => {
  const { value: animatedCost, isAnimating, direction } = useAnimatedNumber(
    totalCost,
    620,
    replaySignal
  );
  const { value: animatedPlazas } = useAnimatedNumber(tollCount, 460, replaySignal);

  return (
    <div
      className={`p-3 rounded-xl border transition-all duration-300 ${
        isEcoMode
          ? 'bg-[#00291a] border-[#10b981]/60'
          : 'bg-[#081425] border-[#334155]'
      } ${
        isAnimating
          ? direction === 'down'
            ? 'ring-2 ring-[#10b981]/60 shadow-lg shadow-emerald-500/15'
            : 'ring-2 ring-[#f59e0b]/60 shadow-lg shadow-amber-500/15'
          : ''
      }`}
    >
      <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Receipt className="w-3 h-3 text-[#ffb95f]" /> Custo de Pedágios
        </span>
        {isEcoMode && (
          <span className="text-[9px] font-extrabold text-[#34d399] bg-[#064e3b] px-1.5 py-0.2 rounded">
            ECONÔMICA
          </span>
        )}
      </div>
      <div
        className={`font-mono text-xl font-extrabold mt-0.5 tabular-nums transition-all duration-150 ${
          isAnimating
            ? direction === 'down'
              ? 'text-[#34d399] scale-[1.03] origin-left'
              : 'text-[#fde68a] scale-[1.03] origin-left'
            : 'text-[#ffb95f] scale-100'
        }`}
      >
        {formatCurrency(Math.round(animatedCost))}
      </div>
      <div className="text-[10px] text-[#4edea3] font-mono font-bold truncate tabular-nums">
        {Math.round(animatedPlazas)} Praças · {axles} eixos
      </div>
    </div>
  );
};

/**
 * Helper sub-component inside <GoogleMapView> to fit route bounds and focus selected toll hotspots.
 */
const RouteMapCameraController: React.FC<{
  originCoords: { lat: number; lng: number };
  destCoords: { lat: number; lng: number };
  plazas: RouteTollPoint[];
  selectedPlaza: RouteTollPoint | null;
  fitTrigger: number;
}> = ({ originCoords, destCoords, plazas, selectedPlaza, fitTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const pts = [originCoords, destCoords, ...plazas.map((p) => ({ lat: p.lat, lng: p.lng }))];
    const bounds = {
      north: Math.max(...pts.map((p) => p.lat)) + 0.25,
      south: Math.min(...pts.map((p) => p.lat)) - 0.25,
      east: Math.max(...pts.map((p) => p.lng)) + 0.25,
      west: Math.min(...pts.map((p) => p.lng)) - 0.25,
    };
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng, plazas, fitTrigger]);

  useEffect(() => {
    if (!map || !selectedPlaza) return;
    map.panTo({ lat: selectedPlaza.lat, lng: selectedPlaza.lng });
  }, [map, selectedPlaza]);

  return null;
};

/**
 * Anchored AdvancedMarker + InfoWindow for each Toll Plaza on Google Maps.
 */
const TollPlazaMapMarker: React.FC<{
  plaza: RouteTollPoint;
  isSelected: boolean;
  isAvoidedInEco: boolean;
  axles: VehicleAxles;
  tripType: TripType;
  onSelect: (plaza: RouteTollPoint) => void;
  onCloseInfo: () => void;
}> = ({ plaza, isSelected, isAvoidedInEco, axles, tripType, onSelect, onCloseInfo }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const style = SEVERITY_COLORS[plaza.severity];

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: plaza.lat, lng: plaza.lng }}
        title={`${plaza.name} — ${formatCurrency(plaza.totalCost)}`}
        zIndex={isSelected ? 1000 : plaza.severity === 'critical' ? 500 : 100}
        collisionBehavior={
          plaza.severity === 'critical'
            ? CollisionBehavior.REQUIRED
            : CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY
        }
        onClick={() => {
          playCockpitClick();
          onSelect(plaza);
        }}
      >
        <div
          className={`px-2 py-1 rounded-lg border-2 shadow-lg flex items-center gap-1 text-[11px] font-mono font-extrabold transition-transform cursor-pointer ${
            isSelected ? 'scale-115 ring-2 ring-white' : 'hover:scale-105'
          } ${isAvoidedInEco ? 'opacity-50 line-through' : ''}`}
          style={{
            backgroundColor: style.bg,
            borderColor: style.border,
            color: style.text,
          }}
        >
          <span>#{plaza.rank}</span>
          <span>{formatCurrency(plaza.totalCost)}</span>
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={270} onCloseClick={onCloseInfo}>
          <div className="text-slate-900 p-0.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
              <span className="font-extrabold text-slate-900 leading-tight">{plaza.name}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                style={{
                  backgroundColor: style.pinBg,
                  color: '#ffffff',
                }}
              >
                #{plaza.rank} Maior
              </span>
            </div>
            <div className="text-[11px] text-slate-600 font-semibold">
              {plaza.highway} ({plaza.kmMarker}) · {plaza.concessionaire}
            </div>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 rounded-lg p-1.5 text-[11px]">
              <div>
                <div className="text-slate-500">Por Eixo</div>
                <div className="font-mono font-bold text-slate-900">{formatCurrency(plaza.costPerAxle)}</div>
              </div>
              <div>
                <div className="text-slate-500">
                  Total ({axles}e {tripType === 'ida_e_volta' ? '2x' : '1x'})
                </div>
                <div className="font-mono font-extrabold text-red-600">
                  {formatCurrency(plaza.totalCost)} ({plaza.sharePercent}%)
                </div>
              </div>
            </div>
            <div className="text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md p-1.5 leading-snug">
              <strong>Dica Econômica:</strong> {plaza.bypassTip}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

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
  const [customDistanceKm, setCustomDistanceKm] = useState<number | null>(null);

  // Interactive Toll Hotspot & Route Economy State
  const [routeMode, setRouteMode] = useState<'standard' | 'economical'>('standard');
  const [tollFilter, setTollFilter] = useState<'all' | 'critical'>('all');
  const [selectedPlazaId, setSelectedPlazaId] = useState<string | null>(null);
  const [mapZoomScale, setMapZoomScale] = useState<number>(1);
  const [fitTrigger, setFitTrigger] = useState<number>(0);

  const mapsApiKey =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setOrigin(initialOrigin);
      setDestination(initialDestination);
      setAxles(vehicleAxles);
      setRouteMode('standard');
      setSelectedPlazaId(null);
      setMapZoomScale(1);
      setFitTrigger((prev) => prev + 1);
    }
  }, [isOpen, initialOrigin, initialDestination, vehicleAxles]);

  // Calculate base route metrics
  const routeData = calculateAdvancedRoute(origin, destination, axles, tripType);

  // Reset custom distance when origin/destination/tripType/routeMode change
  useEffect(() => {
    setCustomDistanceKm(null);
    setSelectedPlazaId(null);
  }, [origin, destination, tripType]);

  // Find coordinates for origin and destination from cities database
  const originHub =
    ALL_BRAZILIAN_CITIES.find((c) => origin.toLowerCase().includes(c.city.toLowerCase())) ||
    ALL_BRAZILIAN_CITIES[0];

  const destHub =
    ALL_BRAZILIAN_CITIES.find((c) => destination.toLowerCase().includes(c.city.toLowerCase())) ||
    ALL_BRAZILIAN_CITIES[18];

  const centerLat = (originHub.lat + destHub.lat) / 2;
  const centerLng = (originHub.lng + destHub.lng) / 2;

  // Compute toll hotspots and economical alternative route
  const tollAnalysis = useMemo(
    () =>
      analyzeRouteTollHotspots({
        origin,
        destination,
        originCoords: { lat: originHub.lat, lng: originHub.lng },
        destCoords: { lat: destHub.lat, lng: destHub.lng },
        totalDistanceKm: routeData.totalDistanceKm,
        totalTollCount: routeData.totalTollCount,
        totalTollCost: routeData.totalTollCost,
        highways: routeData.highways,
        axles,
        tripType,
      }),
    [
      origin,
      destination,
      originHub.lat,
      originHub.lng,
      destHub.lat,
      destHub.lng,
      routeData.totalDistanceKm,
      routeData.totalTollCount,
      routeData.totalTollCost,
      routeData.highways,
      axles,
      tripType,
    ]
  );

  // Effective route metrics based on Standard vs Economical selection
  const isEcoMode = routeMode === 'economical';
  const baseModeDistance = isEcoMode
    ? tollAnalysis.economicalOption.distanceKm
    : routeData.totalDistanceKm;
  const effectiveDistanceKm = customDistanceKm !== null ? customDistanceKm : baseModeDistance;
  const effectiveTollCount = isEcoMode
    ? tollAnalysis.economicalOption.tollCount
    : routeData.totalTollCount;
  const effectiveTollCost = isEcoMode
    ? tollAnalysis.economicalOption.totalTollCost
    : routeData.totalTollCost;
  const effectiveHighways = isEcoMode ? tollAnalysis.economicalOption.highways : routeData.highways;
  const effectiveDrivingHours = Math.round((effectiveDistanceKm / 68) * 10) / 10;
  const effectiveDieselLiters = Math.round(effectiveDistanceKm / 2.2);
  const effectiveDieselCost = Math.round(effectiveDieselLiters * routeData.avgDieselPricePerL);

  const visiblePlazas = useMemo(() => {
    if (tollFilter === 'critical') {
      return tollAnalysis.plazas.filter((p) => p.severity === 'critical');
    }
    return tollAnalysis.plazas;
  }, [tollAnalysis.plazas, tollFilter]);

  const selectedPlaza = useMemo(
    () => tollAnalysis.plazas.find((p) => p.id === selectedPlazaId) || null,
    [tollAnalysis.plazas, selectedPlazaId]
  );

  // Compute SVG projection coordinates for the Interactive Corridor Geo-Map (fallback when API key absent)
  const svgProjection = useMemo(() => {
    const allPts = [
      { lat: originHub.lat, lng: originHub.lng },
      { lat: destHub.lat, lng: destHub.lng },
      ...tollAnalysis.plazas.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...tollAnalysis.economicalOption.waypoints,
    ];
    let minLat = Math.min(...allPts.map((p) => p.lat));
    let maxLat = Math.max(...allPts.map((p) => p.lat));
    let minLng = Math.min(...allPts.map((p) => p.lng));
    let maxLng = Math.max(...allPts.map((p) => p.lng));

    const latSpan = Math.max(0.8, maxLat - minLat);
    const lngSpan = Math.max(0.8, maxLng - minLng);
    minLat -= latSpan * 0.18;
    maxLat += latSpan * 0.18;
    minLng -= lngSpan * 0.15;
    maxLng += lngSpan * 0.15;

    const width = 720;
    const height = 300;
    const project = (lat: number, lng: number) => {
      const x = ((lng - minLng) / (maxLng - minLng)) * (width - 80) + 40;
      const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 64) + 32;
      return { x, y };
    };

    const stdPoints = tollAnalysis.standardPath
      .map((pt) => {
        const p = project(pt.lat, pt.lng);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');

    const ecoPoints = tollAnalysis.economicalOption.waypoints
      .map((pt) => {
        const p = project(pt.lat, pt.lng);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');

    return {
      width,
      height,
      project,
      originXY: project(originHub.lat, originHub.lng),
      destXY: project(destHub.lat, destHub.lng),
      stdPoints,
      ecoPoints,
    };
  }, [originHub, destHub, tollAnalysis]);

  const handleSelectPlaza = useCallback((plaza: RouteTollPoint) => {
    playCockpitClick();
    setSelectedPlazaId((prev) => (prev === plaza.id ? null : plaza.id));
  }, []);

  if (!isOpen) return null;

  const handleOpenGoogleMapsNavigation = () => {
    playCockpitClick();
    const encodedOrigin = encodeURIComponent(origin.trim() + ', Brasil');
    const encodedDest = encodeURIComponent(destination.trim() + ', Brasil');

    let mapsUrl = '';
    if (tripType === 'ida_e_volta') {
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
      tollCount: effectiveTollCount,
      totalTollCost: effectiveTollCost,
      highways: effectiveHighways,
      tripType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b]">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb] flex flex-wrap items-center gap-2">
                Roteirizador Inteligente & Mapa de Pedágios
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#003824] text-[#10b981] border border-[#10b981]/30">
                  Otimizador de Custos
                </span>
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Identifique os pontos de maior custo de pedágio no mapa e compare rotas mais econômicas.
              </p>
            </div>
          </div>
          <button
            type="button"
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

          {/* Trip Type & Axle Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-[#081425] rounded-xl border border-[#334155]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-[#ffb95f]" />
                  Trajeto:
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#152031] p-1 rounded-xl border border-[#334155]">
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setTripType('somente_ida');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
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

            {/* Quick Axle selector for toll sensitivity */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase">Eixos:</span>
              <div className="flex items-center gap-1 bg-[#152031] p-1 rounded-lg border border-[#334155]">
                {([4, 6, 7, 9] as VehicleAxles[]).map((ax) => (
                  <button
                    key={ax}
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setAxles(ax);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      axles === ax
                        ? 'bg-[#f59e0b] text-[#0f172a]'
                        : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    {ax}e
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Route Corridor Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-[#94a3b8] mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" /> Corredores:
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

        {/* Live Metrics Grid (reflects Standard or Economical mode) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-[#f59e0b]" /> Distância Total
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <input
                type="number"
                min="1"
                step="1"
                value={effectiveDistanceKm}
                onChange={(e) =>
                  setCustomDistanceKm(Math.max(1, parseInt(e.target.value, 10) || 0))
                }
                className="w-full bg-[#152031] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-2 py-0.5 text-[#d8e3fb] font-mono text-base font-extrabold outline-hidden"
                title="Ajuste manualmente se necessário"
              />
              <span className="text-xs font-mono font-bold text-[#ffb95f]">KM</span>
            </div>
            <div className="text-[10px] text-[#94a3b8] truncate font-mono mt-0.5">
              {isEcoMode ? `+${tollAnalysis.economicalOption.extraKm} km desvio` : tripType === 'ida_e_volta' ? 'Ida + Volta' : 'Trecho de ida'}
            </div>
          </div>

          <TollCostKpiCard
            totalCost={effectiveTollCost}
            tollCount={effectiveTollCount}
            axles={axles}
            isEcoMode={isEcoMode}
            replaySignal={fitTrigger}
          />

          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#38bdf8]" /> Tempo Estimado
            </div>
            <div className="font-mono text-xl font-extrabold text-[#d8e3fb] mt-0.5">
              ~{effectiveDrivingHours}h
            </div>
            <div className="text-[10px] text-[#94a3b8]">Média 68 km/h</div>
          </div>

          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155]">
            <div className="text-[10px] font-bold uppercase text-[#94a3b8] flex items-center gap-1">
              <Fuel className="w-3 h-3 text-[#ea580c]" /> Diesel Estimado
            </div>
            <div className="font-mono text-xl font-extrabold text-[#f59e0b] mt-0.5">
              {effectiveDieselLiters} L
            </div>
            <div className="text-[10px] text-[#94a3b8] font-mono">
              ~{formatCurrency(effectiveDieselCost)}
            </div>
          </div>
        </div>

        {/* Interactive Map Controls & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 bg-[#081425] px-3 py-2 rounded-xl border border-[#334155]">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setRouteMode('standard');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                routeMode === 'standard'
                  ? 'bg-[#f59e0b] text-[#0f172a]'
                  : 'bg-[#152031] text-[#94a3b8] hover:text-[#d8e3fb] border border-[#334155]'
              }`}
            >
              <RouteIcon className="w-3.5 h-3.5" />
              <span>
                Rota Padrão (
                <AnimatedCurrencyCounter
                  value={routeData.totalTollCost}
                  durationMs={480}
                  replaySignal={fitTrigger}
                />
                )
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setRouteMode('economical');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                routeMode === 'economical'
                  ? 'bg-[#10b981] text-[#022c22]'
                  : 'bg-[#152031] text-[#6ee7b7] hover:bg-[#064e3b]/50 border border-[#10b981]/40'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                Rota Econômica (
                <AnimatedCurrencyCounter
                  value={tollAnalysis.economicalOption.totalTollCost}
                  durationMs={480}
                  replaySignal={fitTrigger}
                />
                )
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setTollFilter('all');
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                tollFilter === 'all'
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#152031] text-[#94a3b8] hover:text-[#d8e3fb]'
              }`}
            >
              Todos ({tollAnalysis.plazas.length})
            </button>
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setTollFilter('critical');
              }}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                tollFilter === 'critical'
                  ? 'bg-[#ef4444] text-white'
                  : 'bg-[#450a0a]/60 text-[#fca5a5] border border-[#ef4444]/40 hover:bg-[#450a0a]'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Alto Custo ({tollAnalysis.criticalCount})</span>
            </button>
          </div>
        </div>

        {/* Embedded Interactive Toll Hotspot Map Container */}
        <div className="w-full h-72 sm:h-80 rounded-xl overflow-hidden border border-[#334155] relative bg-[#040e1f]">
          {/* Map Legend Overlay */}
          <div className="absolute top-2.5 left-2.5 z-20 bg-[#081425]/90 backdrop-blur-xs border border-[#334155] rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-2.5 text-[10px] font-bold shadow-lg pointer-events-none">
            <span className="flex items-center gap-1 text-[#fca5a5]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block ring-2 ring-[#ef4444]/40" />
              Alto Custo
            </span>
            <span className="flex items-center gap-1 text-[#fde68a]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" />
              Moderado
            </span>
            <span className="flex items-center gap-1 text-[#6ee7b7]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" />
              Econômico
            </span>
          </div>

          {mapsApiKey ? (
            <APIProvider apiKey={mapsApiKey} libraries={['marker']} language="pt-BR" region="BR">
              <GoogleMapView
                style={{ width: '100%', height: '100%' }}
                defaultCenter={{ lat: centerLat, lng: centerLng }}
                defaultZoom={5}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                <RouteMapCameraController
                  originCoords={{ lat: originHub.lat, lng: originHub.lng }}
                  destCoords={{ lat: destHub.lat, lng: destHub.lng }}
                  plazas={visiblePlazas}
                  selectedPlaza={selectedPlaza}
                  fitTrigger={fitTrigger}
                />

                {/* Standard Corridor Polyline */}
                <Polyline
                  path={tollAnalysis.standardPath}
                  strokeColor={isEcoMode ? '#64748b' : '#f59e0b'}
                  strokeOpacity={isEcoMode ? 0.5 : 0.9}
                  strokeWeight={isEcoMode ? 3 : 5}
                />

                {/* Economical Alternative Corridor Polyline */}
                <Polyline
                  path={tollAnalysis.economicalOption.waypoints}
                  strokeColor="#10b981"
                  strokeOpacity={isEcoMode ? 0.95 : 0.55}
                  strokeWeight={isEcoMode ? 5 : 3}
                />

                {/* Cost-intensity halo circles around high/moderate toll hotspots */}
                {visiblePlazas
                  .filter((p) => p.severity !== 'low')
                  .map((plaza) => (
                    <Circle
                      key={`halo-${plaza.id}`}
                      center={{ lat: plaza.lat, lng: plaza.lng }}
                      radius={plaza.severity === 'critical' ? 32000 : 18000}
                      strokeColor={plaza.severity === 'critical' ? '#ef4444' : '#f59e0b'}
                      strokeOpacity={isEcoMode && plaza.avoidableInEco ? 0.2 : 0.65}
                      strokeWeight={1.5}
                      fillColor={plaza.severity === 'critical' ? '#ef4444' : '#f59e0b'}
                      fillOpacity={isEcoMode && plaza.avoidableInEco ? 0.08 : plaza.severity === 'critical' ? 0.24 : 0.14}
                      clickable={false}
                    />
                  ))}

                {/* Origin Marker */}
                <AdvancedMarker position={{ lat: originHub.lat, lng: originHub.lng }} title={origin}>
                  <Pin background="#10b981" glyphColor="#022c22" borderColor="#022c22" />
                </AdvancedMarker>

                {/* Destination Marker */}
                <AdvancedMarker position={{ lat: destHub.lat, lng: destHub.lng }} title={destination}>
                  <Pin background="#f59e0b" glyphColor="#0f172a" borderColor="#0f172a" />
                </AdvancedMarker>

                {/* Interactive Toll Hotspot Markers with Anchored InfoWindows */}
                {visiblePlazas.map((plaza) => (
                  <TollPlazaMapMarker
                    key={plaza.id}
                    plaza={plaza}
                    isSelected={selectedPlazaId === plaza.id}
                    isAvoidedInEco={isEcoMode && plaza.avoidableInEco}
                    axles={axles}
                    tripType={tripType}
                    onSelect={handleSelectPlaza}
                    onCloseInfo={() => setSelectedPlazaId(null)}
                  />
                ))}
              </GoogleMapView>

              {/* Center route quick button */}
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setSelectedPlazaId(null);
                  setFitTrigger((prev) => prev + 1);
                }}
                className="absolute bottom-3 left-2.5 z-20 px-2.5 py-1.5 rounded-lg bg-[#081425]/90 hover:bg-[#152031] border border-[#475569] text-[11px] font-bold text-[#d8e3fb] flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span>Centrar Rota</span>
              </button>
            </APIProvider>
          ) : (
            /* Interactive Corridor Toll Hotspot Map (when Google Maps API key is not configured) */
            <div className="w-full h-full relative bg-gradient-to-br from-[#061121] via-[#0b192e] to-[#081425] select-none overflow-hidden">
              {/* Zoom & Fit Controls */}
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-[#081425]/90 border border-[#334155] rounded-lg p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setMapZoomScale((z) => Math.min(2, Math.round((z + 0.25) * 100) / 100));
                  }}
                  title="Aumentar zoom"
                  className="w-7 h-7 rounded bg-[#152031] hover:bg-[#1e293b] text-[#d8e3fb] flex items-center justify-center cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setMapZoomScale((z) => Math.max(0.85, Math.round((z - 0.25) * 100) / 100));
                  }}
                  title="Reduzir zoom"
                  className="w-7 h-7 rounded bg-[#152031] hover:bg-[#1e293b] text-[#d8e3fb] flex items-center justify-center cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setMapZoomScale(1);
                    setSelectedPlazaId(null);
                  }}
                  title="Centrar rota"
                  className="px-2 h-7 rounded bg-[#152031] hover:bg-[#1e293b] text-[10px] font-bold text-[#ffb95f] flex items-center gap-1 cursor-pointer"
                >
                  <LocateFixed className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Interactive SVG Map Canvas */}
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${mapZoomScale})` }}
              >
                <svg
                  viewBox={`0 0 ${svgProjection.width} ${svgProjection.height}`}
                  className="w-full h-full"
                  role="img"
                  aria-label="Mapa interativo de pontos com maior custo de pedágio na rota"
                >
                  <defs>
                    <pattern id="cockpitGrid" width="36" height="36" patternUnits="userSpaceOnUse">
                      <path
                        d="M 36 0 L 0 0 0 36"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="0.7"
                      />
                    </pattern>
                    <radialGradient id="criticalHeat" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.48" />
                      <stop offset="65%" stopColor="#ef4444" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="moderateHeat" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.34" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#cockpitGrid)" />

                  {/* Economical Bypass Corridor Line */}
                  <polyline
                    points={svgProjection.ecoPoints}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={isEcoMode ? 4.5 : 2.5}
                    strokeDasharray={isEcoMode ? 'none' : '7 5'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isEcoMode ? 0.95 : 0.65}
                  />

                  {/* Main Route Corridor Line */}
                  <polyline
                    points={svgProjection.stdPoints}
                    fill="none"
                    stroke={isEcoMode ? '#64748b' : '#f59e0b'}
                    strokeWidth={isEcoMode ? 2.5 : 4.5}
                    strokeDasharray={isEcoMode ? '5 5' : 'none'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isEcoMode ? 0.55 : 0.92}
                  />

                  {/* Cost-Intensity Heat Halos */}
                  {visiblePlazas.map((plaza) => {
                    const pt = svgProjection.project(plaza.lat, plaza.lng);
                    if (plaza.severity === 'low') return null;
                    const radius = plaza.severity === 'critical' ? 36 : 24;
                    return (
                      <circle
                        key={`svg-heat-${plaza.id}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={radius}
                        fill={
                          plaza.severity === 'critical'
                            ? 'url(#criticalHeat)'
                            : 'url(#moderateHeat)'
                        }
                        opacity={isEcoMode && plaza.avoidableInEco ? 0.25 : 1}
                      />
                    );
                  })}

                  {/* Origin Node */}
                  <g>
                    <circle
                      cx={svgProjection.originXY.x}
                      cy={svgProjection.originXY.y}
                      r={10}
                      fill="#10b981"
                      stroke="#022c22"
                      strokeWidth={2.5}
                    />
                    <text
                      x={svgProjection.originXY.x}
                      y={svgProjection.originXY.y + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#022c22"
                    >
                      A
                    </text>
                    <text
                      x={svgProjection.originXY.x}
                      y={svgProjection.originXY.y + 22}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#6ee7b7"
                    >
                      {origin.split('-')[0].trim()}
                    </text>
                  </g>

                  {/* Destination Node */}
                  <g>
                    <circle
                      cx={svgProjection.destXY.x}
                      cy={svgProjection.destXY.y}
                      r={10}
                      fill="#f59e0b"
                      stroke="#0f172a"
                      strokeWidth={2.5}
                    />
                    <text
                      x={svgProjection.destXY.x}
                      y={svgProjection.destXY.y + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fill="#0f172a"
                    >
                      B
                    </text>
                    <text
                      x={svgProjection.destXY.x}
                      y={svgProjection.destXY.y + 22}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill="#fde68a"
                    >
                      {destination.split('-')[0].trim()}
                    </text>
                  </g>

                  {/* Interactive Toll Plaza Hotspot Pins */}
                  {visiblePlazas.map((plaza) => {
                    const pt = svgProjection.project(plaza.lat, plaza.lng);
                    const style = SEVERITY_COLORS[plaza.severity];
                    const isSelected = selectedPlazaId === plaza.id;
                    const isAvoided = isEcoMode && plaza.avoidableInEco;
                    return (
                      <g
                        key={`svg-pin-${plaza.id}`}
                        className="cursor-pointer"
                        onClick={() => handleSelectPlaza(plaza)}
                        opacity={isAvoided ? 0.45 : 1}
                      >
                        {isSelected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={16}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={2}
                            strokeDasharray="3 2"
                          />
                        )}
                        <rect
                          x={pt.x - 28}
                          y={pt.y - 26}
                          width={56}
                          height={18}
                          rx={5}
                          fill={style.bg}
                          stroke={isSelected ? '#ffffff' : style.border}
                          strokeWidth={isSelected ? 1.8 : 1.2}
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 14}
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="800"
                          fill={style.text}
                          textDecoration={isAvoided ? 'line-through' : 'none'}
                        >
                          #{plaza.rank} R${plaza.totalCost}
                        </text>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={plaza.severity === 'critical' ? 6.5 : 5}
                          fill={style.pinBg}
                          stroke="#0f172a"
                          strokeWidth={1.8}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Plaza Interactive Floating Card */}
              {selectedPlaza ? (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto sm:max-w-sm z-20 bg-[#081425]/95 backdrop-blur-xs border border-[#475569] rounded-xl p-3 shadow-2xl animate-in fade-in duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[10px] font-extrabold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: SEVERITY_COLORS[selectedPlaza.severity].pinBg,
                            color: '#ffffff',
                          }}
                        >
                          #{selectedPlaza.rank} Maior Custo
                        </span>
                        <span className="text-[10px] font-mono text-[#94a3b8]">
                          {selectedPlaza.highway} • {selectedPlaza.kmMarker}
                        </span>
                      </div>
                      <h4 className="text-xs font-extrabold text-[#d8e3fb] mt-1">
                        {selectedPlaza.name}
                      </h4>
                      <p className="text-[10px] text-[#94a3b8]">{selectedPlaza.concessionaire}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlazaId(null)}
                      className="w-6 h-6 rounded-md bg-[#152031] hover:bg-[#1e293b] text-[#94a3b8] flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-2 bg-[#152031] rounded-lg p-2 text-[10px]">
                    <div>
                      <span className="text-[#94a3b8] block">Tarifa/Eixo</span>
                      <span className="font-mono font-bold text-[#d8e3fb]">
                        {formatCurrency(selectedPlaza.costPerAxle)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] block">Total ({axles}e)</span>
                      <span className="font-mono font-extrabold text-[#fca5a5]">
                        {formatCurrency(selectedPlaza.totalCost)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] block">Peso na Rota</span>
                      <span className="font-mono font-bold text-[#ffb95f]">
                        {selectedPlaza.sharePercent}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#6ee7b7] mt-2 leading-snug flex items-start gap-1">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>{selectedPlaza.bypassTip}</span>
                  </p>
                </div>
              ) : (
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] text-[#94a3b8] bg-[#081425]/85 border border-[#334155] rounded-lg px-2.5 py-1.5">
                  <span>Clique em qualquer pino de pedágio no mapa para ver tarifa e dica de economia.</span>
                  <span className="font-mono font-bold text-[#ffb95f] hidden sm:inline">
                    {formatKm(effectiveDistanceKm)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Economical Route Comparison & Top High-Cost Toll Hotspots */}
        <div className="mt-3 space-y-3">
          {/* Economical Comparison Banner */}
          <div
            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isEcoMode
                ? 'bg-[#00291a]/80 border-[#10b981]'
                : 'bg-[#081425] border-[#334155]'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#10b981]" />
                <span className="text-xs font-extrabold text-[#d8e3fb]">
                  Planejamento Econômico: Alternativa com Menor Pedágio
                </span>
                {tollAnalysis.economicalOption.netSavings > 0 && (
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40">
                    Economia Líquida:{' '}
                    <AnimatedCurrencyCounter
                      value={tollAnalysis.economicalOption.netSavings}
                      durationMs={520}
                    />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#94a3b8] leading-snug">
                {tollAnalysis.economicalOption.strategySummary}{' '}
                <span className="font-mono text-[#6ee7b7]">
                  (Pedágio -
                  <AnimatedCurrencyCounter
                    value={tollAnalysis.economicalOption.tollSavings}
                    durationMs={520}
                  />{' '}
                  · Diesel extra +
                  <AnimatedCurrencyCounter
                    value={tollAnalysis.economicalOption.extraDieselCost}
                    durationMs={520}
                  />
                  )
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setRouteMode((prev) => (prev === 'standard' ? 'economical' : 'standard'));
              }}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold shrink-0 cursor-pointer transition-all ${
                isEcoMode
                  ? 'bg-[#1e293b] hover:bg-[#334155] text-[#d8e3fb] border border-[#475569]'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#022c22]'
              }`}
            >
              {isEcoMode ? 'Voltar p/ Rota Padrão' : 'Ativar Rota Econômica'}
            </button>
          </div>

          {/* Ranked Highest-Cost Toll Hotspots Strip */}
          {tollAnalysis.topHotspots.length > 0 && (
            <div className="bg-[#081425] border border-[#334155] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#d8e3fb] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                  Pontos com Maior Custo de Pedágio no Trajeto
                </span>
                <span className="text-[10px] text-[#94a3b8]">
                  Clique para destacar no mapa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {tollAnalysis.topHotspots.map((hotspot) => {
                  const style = SEVERITY_COLORS[hotspot.severity];
                  const isSelected = selectedPlazaId === hotspot.id;
                  const isAvoided = isEcoMode && hotspot.avoidableInEco;
                  return (
                    <button
                      key={hotspot.id}
                      type="button"
                      onClick={() => handleSelectPlaza(hotspot)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#1e293b] border-white ring-1 ring-white/50'
                          : 'bg-[#111c2d] hover:bg-[#1a283d] border-[#334155]'
                      } ${isAvoided ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                          }}
                        >
                          #{hotspot.rank} · {hotspot.sharePercent}%
                        </span>
                        <span
                          className={`font-mono text-xs font-extrabold ${
                            isAvoided ? 'line-through text-[#6ee7b7]' : 'text-[#fca5a5]'
                          }`}
                        >
                          {formatCurrency(hotspot.totalCost)}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#d8e3fb] truncate mt-1.5">
                        {hotspot.name}
                      </div>
                      <div className="text-[10px] text-[#94a3b8] truncate">
                        {hotspot.highway} ({hotspot.kmMarker}) ·{' '}
                        {isAvoided ? 'Desviada na Econômica' : formatCurrency(hotspot.costPerAxle) + '/eixo'}
                      </div>
                    </button>
                  );
                })}
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
            className={`flex-1 h-14 min-h-[56px] rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition-all cursor-pointer ${
              isEcoMode
                ? 'bg-[#10b981] hover:bg-[#059669] text-[#022c22] shadow-emerald-500/20'
                : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] shadow-amber-500/20'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>
              Sincronizar {isEcoMode ? 'Rota Econômica' : 'no Cockpit'} ({formatKm(effectiveDistanceKm)})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
