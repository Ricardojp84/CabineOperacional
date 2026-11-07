import React, { useState, useEffect } from 'react';
import {
  GpsLocationState,
  initialGpsState,
  requestDeviceGpsPosition,
  startGpsWatch,
  stopGpsWatch,
} from '../utils/geolocation';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  Navigation,
  Crosshair,
  Satellite,
  Gauge,
  MapPin,
  Check,
  X,
  AlertCircle,
  Radio,
  RotateCw,
} from 'lucide-react';

interface GpsLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyLocation?: (locationName: string, highway: string, lat: number, lng: number) => void;
}

export const GpsLocationModal: React.FC<GpsLocationModalProps> = ({
  isOpen,
  onClose,
  onApplyLocation,
}) => {
  const [gpsState, setGpsState] = useState<GpsLocationState>(initialGpsState);
  const [isWatching, setIsWatching] = useState<boolean>(true);
  const [hasConfirmedPermission, setHasConfirmedPermission] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && hasConfirmedPermission) {
      handleGetPosition();
    }
  }, [isOpen, hasConfirmedPermission]);

  useEffect(() => {
    return () => {
      stopGpsWatch();
    };
  }, []);

  if (!isOpen) return null;

  const handleGetPosition = () => {
    setGpsState((prev) => ({ ...prev, status: 'requesting', errorMessage: null }));

    requestDeviceGpsPosition(
      (state) => {
        playSuccessChime();
        setGpsState(state);
      },
      (errorMsg) => {
        playAlertBeep();
        setGpsState((prev) => ({
          ...prev,
          status: 'denied',
          errorMessage: errorMsg,
        }));
      }
    );
  };

  const handleConfirmAndActivate = () => {
    playCockpitClick();
    setHasConfirmedPermission(true);
    setGpsState((prev) => ({ ...prev, status: 'requesting' }));

    requestDeviceGpsPosition(
      (state) => {
        playSuccessChime();
        setGpsState(state);
        if (isWatching) {
          startGpsWatch(
            (updatedState) => setGpsState(updatedState),
            () => {}
          );
        }
      },
      (errorMsg) => {
        playAlertBeep();
        setGpsState((prev) => ({
          ...prev,
          status: 'denied',
          errorMessage: errorMsg,
        }));
      }
    );
  };

  const handleApply = () => {
    if (!gpsState.nearestHub || gpsState.latitude === null || gpsState.longitude === null) return;
    playSuccessChime();
    if (onApplyLocation) {
      onApplyLocation(
        gpsState.nearestHub.hub.fullLabel,
        gpsState.nearestHub.hub.highways[0],
        gpsState.latitude,
        gpsState.longitude
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#003824] border border-[#10b981] flex items-center justify-center text-[#10b981]">
              <Satellite className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb] flex items-center gap-2">
                Localização em Tempo Real (GPS)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0f172a] text-[#4edea3] border border-[#10b981]/30">
                  Satélite Ativo
                </span>
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Confirmação de permissões e coordenadas do aparelho da cabine.
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

        {/* Content */}
        {!hasConfirmedPermission ? (
          /* Driver Permission Confirmation Screen */
          <div className="mt-5 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#081425] border-2 border-[#f59e0b] flex items-center justify-center mx-auto text-[#f59e0b] glow-amber">
              <Navigation className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-[#d8e3fb]">
                Permitir Acesso ao GPS do Aparelho?
              </h3>
              <p className="text-xs text-[#94a3b8] max-w-sm mx-auto mt-1 leading-relaxed">
                A Cabine Operacional utiliza o sensor de satélite do celular ou tablet para identificar automaticamente a cidade onde você está parado, detectar praças de pedágio próximas e preencher comprovantes de combustível.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0f172a] border border-[#334155] text-left text-xs text-[#bec6e0] space-y-1.5">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#10b981] shrink-0" />
                <span>Preenchimento automático do posto e cidade em 1 toque</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#10b981] shrink-0" />
                <span>Detecção de velocidade da rodovia (km/h) e precisão de sinal</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#10b981] shrink-0" />
                <span>Seus dados permanecem seguros no seu dispositivo</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmAndActivate}
                className="w-full h-14 min-h-[56px] rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Radio className="w-5 h-5 animate-pulse" />
                <span>Autorizar e Buscar Sinal GPS</span>
              </button>
            </div>
          </div>
        ) : (
          /* Live Coordinates & Satellite Dashboard */
          <div className="mt-4 space-y-4">
            {/* Status Radar Card */}
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-[#94a3b8] flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-[#4edea3]" />
                  Status da Conexão
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    gpsState.status === 'granted'
                      ? 'bg-[#003824] text-[#10b981]'
                      : gpsState.status === 'requesting'
                      ? 'bg-[#472a00] text-[#ffb95f]'
                      : 'bg-[#690005] text-[#ffb4ab]'
                  }`}
                >
                  {gpsState.status === 'granted'
                    ? 'SINAL FIXADO'
                    : gpsState.status === 'requesting'
                    ? 'BUSCANDO SATÉLITES...'
                    : 'SEM SINAL'}
                </span>
              </div>

              {gpsState.errorMessage ? (
                <div className="p-3 rounded-lg bg-[#690005]/50 border border-[#ea580c] text-[#ffdad6] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#ffb4ab] shrink-0" />
                  <span>{gpsState.errorMessage}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Closest City & Highway Detection */}
                  {gpsState.nearestHub && (
                    <div className="p-3 rounded-lg bg-[#152031] border border-[#334155]">
                      <div className="text-[10px] uppercase font-bold text-[#94a3b8]">
                        Ponto Rodoviário Mais Próximo
                      </div>
                      <div className="text-base font-extrabold text-[#d8e3fb] flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-4 h-4 text-[#f59e0b]" />
                        <span>{gpsState.nearestHub.hub.fullLabel}</span>
                        <span className="text-xs font-mono text-[#4edea3]">
                          ({gpsState.nearestHub.distanceKm} km de distância)
                        </span>
                      </div>
                      <div className="text-xs text-[#94a3b8] mt-0.5 font-mono">
                        Rodovia principal: {gpsState.nearestHub.hub.highways.join(' • ')}
                      </div>
                    </div>
                  )}

                  {/* Coordinates Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]">
                      <div className="text-[10px] text-[#94a3b8]">Latitude</div>
                      <div className="text-sm font-extrabold text-[#d8e3fb]">
                        {gpsState.latitude !== null ? gpsState.latitude.toFixed(6) : '---'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]">
                      <div className="text-[10px] text-[#94a3b8]">Longitude</div>
                      <div className="text-sm font-extrabold text-[#d8e3fb]">
                        {gpsState.longitude !== null ? gpsState.longitude.toFixed(6) : '---'}
                      </div>
                    </div>
                  </div>

                  {/* Precision & Speed */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]">
                      <div className="text-[10px] text-[#94a3b8]">Precisão do GPS</div>
                      <div className="text-sm font-bold text-[#4edea3]">
                        {gpsState.accuracyMeters !== null ? `± ${gpsState.accuracyMeters} metros` : '---'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]">
                      <div className="text-[10px] text-[#94a3b8]">Velocidade Estimada</div>
                      <div className="text-sm font-bold text-[#ffb95f]">
                        {gpsState.speedKmh !== null ? `${gpsState.speedKmh} km/h` : '0 km/h (Parado)'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleGetPosition}
                className="h-12 px-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#475569] text-xs font-bold text-[#d8e3fb] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-[#f59e0b]" />
                Recarregar Coordenadas
              </button>

              <button
                type="button"
                disabled={!gpsState.nearestHub}
                onClick={handleApply}
                className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#10b981] hover:bg-[#059669] disabled:opacity-50 text-[#022c22] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                Aplicar Cidade no Formulário
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
