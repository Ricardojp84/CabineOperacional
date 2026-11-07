import React, { useState, useEffect } from 'react';
import { ShiftStatus } from '../types/cockpit';
import { formatTimeSeconds, formatShortHours } from '../utils/formatters';
import { playCockpitClick, playAlertBeep, playSuccessChime } from '../utils/audio';
import {
  Clock,
  Coffee,
  Bed,
  Truck,
  Utensils,
  PackageCheck,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

export const DriverShiftTimer: React.FC = () => {
  const [status, setStatus] = useState<ShiftStatus>('driving');
  const [continuousSeconds, setContinuousSeconds] = useState<number>(12420); // 3h 27m elapsed in trip
  const [totalDailySeconds, setTotalDailySeconds] = useState<number>(24100); // 6h 41m today
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [alertTriggered, setAlertTriggered] = useState<boolean>(false);

  // Maximum continuous driving before mandatory 30m rest: 5.5 hours (19,800 seconds)
  const MAX_CONTINUOUS_SECONDS = 5.5 * 3600;
  // Maximum daily driving: 10 hours (36,000 seconds)
  const MAX_DAILY_SECONDS = 10 * 3600;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (status === 'driving') {
          setContinuousSeconds((prev) => {
            const next = prev + 1;
            if (next >= MAX_CONTINUOUS_SECONDS && !alertTriggered) {
              playAlertBeep();
              setAlertTriggered(true);
            }
            return next;
          });
          setTotalDailySeconds((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, status, alertTriggered]);

  const handleStatusChange = (newStatus: ShiftStatus) => {
    playCockpitClick();
    setStatus(newStatus);
    if (newStatus === 'rest' || newStatus === 'meal' || newStatus === 'sleeping') {
      playSuccessChime();
      setContinuousSeconds(0);
      setAlertTriggered(false);
    }
  };

  const continuousProgress = Math.min(100, (continuousSeconds / MAX_CONTINUOUS_SECONDS) * 100);
  const dailyProgress = Math.min(100, (totalDailySeconds / MAX_DAILY_SECONDS) * 100);
  const remainingContinuous = Math.max(0, MAX_CONTINUOUS_SECONDS - continuousSeconds);

  const isContinuousWarning = continuousSeconds >= 4.5 * 3600;
  const isContinuousOvertime = continuousSeconds >= MAX_CONTINUOUS_SECONDS;

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 md:p-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#f59e0b]" />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#d8e3fb]">
              Controle de Jornada & Tacógrafo (Lei 13.103/15)
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Descanso obrigatório de 30 min a cada 5h30 de direção ininterrupta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playCockpitClick();
              setIsTimerRunning(!isTimerRunning);
            }}
            className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isTimerRunning
                ? 'bg-[#243248] text-[#ffb95f] border border-[#ffb95f]/40'
                : 'bg-[#10b981] text-[#022c22]'
            }`}
          >
            {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isTimerRunning ? 'Pausar' : 'Retomar'}
          </button>

          <button
            onClick={() => {
              playCockpitClick();
              setContinuousSeconds(0);
              setAlertTriggered(false);
            }}
            title="Zerar Volante (Após 30m de descanso)"
            className="w-9 h-9 rounded-lg bg-[#243248] hover:bg-[#2a3548] border border-[#475569] text-[#94a3b8] flex items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Timers Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        {/* Continuous Driving Timer */}
        <div
          className={`p-4 rounded-xl border ${
            isContinuousOvertime
              ? 'bg-[#690005]/40 border-[#ea580c] text-[#ffdad6]'
              : isContinuousWarning
              ? 'bg-[#472a00]/40 border-[#f59e0b]'
              : 'bg-[#0f172a] border-[#334155]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1">
            <span>Tempo Contínuo no Volante</span>
            <span className={isContinuousOvertime ? 'text-[#ffb4ab]' : 'text-[#f59e0b]'}>
              Máx 5h30m
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span
              className={`font-mono font-extrabold text-2xl lg:text-3xl tracking-tight ${
                isContinuousOvertime
                  ? 'text-[#ffb4ab]'
                  : isContinuousWarning
                  ? 'text-[#f59e0b]'
                  : 'text-[#d8e3fb]'
              }`}
            >
              {formatTimeSeconds(continuousSeconds)}
            </span>
            <span className="text-xs font-bold text-[#94a3b8]">
              {isContinuousOvertime ? 'ESTOURO!' : `Resta ${formatShortHours(remainingContinuous)}`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#152031] rounded-full overflow-hidden mt-3 border border-[#334155]">
            <div
              style={{ width: `${continuousProgress}%` }}
              className={`h-full transition-all duration-300 ${
                isContinuousOvertime
                  ? 'bg-[#ea580c]'
                  : isContinuousWarning
                  ? 'bg-[#f59e0b]'
                  : 'bg-[#10b981]'
              }`}
            />
          </div>
        </div>

        {/* Daily Total Driving Timer */}
        <div className="p-4 rounded-xl bg-[#0f172a] border border-[#334155]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1">
            <span>Total Dirigido Hoje</span>
            <span className="text-[#bec6e0]">Limite Diário: 10h</span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="font-mono font-extrabold text-2xl lg:text-3xl text-[#d8e3fb] tracking-tight">
              {formatTimeSeconds(totalDailySeconds)}
            </span>
            <span className="text-xs font-bold text-[#94a3b8]">
              {Math.round(dailyProgress)}% da diária
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#152031] rounded-full overflow-hidden mt-3 border border-[#334155]">
            <div
              style={{ width: `${dailyProgress}%` }}
              className="h-full bg-[#ffb95f] transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Warning banner if alert triggered */}
      {isContinuousOvertime && (
        <div className="mb-4 p-3 rounded-xl bg-[#690005] border border-[#ea580c] flex items-center gap-3 text-[#ffdad6]">
          <AlertCircle className="w-5 h-5 text-[#ffb4ab] shrink-0" />
          <span className="text-xs font-bold">
            ALERTA TACÓGRAFO: Você atingiu o limite de 5h30 de direção contínua. Encoste no próximo posto para o descanso legal de 30 minutos.
          </span>
        </div>
      )}

      {/* Quick Status Buttons - 56px minimum height */}
      <div>
        <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-2">
          Trocar Status da Operação (1 Toque)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => handleStatusChange('driving')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              status === 'driving'
                ? 'bg-[#f59e0b] text-[#0f172a] border-[#f59e0b] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Truck className="w-5 h-5" />
            Em Rodagem
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('rest')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              status === 'rest'
                ? 'bg-[#10b981] text-[#022c22] border-[#10b981] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Coffee className="w-5 h-5" />
            Descanso 30m
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('meal')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              status === 'meal'
                ? 'bg-[#38bdf8] text-[#082f49] border-[#38bdf8] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Utensils className="w-5 h-5" />
            Refeição
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('loading')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              status === 'loading'
                ? 'bg-[#bec6e0] text-[#0f172a] border-[#bec6e0] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            Carga/Descarga
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('sleeping')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              status === 'sleeping'
                ? 'bg-[#818cf8] text-[#1e1b4b] border-[#818cf8] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Bed className="w-5 h-5" />
            Pernoite 11h
          </button>
        </div>
      </div>
    </div>
  );
};
