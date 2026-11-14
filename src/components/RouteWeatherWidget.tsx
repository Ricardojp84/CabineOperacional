import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchWeatherForLocation,
  RoutePointWeather,
  WeatherConditionCategory,
  DrivingSafetyLevel,
} from '../services/weatherService';
import { playCockpitClick } from '../utils/audio';
import {
  Sun,
  Moon,
  Cloud,
  CloudFog,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Eye,
  RefreshCw,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface RouteWeatherWidgetProps {
  origin: string;
  destination: string;
}

interface PointState {
  loading: boolean;
  data: RoutePointWeather | null;
  error: string | null;
}

function renderWeatherIcon(category: WeatherConditionCategory, isDay: boolean) {
  switch (category) {
    case 'sol':
      return isDay ? (
        <Sun className="w-7 h-7 text-[#fbbf24]" />
      ) : (
        <Moon className="w-7 h-7 text-[#93c5fd]" />
      );
    case 'nublado':
      return <Cloud className="w-7 h-7 text-[#cbd5e1]" />;
    case 'cerracao':
      return <CloudFog className="w-7 h-7 text-[#ffb95f]" />;
    case 'chuva':
      return <CloudRain className="w-7 h-7 text-[#38bdf8]" />;
    case 'tempestade':
      return <CloudLightning className="w-7 h-7 text-[#ef4444]" />;
  }
}

function getSafetyVisual(level: DrivingSafetyLevel): {
  label: string;
  containerClass: string;
  textClass: string;
  icon: React.ReactNode;
} {
  switch (level) {
    case 'critico':
      return {
        label: 'Risco Severo na Estrada',
        containerClass: 'bg-[#690005]/50 border-[#ef4444]/60',
        textClass: 'text-[#fecaca]',
        icon: <ShieldAlert className="w-4 h-4 text-[#ef4444] shrink-0" />,
      };
    case 'alerta':
      return {
        label: 'Atenção Redobrada',
        containerClass: 'bg-[#472a00]/60 border-[#f59e0b]/60',
        textClass: 'text-[#fde68a]',
        icon: <AlertTriangle className="w-4 h-4 text-[#fbbf24] shrink-0" />,
      };
    case 'atencao':
      return {
        label: 'Cautela na Pista',
        containerClass: 'bg-[#082f49]/60 border-[#38bdf8]/50',
        textClass: 'text-[#bae6fd]',
        icon: <AlertTriangle className="w-4 h-4 text-[#38bdf8] shrink-0" />,
      };
    case 'seguro':
    default:
      return {
        label: 'Condução Favorável',
        containerClass: 'bg-[#003824]/45 border-[#10b981]/40',
        textClass: 'text-[#a7f3d0]',
        icon: <ShieldCheck className="w-4 h-4 text-[#34d399] shrink-0" />,
      };
  }
}

const WeatherPointCard: React.FC<{
  roleLabel: 'Origem da Rota' | 'Destino da Rota';
  locationName: string;
  state: PointState;
  onRetry: () => void;
}> = ({ roleLabel, locationName, state, onRetry }) => {
  const safety = state.data ? getSafetyVisual(state.data.safetyLevel) : null;

  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3.5 sm:p-4 flex flex-col justify-between gap-3">
      {/* Top Row: Role & City */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
            <span>{roleLabel}</span>
          </div>
          <div className="text-sm font-extrabold text-[#d8e3fb] truncate mt-0.5">
            {locationName || 'Localidade não definida'}
          </div>
          {state.data?.resolvedRegion && (
            <div className="text-[11px] text-[#64748b] truncate">
              Estação: {state.data.resolvedCity} · {state.data.resolvedRegion}
            </div>
          )}
        </div>

        {state.data && (
          <div className="flex items-center gap-2 shrink-0">
            {renderWeatherIcon(state.data.conditionCategory, state.data.isDay)}
            <div className="text-right font-mono tabular-nums">
              <div className="text-2xl font-black text-[#d8e3fb] leading-none">
                {state.data.temperatureC}°C
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-0.5">
                Sens. {state.data.apparentTemperatureC}°C
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body States: Empty / Loading / Error / Data */}
      {!locationName.trim() ? (
        <div className="py-4 px-3 rounded-lg bg-[#081425] border border-dashed border-[#334155] text-xs text-[#94a3b8]">
          Informe a cidade de {roleLabel.toLowerCase()} na viagem para consultar o clima em tempo real.
        </div>
      ) : state.loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 bg-[#152031] rounded-lg" />
          <div className="h-12 bg-[#152031] rounded-lg" />
        </div>
      ) : state.error ? (
        <div className="p-3 rounded-lg bg-[#450a0a]/40 border border-[#ef4444]/40 flex items-center justify-between gap-2 text-xs text-[#fca5a5]">
          <span>{state.error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="px-2.5 py-1 rounded-md bg-[#1e293b] hover:bg-[#334155] text-[#d8e3fb] font-bold shrink-0 cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      ) : state.data && safety ? (
        <>
          {/* Condition + Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#334155]/70 text-xs">
            <div>
              <span className="text-[10px] text-[#94a3b8] block">Condição</span>
              <span className="font-bold text-[#d8e3fb] leading-tight block">
                {state.data.conditionLabel}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                <Wind className="w-3 h-3 text-[#38bdf8]" /> Vento
              </span>
              <span className="font-mono tabular-nums font-bold text-[#cbd5e1]">
                {state.data.windSpeedKmh} km/h
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#94a3b8] flex items-center gap-1">
                {state.data.visibilityMeters !== undefined ? (
                  <>
                    <Eye className="w-3 h-3 text-[#ffb95f]" /> Visibilidade
                  </>
                ) : (
                  <>
                    <Droplets className="w-3 h-3 text-[#38bdf8]" /> Umidade
                  </>
                )}
              </span>
              <span className="font-mono tabular-nums font-bold text-[#cbd5e1]">
                {state.data.visibilityMeters !== undefined
                  ? state.data.visibilityMeters >= 1000
                    ? `${(state.data.visibilityMeters / 1000).toFixed(1)} km`
                    : `${Math.round(state.data.visibilityMeters)} m`
                  : `${state.data.humidityPercent}%`}
              </span>
            </div>
          </div>

          {/* Driving Safety Guidance */}
          <div className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${safety.containerClass}`}>
            {safety.icon}
            <div className="min-w-0">
              <div className={`font-extrabold ${safety.textClass}`}>{safety.label}</div>
              <p className="text-[11px] text-[#cbd5e1] leading-snug mt-0.5">
                {state.data.drivingAdvice}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export const RouteWeatherWidget: React.FC<RouteWeatherWidgetProps> = ({
  origin,
  destination,
}) => {
  const [originWeather, setOriginWeather] = useState<PointState>({
    loading: false,
    data: null,
    error: null,
  });
  const [destWeather, setDestWeather] = useState<PointState>({
    loading: false,
    data: null,
    error: null,
  });
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const loadWeather = useCallback(
    async (forceRefresh = false, signal?: AbortSignal) => {
      const hasOrigin = Boolean(origin?.trim());
      const hasDest = Boolean(destination?.trim());

      if (hasOrigin) {
        setOriginWeather((prev) => ({ ...prev, loading: true, error: null }));
      } else {
        setOriginWeather({ loading: false, data: null, error: null });
      }

      if (hasDest) {
        setDestWeather((prev) => ({ ...prev, loading: true, error: null }));
      } else {
        setDestWeather({ loading: false, data: null, error: null });
      }

      if (!hasOrigin && !hasDest) return;
      if (forceRefresh) setIsRefreshing(true);

      await Promise.all([
        hasOrigin
          ? fetchWeatherForLocation(origin, { forceRefresh, signal })
              .then((data) => {
                if (!signal?.aborted) {
                  setOriginWeather({ loading: false, data, error: null });
                }
              })
              .catch((err) => {
                if (!signal?.aborted) {
                  setOriginWeather({
                    loading: false,
                    data: null,
                    error: err instanceof Error ? err.message : 'Erro ao consultar clima.',
                  });
                }
              })
          : Promise.resolve(),
        hasDest
          ? fetchWeatherForLocation(destination, { forceRefresh, signal })
              .then((data) => {
                if (!signal?.aborted) {
                  setDestWeather({ loading: false, data, error: null });
                }
              })
              .catch((err) => {
                if (!signal?.aborted) {
                  setDestWeather({
                    loading: false,
                    data: null,
                    error: err instanceof Error ? err.message : 'Erro ao consultar clima.',
                  });
                }
              })
          : Promise.resolve(),
      ]);

      if (!signal?.aborted) {
        setIsRefreshing(false);
      }
    },
    [origin, destination]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadWeather(false, controller.signal);
    return () => controller.abort();
  }, [loadWeather]);

  const worstSafety: DrivingSafetyLevel = (() => {
    const rank: Record<DrivingSafetyLevel, number> = {
      seguro: 0,
      atencao: 1,
      alerta: 2,
      critico: 3,
    };
    const r1 = originWeather.data ? rank[originWeather.data.safetyLevel] : 0;
    const r2 = destWeather.data ? rank[destWeather.data.safetyLevel] : 0;
    const maxR = Math.max(r1, r2);
    return (Object.keys(rank).find((k) => rank[k as DrivingSafetyLevel] === maxR) ||
      'seguro') as DrivingSafetyLevel;
  })();

  const overallTime =
    originWeather.data?.fetchedAt || destWeather.data?.fetchedAt
      ? new Date(
          originWeather.data?.fetchedAt || destWeather.data!.fetchedAt
        ).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : null;

  return (
    <section
      aria-label="Condições Meteorológicas da Viagem"
      className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 space-y-3"
    >
      {/* Compact Header & Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#d8e3fb] flex items-center gap-2">
              <Sun className="w-4 h-4 text-[#ffb95f] shrink-0" />
              <span>Clima na Rota</span>
            </h3>
            {(originWeather.data || destWeather.data) && (
              <>
                <span aria-hidden="true" className="text-[#475569]">·</span>
                <span
                  className={`text-xs ${
                    worstSafety === 'critico'
                      ? 'text-[#fca5a5] font-bold'
                      : worstSafety === 'alerta' || worstSafety === 'atencao'
                      ? 'text-[#ffb95f] font-bold'
                      : 'text-[#34d399] font-semibold'
                  }`}
                >
                  {getSafetyVisual(worstSafety).label}
                </span>
              </>
            )}
          </div>

          {/* Concise Origin/Destination Temp Summary when collapsed */}
          {!isExpanded && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94a3b8] mt-1 font-mono tabular-nums">
              <span>
                Origem:{' '}
                <strong className="text-[#d8e3fb]">
                  {originWeather.loading
                    ? '...'
                    : originWeather.data
                    ? `${originWeather.data.temperatureC}°C (${originWeather.data.conditionLabel})`
                    : '—'}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Destino:{' '}
                <strong className="text-[#d8e3fb]">
                  {destWeather.loading
                    ? '...'
                    : destWeather.data
                    ? `${destWeather.data.temperatureC}°C (${destWeather.data.conditionLabel})`
                    : '—'}
                </strong>
              </span>
              {overallTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{overallTime}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              void loadWeather(true);
            }}
            disabled={isRefreshing || (!origin.trim() && !destination.trim())}
            className="h-9 px-3 rounded-lg bg-[#0f172a] hover:bg-[#152031] border border-[#334155] text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50 transition-colors"
            title="Atualizar previsão do tempo"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#38bdf8] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setIsExpanded((prev) => !prev);
            }}
            aria-expanded={isExpanded}
            className="h-9 px-3 rounded-lg bg-[#0f172a] hover:bg-[#152031] border border-[#334155] text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Ocultar' : 'Ver Detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Side-by-side Origin & Destination Weather Cards (Expandable) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-[#334155]/60">
          <WeatherPointCard
            roleLabel="Origem da Rota"
            locationName={origin}
            state={originWeather}
            onRetry={() => void loadWeather(true)}
          />
          <WeatherPointCard
            roleLabel="Destino da Rota"
            locationName={destination}
            state={destWeather}
            onRetry={() => void loadWeather(true)}
          />
        </div>
      )}
    </section>
  );
};
