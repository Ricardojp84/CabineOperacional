import React, { useState, useEffect, useCallback } from 'react';
import { ShiftStatus } from '../types/cockpit';
import { formatTimeSeconds, formatShortHours } from '../utils/formatters';
import { playCockpitClick, playAlertBeep, playSuccessChime } from '../utils/audio';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  NotificationSupportStatus,
  ExtendedNotificationOptions,
} from '../services/maintenanceNotificationService';
import {
  Clock,
  Coffee,
  Bed,
  Truck,
  Utensils,
  PackageCheck,
  AlertCircle,
  AlertTriangle,
  Bell,
  BellRing,
  BellOff,
  Play,
  Pause,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';

// 4 hours continuous driving milestone (Lei do Motorista 13.103/15 preventive alert)
export const FOUR_HOUR_ALERT_SECONDS = 4 * 3600; // 14,400 seconds
// Maximum continuous driving before mandatory 30m rest: 5.5 hours
export const MAX_CONTINUOUS_SECONDS = 5.5 * 3600; // 19,800 seconds
// Maximum daily driving: 10 hours
export const MAX_DAILY_SECONDS = 10 * 3600; // 36,000 seconds

export const CUSTOM_REMINDER_PRESETS_MINUTES = [90, 120, 150, 180, 210] as const;
export const MIN_CUSTOM_REMINDER_MINUTES = 15;
export const MAX_CUSTOM_REMINDER_MINUTES = 235; // Strictly before 4h (240 min)
export const STORAGE_KEY_CUSTOM_BREAK = 'cabine_custom_break_reminder';

export type CustomBreakReminderMode = 'preset' | 'manual';

export function clampCustomReminderMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 120;
  return Math.min(MAX_CUSTOM_REMINDER_MINUTES, Math.max(MIN_CUSTOM_REMINDER_MINUTES, Math.round(minutes)));
}

export function hoursMinutesToMinutes(hours: number, minutes: number): number {
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return clampCustomReminderMinutes(safeHours * 60 + safeMinutes);
}

export function minutesToHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const clamped = clampCustomReminderMinutes(totalMinutes);
  return {
    hours: Math.floor(clamped / 60),
    minutes: clamped % 60,
  };
}

export function formatReminderIntervalLabel(minutes: number): string {
  const clamped = clampCustomReminderMinutes(minutes);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function isCustomBreakReminderDue(params: {
  continuousSeconds: number;
  customEnabled: boolean;
  customIntervalMinutes: number;
  alreadySent: boolean;
}): boolean {
  if (!params.customEnabled || params.alreadySent) return false;
  const thresholdSeconds = clampCustomReminderMinutes(params.customIntervalMinutes) * 60;
  return (
    params.continuousSeconds >= thresholdSeconds &&
    params.continuousSeconds < FOUR_HOUR_ALERT_SECONDS
  );
}

export function isCustomBreakVisualAlertActive(params: {
  continuousSeconds: number;
  customEnabled: boolean;
  customIntervalMinutes: number;
  dismissed: boolean;
}): boolean {
  if (!params.customEnabled || params.dismissed) return false;
  const thresholdSeconds = clampCustomReminderMinutes(params.customIntervalMinutes) * 60;
  return (
    params.continuousSeconds >= thresholdSeconds &&
    params.continuousSeconds < FOUR_HOUR_ALERT_SECONDS
  );
}

export function getCustomReminderMarkerPercent(customIntervalMinutes: number): number {
  const seconds = clampCustomReminderMinutes(customIntervalMinutes) * 60;
  return Math.min(100, (seconds / MAX_CONTINUOUS_SECONDS) * 100);
}

export type ShiftAlertStage = 'normal' | 'warning_4h' | 'critical_5h30';

export function getShiftAlertStage(continuousSeconds: number): ShiftAlertStage {
  if (continuousSeconds >= MAX_CONTINUOUS_SECONDS) {
    return 'critical_5h30';
  }
  if (continuousSeconds >= FOUR_HOUR_ALERT_SECONDS) {
    return 'warning_4h';
  }
  return 'normal';
}

export interface ShiftNotificationDispatchResult {
  sent: boolean;
  reason: NotificationSupportStatus | 'error';
  title?: string;
  body?: string;
}

export async function sendDriverShiftNotification(options?: {
  continuousSeconds?: number;
  isTest?: boolean;
  stage?: 'custom_break' | Exclude<ShiftAlertStage, 'normal'>;
  customMinutes?: number;
}): Promise<ShiftNotificationDispatchResult> {
  const permission = getNotificationPermissionStatus();
  if (permission !== 'granted') {
    return { sent: false, reason: permission };
  }

  const stage = options?.stage ?? 'warning_4h';
  const elapsedLabel =
    options?.continuousSeconds !== undefined
      ? formatTimeSeconds(options.continuousSeconds)
      : '04:00:00';

  const isCritical = stage === 'critical_5h30';
  const isCustom = stage === 'custom_break';
  const customLabel = formatReminderIntervalLabel(options?.customMinutes ?? 120);
  const prefix = options?.isTest ? '[TESTE] ' : '';

  const title = isCritical
    ? `${prefix}LIMITE 5h30 ATINGIDO — Pare para Descanso`
    : isCustom
    ? `${prefix}Lembrete de Pausa (${customLabel} no Volante)`
    : `${prefix}Alerta Lei do Motorista: 4h de Direção Contínua`;

  const body = isCritical
    ? `Tempo no volante: ${elapsedLabel}. Você atingiu o limite máximo de 5h30 ininterruptas (Lei 13.103/15). Faça a pausa obrigatória de 30 minutos.`
    : isCustom
    ? `Tempo no volante: ${elapsedLabel}. Você atingiu seu lembrete personalizado de ${customLabel} antes do marco obrigatório de 4h00. Considere fazer uma pausa breve.`
    : `Tempo no volante: ${elapsedLabel}. Você atingiu 4h ininterruptas de direção. Programe sua parada de 30 minutos antes do limite de 5h30.`;

  const notifOptions: ExtendedNotificationOptions = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: isCritical
      ? 'driver-shift-5h30-critical'
      : isCustom
      ? 'driver-shift-custom-break'
      : 'driver-shift-4h-warning',
    renotify: true,
    requireInteraction: !isCustom,
    vibrate: isCritical ? [400, 150, 400, 150, 400] : isCustom ? [200, 100, 200] : [300, 150, 300],
  };

  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active) {
        await reg.showNotification(title, notifOptions);
        return { sent: true, reason: 'granted', title, body };
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const notification = new Notification(title, notifOptions);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return { sent: true, reason: 'granted', title, body };
    }

    return { sent: false, reason: 'unsupported' };
  } catch (error) {
    console.warn('[DriverShiftTimer] Falha ao disparar notificação do navegador:', error);
    return { sent: false, reason: 'error' };
  }
}

export interface StoredCustomBreakPrefs {
  enabled: boolean;
  minutes: number;
  mode: CustomBreakReminderMode;
  soundEnabled: boolean;
}

export function loadCustomBreakPrefs(): StoredCustomBreakPrefs {
  const defaults: StoredCustomBreakPrefs = {
    enabled: false,
    minutes: 120,
    mode: 'preset',
    soundEnabled: true,
  };
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_BREAK);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoredCustomBreakPrefs>;
    const minutes = clampCustomReminderMinutes(Number(parsed.minutes ?? 120));
    const isPresetMatch = CUSTOM_REMINDER_PRESETS_MINUTES.includes(
      minutes as (typeof CUSTOM_REMINDER_PRESETS_MINUTES)[number]
    );
    return {
      enabled: Boolean(parsed.enabled),
      minutes,
      mode: parsed.mode === 'manual' || !isPresetMatch ? 'manual' : 'preset',
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
    };
  } catch {
    return defaults;
  }
}

export function saveCustomBreakPrefs(prefs: StoredCustomBreakPrefs): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_BREAK, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures
  }
}

export interface ShiftNotifFeedback {
  type: 'success' | 'warning' | 'info';
  message: string;
}

export interface DriverShiftController {
  status: ShiftStatus;
  continuousSeconds: number;
  totalDailySeconds: number;
  isTimerRunning: boolean;
  setIsTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  fourHourAlertSent: boolean;
  fiveHalfAlertSent: boolean;
  customReminderEnabled: boolean;
  customReminderMinutes: number;
  customReminderMode: CustomBreakReminderMode;
  setCustomReminderMode: React.Dispatch<React.SetStateAction<CustomBreakReminderMode>>;
  customSoundEnabled: boolean;
  customReminderSent: boolean;
  customReminderDismissed: boolean;
  notifPermission: NotificationSupportStatus;
  notifFeedback: ShiftNotifFeedback | null;
  dismissNotifFeedback: () => void;
  alertStage: ShiftAlertStage;
  isContinuousWarning: boolean;
  isContinuousOvertime: boolean;
  isCustomReminderActive: boolean;
  customThresholdSeconds: number;
  continuousProgress: number;
  dailyProgress: number;
  remainingContinuous: number;
  remainingToFourHours: number;
  remainingToCustomReminder: number;
  fourHourMarkerPercent: number;
  customMarkerPercent: number;
  customReminderLabel: string;
  handleRequestNotificationPermission: () => Promise<void>;
  handleSimulateFourHourAlert: () => Promise<void>;
  handleSelectCustomPreset: (minutes: number) => void;
  handleApplyManualTime: (hours: number, minutes: number) => number;
  handleToggleCustomReminder: (forceEnabled?: boolean) => void;
  handleToggleCustomSound: () => void;
  handleTestCustomReminder: () => Promise<void>;
  handleStatusChange: (newStatus: ShiftStatus) => void;
  handleResetContinuous: () => void;
  dismissCustomReminder: () => void;
}

export function useDriverShiftController(): DriverShiftController {
  const [status, setStatus] = useState<ShiftStatus>('driving');
  const [continuousSeconds, setContinuousSeconds] = useState<number>(12420); // 3h 27m elapsed in trip
  const [totalDailySeconds, setTotalDailySeconds] = useState<number>(24100); // 6h 41m today
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [fourHourAlertSent, setFourHourAlertSent] = useState<boolean>(false);
  const [fiveHalfAlertSent, setFiveHalfAlertSent] = useState<boolean>(false);

  const [initialBreakPrefs] = useState<StoredCustomBreakPrefs>(() => loadCustomBreakPrefs());
  const [customReminderEnabled, setCustomReminderEnabled] = useState<boolean>(
    initialBreakPrefs.enabled
  );
  const [customReminderMinutes, setCustomReminderMinutes] = useState<number>(
    initialBreakPrefs.minutes
  );
  const [customReminderMode, setCustomReminderMode] = useState<CustomBreakReminderMode>(
    initialBreakPrefs.mode
  );
  const [customSoundEnabled, setCustomSoundEnabled] = useState<boolean>(
    initialBreakPrefs.soundEnabled
  );
  const [customReminderSent, setCustomReminderSent] = useState<boolean>(false);
  const [customReminderDismissed, setCustomReminderDismissed] = useState<boolean>(false);

  const [notifPermission, setNotifPermission] = useState<NotificationSupportStatus>(() =>
    getNotificationPermissionStatus()
  );
  const [notifFeedback, setNotifFeedback] = useState<ShiftNotifFeedback | null>(null);

  // Persist custom break reminder configuration
  useEffect(() => {
    saveCustomBreakPrefs({
      enabled: customReminderEnabled,
      minutes: customReminderMinutes,
      mode: customReminderMode,
      soundEnabled: customSoundEnabled,
    });
  }, [customReminderEnabled, customReminderMinutes, customReminderMode, customSoundEnabled]);

  // Sync browser notification permission when window regains focus
  useEffect(() => {
    const syncPermission = () => {
      setNotifPermission(getNotificationPermissionStatus());
    };
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  // Main 1-second shift clock
  useEffect(() => {
    if (!isTimerRunning || status !== 'driving') return;
    const interval = setInterval(() => {
      setContinuousSeconds((prev) => prev + 1);
      setTotalDailySeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, status]);

  const dispatchFourHourBrowserAlert = useCallback(
    async (seconds: number, isTest = false) => {
      playAlertBeep();
      const result = await sendDriverShiftNotification({
        continuousSeconds: seconds,
        isTest,
        stage: seconds >= MAX_CONTINUOUS_SECONDS ? 'critical_5h30' : 'warning_4h',
      });
      setNotifPermission(getNotificationPermissionStatus());

      if (result.sent) {
        setNotifFeedback({
          type: 'success',
          message: isTest
            ? 'Notificação de teste (4h00) enviada para o navegador!'
            : 'Notificação do navegador disparada: 4 horas de direção ininterrupta.',
        });
      } else if (result.reason === 'denied') {
        setNotifFeedback({
          type: 'warning',
          message:
            'Alerta visual ativo. Notificações bloqueadas no navegador — libere no cadeado da barra de endereço.',
        });
      } else if (result.reason === 'default') {
        setNotifFeedback({
          type: 'info',
          message:
            'Alerta visual de 4h ativo. Clique em "Ativar Notificações" para receber avisos nativos do navegador.',
        });
      } else {
        setNotifFeedback({
          type: 'info',
          message: 'Alerta visual de 4h ativo (navegador sem suporte à API de Notificações).',
        });
      }
    },
    []
  );

  const dispatchCustomBreakAlert = useCallback(
    async (seconds: number, minutes: number, isTest = false) => {
      if (customSoundEnabled) {
        playAlertBeep();
      }
      const label = formatReminderIntervalLabel(minutes);
      const result = await sendDriverShiftNotification({
        continuousSeconds: seconds,
        isTest,
        stage: 'custom_break',
        customMinutes: minutes,
      });
      setNotifPermission(getNotificationPermissionStatus());

      if (result.sent) {
        setNotifFeedback({
          type: 'success',
          message: isTest
            ? `Lembrete de teste (${label}) disparado no Cockpit e no navegador!`
            : `Lembrete personalizado disparado no Cockpit: ${label} de direção contínua antes das 4h00.`,
        });
      } else {
        setNotifFeedback({
          type: 'info',
          message: `Alerta visual de pausa (${label}) ativo no Cockpit.`,
        });
      }
    },
    [customSoundEnabled]
  );

  // Watch continuous driving thresholds (custom pre-4h reminder + 4h warning + 5h30 limit)
  useEffect(() => {
    if (status !== 'driving') return;

    if (
      isCustomBreakReminderDue({
        continuousSeconds,
        customEnabled: customReminderEnabled,
        customIntervalMinutes: customReminderMinutes,
        alreadySent: customReminderSent,
      })
    ) {
      setCustomReminderSent(true);
      setCustomReminderDismissed(false);
      void dispatchCustomBreakAlert(continuousSeconds, customReminderMinutes, false);
    }

    if (continuousSeconds >= FOUR_HOUR_ALERT_SECONDS && !fourHourAlertSent) {
      setFourHourAlertSent(true);
      void dispatchFourHourBrowserAlert(continuousSeconds, false);
    }

    if (continuousSeconds >= MAX_CONTINUOUS_SECONDS && !fiveHalfAlertSent) {
      setFiveHalfAlertSent(true);
      playAlertBeep();
      void sendDriverShiftNotification({
        continuousSeconds,
        stage: 'critical_5h30',
      });
    }
  }, [
    continuousSeconds,
    status,
    customReminderEnabled,
    customReminderMinutes,
    customReminderSent,
    fourHourAlertSent,
    fiveHalfAlertSent,
    dispatchCustomBreakAlert,
    dispatchFourHourBrowserAlert,
  ]);

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    const updatedStatus = getNotificationPermissionStatus();
    setNotifPermission(updatedStatus);

    if (granted) {
      playSuccessChime();
      setNotifFeedback({
        type: 'success',
        message: 'Notificações do navegador ativadas! Você será avisado nos marcos configurados.',
      });
    } else if (updatedStatus === 'denied') {
      setNotifFeedback({
        type: 'warning',
        message:
          'Permissão bloqueada pelo navegador. Autorize notificações nas configurações do site.',
      });
    } else {
      setNotifFeedback({
        type: 'info',
        message: 'Permissão pendente. Autorize quando o navegador solicitar.',
      });
    }
  };

  const handleSimulateFourHourAlert = async () => {
    playCockpitClick();
    let permissionNow = getNotificationPermissionStatus();
    if (permissionNow === 'default') {
      await requestNotificationPermission();
      permissionNow = getNotificationPermissionStatus();
      setNotifPermission(permissionNow);
    }

    const simulatedSeconds = Math.max(continuousSeconds, FOUR_HOUR_ALERT_SECONDS);
    setStatus('driving');
    setContinuousSeconds(simulatedSeconds);
    setFourHourAlertSent(true);
    await dispatchFourHourBrowserAlert(simulatedSeconds, true);
  };

  const handleSelectCustomPreset = (minutes: number) => {
    playCockpitClick();
    const clamped = clampCustomReminderMinutes(minutes);
    setCustomReminderEnabled(true);
    setCustomReminderMode('preset');
    setCustomReminderMinutes(clamped);
    setCustomReminderSent(false);
    setCustomReminderDismissed(false);
    setNotifFeedback({
      type: 'info',
      message: `Lembrete de pausa definido para ${formatReminderIntervalLabel(clamped)} (antes das 4h00 obrigatórias).`,
    });
  };

  const handleApplyManualTime = (hours: number, minutes: number): number => {
    playCockpitClick();
    const clamped = hoursMinutesToMinutes(hours, minutes);
    setCustomReminderEnabled(true);
    setCustomReminderMode('manual');
    setCustomReminderMinutes(clamped);
    setCustomReminderSent(false);
    setCustomReminderDismissed(false);
    setNotifFeedback({
      type: 'success',
      message: `Lembrete manual salvo: alerta no Cockpit ao completar ${formatReminderIntervalLabel(clamped)} no volante.`,
    });
    return clamped;
  };

  const handleToggleCustomReminder = (forceEnabled?: boolean) => {
    playCockpitClick();
    setCustomReminderEnabled((prev) =>
      forceEnabled !== undefined ? forceEnabled : !prev
    );
    setCustomReminderSent(false);
    setCustomReminderDismissed(false);
  };

  const handleToggleCustomSound = () => {
    playCockpitClick();
    setCustomSoundEnabled((prev) => !prev);
  };

  const handleTestCustomReminder = async () => {
    playCockpitClick();
    let permissionNow = getNotificationPermissionStatus();
    if (permissionNow === 'default') {
      await requestNotificationPermission();
      permissionNow = getNotificationPermissionStatus();
      setNotifPermission(permissionNow);
    }

    setCustomReminderEnabled(true);
    const targetSeconds = customReminderMinutes * 60;
    setStatus('driving');
    setContinuousSeconds(targetSeconds);
    setCustomReminderSent(true);
    setCustomReminderDismissed(false);
    await dispatchCustomBreakAlert(targetSeconds, customReminderMinutes, true);
  };

  const handleStatusChange = (newStatus: ShiftStatus) => {
    playCockpitClick();
    setStatus(newStatus);
    if (newStatus === 'rest' || newStatus === 'meal' || newStatus === 'sleeping') {
      playSuccessChime();
      setContinuousSeconds(0);
      setCustomReminderSent(false);
      setCustomReminderDismissed(false);
      setFourHourAlertSent(false);
      setFiveHalfAlertSent(false);
      setNotifFeedback(null);
    }
  };

  const handleResetContinuous = () => {
    playCockpitClick();
    setContinuousSeconds(0);
    setCustomReminderSent(false);
    setCustomReminderDismissed(false);
    setFourHourAlertSent(false);
    setFiveHalfAlertSent(false);
    setNotifFeedback(null);
  };

  const alertStage = getShiftAlertStage(continuousSeconds);
  const isContinuousWarning = alertStage === 'warning_4h';
  const isContinuousOvertime = alertStage === 'critical_5h30';
  const customThresholdSeconds = customReminderMinutes * 60;
  const isCustomReminderActive = isCustomBreakVisualAlertActive({
    continuousSeconds,
    customEnabled: customReminderEnabled,
    customIntervalMinutes: customReminderMinutes,
    dismissed: customReminderDismissed,
  });

  const continuousProgress = Math.min(100, (continuousSeconds / MAX_CONTINUOUS_SECONDS) * 100);
  const dailyProgress = Math.min(100, (totalDailySeconds / MAX_DAILY_SECONDS) * 100);
  const remainingContinuous = Math.max(0, MAX_CONTINUOUS_SECONDS - continuousSeconds);
  const remainingToFourHours = Math.max(0, FOUR_HOUR_ALERT_SECONDS - continuousSeconds);
  const remainingToCustomReminder = Math.max(0, customThresholdSeconds - continuousSeconds);
  const fourHourMarkerPercent = (FOUR_HOUR_ALERT_SECONDS / MAX_CONTINUOUS_SECONDS) * 100;
  const customMarkerPercent = getCustomReminderMarkerPercent(customReminderMinutes);
  const customReminderLabel = formatReminderIntervalLabel(customReminderMinutes);

  return {
    status,
    continuousSeconds,
    totalDailySeconds,
    isTimerRunning,
    setIsTimerRunning,
    fourHourAlertSent,
    fiveHalfAlertSent,
    customReminderEnabled,
    customReminderMinutes,
    customReminderMode,
    setCustomReminderMode,
    customSoundEnabled,
    customReminderSent,
    customReminderDismissed,
    notifPermission,
    notifFeedback,
    dismissNotifFeedback: () => setNotifFeedback(null),
    alertStage,
    isContinuousWarning,
    isContinuousOvertime,
    isCustomReminderActive,
    customThresholdSeconds,
    continuousProgress,
    dailyProgress,
    remainingContinuous,
    remainingToFourHours,
    remainingToCustomReminder,
    fourHourMarkerPercent,
    customMarkerPercent,
    customReminderLabel,
    handleRequestNotificationPermission,
    handleSimulateFourHourAlert,
    handleSelectCustomPreset,
    handleApplyManualTime,
    handleToggleCustomReminder,
    handleToggleCustomSound,
    handleTestCustomReminder,
    handleStatusChange,
    handleResetContinuous,
    dismissCustomReminder: () => {
      playCockpitClick();
      setCustomReminderDismissed(true);
    },
  };
}

interface DriverShiftTimerProps {
  controller?: DriverShiftController;
  defaultConfigOpen?: boolean;
}

const QUICK_PRESET_OPTIONS: Array<{ minutes: number; title: string; subtitle: string }> = [
  { minutes: 90, title: '1h30', subtitle: 'Curta' },
  { minutes: 120, title: '2h00', subtitle: 'Recomendado' },
  { minutes: 150, title: '2h30', subtitle: 'Moderado' },
  { minutes: 180, title: '3h00', subtitle: 'Estendido' },
  { minutes: 210, title: '3h30', subtitle: 'Pré-4h' },
];

export const DriverShiftTimer: React.FC<DriverShiftTimerProps> = ({
  controller: externalController,
  defaultConfigOpen = false,
}) => {
  const internalController = useDriverShiftController();
  const c = externalController ?? internalController;

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState<boolean>(defaultConfigOpen);

  // Local draft fields for manual Hours + Minutes entry inside the configuration panel
  const initialSplit = minutesToHoursMinutes(c.customReminderMinutes);
  const [manualHoursInput, setManualHoursInput] = useState<string>(String(initialSplit.hours));
  const [manualMinutesInput, setManualMinutesInput] = useState<string>(
    String(initialSplit.minutes).padStart(2, '0')
  );

  useEffect(() => {
    const split = minutesToHoursMinutes(c.customReminderMinutes);
    setManualHoursInput(String(split.hours));
    setManualMinutesInput(String(split.minutes).padStart(2, '0'));
  }, [c.customReminderMinutes]);

  const draftTotalMinutes = hoursMinutesToMinutes(
    parseInt(manualHoursInput || '0', 10) || 0,
    parseInt(manualMinutesInput || '0', 10) || 0
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(manualHoursInput || '0', 10);
    const m = parseInt(manualMinutesInput || '0', 10);
    const applied = c.handleApplyManualTime(Number.isNaN(h) ? 0 : h, Number.isNaN(m) ? 0 : m);
    const normalized = minutesToHoursMinutes(applied);
    setManualHoursInput(String(normalized.hours));
    setManualMinutesInput(String(normalized.minutes).padStart(2, '0'));
  };

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 md:p-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#334155]">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-[#f59e0b] shrink-0" />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#d8e3fb]">
              Controle de Jornada & Tacógrafo (Lei 13.103/15)
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Alerta preventivo às 4h00 de direção contínua • Descanso obrigatório de 30 min até 5h30.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setIsConfigPanelOpen((prev) => !prev);
            }}
            aria-expanded={isConfigPanelOpen}
            className={`h-9 px-3 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isConfigPanelOpen
                ? 'bg-[#082f49] text-[#38bdf8] border-[#38bdf8]/50'
                : 'bg-[#243248] text-[#d8e3fb] border-[#475569] hover:border-[#38bdf8]/50'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Configurar Lembretes</span>
            {isConfigPanelOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              c.setIsTimerRunning(!c.isTimerRunning);
            }}
            className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              c.isTimerRunning
                ? 'bg-[#243248] text-[#ffb95f] border border-[#ffb95f]/40'
                : 'bg-[#10b981] text-[#022c22]'
            }`}
          >
            {c.isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {c.isTimerRunning ? 'Pausar' : 'Retomar'}
          </button>

          <button
            type="button"
            onClick={c.handleResetContinuous}
            title="Zerar Volante (Após 30m de descanso)"
            className="w-9 h-9 rounded-lg bg-[#243248] hover:bg-[#2a3548] border border-[#475569] text-[#94a3b8] flex items-center justify-center cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser Notification API Bar */}
      <div className="mt-3 p-3.5 rounded-xl bg-[#0f172a] border border-[#334155] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {c.notifPermission === 'granted' ? (
            <div className="w-9 h-9 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-[#10b981]" />
            </div>
          ) : c.notifPermission === 'denied' || c.notifPermission === 'unsupported' ? (
            <div className="w-9 h-9 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/40 flex items-center justify-center shrink-0">
              <BellOff className="w-4 h-4 text-[#f87171]" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[#f59e0b]" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-extrabold uppercase tracking-wide text-[#d8e3fb]">
                Alertas do Navegador (Marca 4h00)
              </span>
              <span aria-hidden="true" className="text-[#475569]">·</span>
              <span
                className={`font-bold ${
                  c.notifPermission === 'granted'
                    ? 'text-[#34d399]'
                    : c.notifPermission === 'denied'
                    ? 'text-[#fca5a5]'
                    : c.notifPermission === 'unsupported'
                    ? 'text-[#94a3b8]'
                    : 'text-[#ffb95f]'
                }`}
              >
                {c.notifPermission === 'granted'
                  ? 'Notificações Ativas'
                  : c.notifPermission === 'denied'
                  ? 'Bloqueadas'
                  : c.notifPermission === 'unsupported'
                  ? 'Sem Suporte'
                  : 'Aguardando Permissão'}
              </span>
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              {c.notifPermission === 'granted'
                ? 'O navegador enviará uma notificação automática ao atingir seus lembretes e 4h00 no volante.'
                : c.notifPermission === 'denied'
                ? 'Libere as notificações no navegador para receber alertas mesmo em outra aba.'
                : 'Ative as notificações do navegador para ser avisado nos lembretes de pausa e às 4h ininterruptas.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {c.notifPermission === 'default' && (
            <button
              type="button"
              onClick={c.handleRequestNotificationPermission}
              className="h-9 px-3 rounded-lg bg-[#f59e0b] hover:bg-[#fbbf24] text-[#0f172a] font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Bell className="w-3.5 h-3.5" />
              Ativar Notificações
            </button>
          )}

          <button
            type="button"
            onClick={c.handleSimulateFourHourAlert}
            className="h-9 px-3 rounded-lg bg-[#243248] hover:bg-[#2a3548] border border-[#475569] text-[#d8e3fb] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <BellRing className="w-3.5 h-3.5 text-[#ffb95f]" />
            Testar Alerta 4h
          </button>
        </div>
      </div>

      {/* Dedicated Custom Break Reminder Configuration Panel */}
      {isConfigPanelOpen && (
        <section
          aria-label="Painel de Configuração de Lembretes de Pausa"
          className="mt-3 p-4 rounded-xl bg-[#0f172a] border border-[#38bdf8]/40 space-y-4"
        >
          {/* Panel Header + Master Activation Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#334155]/70">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#082f49] border border-[#38bdf8]/40 flex items-center justify-center shrink-0">
                <Settings2 className="w-4 h-4 text-[#38bdf8]" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#d8e3fb]">
                  Painel de Configuração de Lembretes de Pausa
                </h4>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#94a3b8] mt-0.5">
                  <span>
                    Status:{' '}
                    <strong className={c.customReminderEnabled ? 'text-[#38bdf8]' : 'text-[#94a3b8]'}>
                      {c.customReminderEnabled
                        ? `Ativo a cada ${c.customReminderLabel}`
                        : 'Desativado'}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Modo:{' '}
                    <strong className="text-[#cbd5e1]">
                      {c.customReminderMode === 'manual' ? 'Manual' : 'Intervalo Rápido'}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {c.customReminderEnabled
                      ? c.remainingToCustomReminder > 0
                        ? `Faltam ${formatShortHours(c.remainingToCustomReminder)}`
                        : 'Tempo atingido — alerta ativo no cockpit'
                      : 'Antes das 4h00 obrigatórias'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => c.handleToggleCustomReminder()}
                className={`h-9 px-3.5 rounded-lg text-xs font-extrabold border transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  c.customReminderEnabled
                    ? 'bg-[#38bdf8] text-[#082f49] border-[#38bdf8]'
                    : 'bg-[#1e293b] text-[#94a3b8] border-[#475569] hover:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>{c.customReminderEnabled ? 'Lembrete Ativado' : 'Ativar Lembrete'}</span>
              </button>

              <button
                type="button"
                onClick={c.handleTestCustomReminder}
                className="h-9 px-3 rounded-lg bg-[#243248] hover:bg-[#2a3548] border border-[#38bdf8]/40 text-[#38bdf8] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Simula atingir o tempo configurado e exibe o alerta visual no Cockpit"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Testar Alerta ({c.customReminderLabel})</span>
              </button>
            </div>
          </div>

          {/* Segmented Mode Switcher: Quick Intervals vs Manual */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Modo de definição do lembrete"
              className="inline-flex items-center gap-1 p-1 bg-[#152031] rounded-lg border border-[#334155]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={c.customReminderMode === 'preset'}
                onClick={() => {
                  playCockpitClick();
                  c.setCustomReminderMode('preset');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  c.customReminderMode === 'preset'
                    ? 'bg-[#38bdf8] text-[#082f49] font-extrabold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Intervalos Rápidos (2h, 3h...)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={c.customReminderMode === 'manual'}
                onClick={() => {
                  playCockpitClick();
                  c.setCustomReminderMode('manual');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  c.customReminderMode === 'manual'
                    ? 'bg-[#38bdf8] text-[#082f49] font-extrabold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Definir Manual (Horas / Min)
              </button>
            </div>

            <button
              type="button"
              onClick={c.handleToggleCustomSound}
              className={`h-9 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                c.customSoundEnabled
                  ? 'bg-[#152031] border-[#10b981]/40 text-[#34d399]'
                  : 'bg-[#152031] border-[#334155] text-[#94a3b8]'
              }`}
              title="Ativar ou silenciar aviso sonoro quando o lembrete disparar"
            >
              {c.customSoundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>{c.customSoundEnabled ? 'Som do Alerta: Ativo' : 'Som do Alerta: Mudo'}</span>
            </button>
          </div>

          {/* Mode Content */}
          {c.customReminderMode === 'preset' ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {QUICK_PRESET_OPTIONS.map((preset) => {
                const isSelected =
                  c.customReminderEnabled && c.customReminderMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => c.handleSelectCustomPreset(preset.minutes)}
                    className={`min-h-[48px] px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#082f49] text-[#e0f2fe] border-[#38bdf8]'
                        : 'bg-[#152031] text-[#cbd5e1] border-[#334155] hover:border-[#38bdf8]/50'
                    }`}
                  >
                    <div>
                      <div className="font-mono tabular-nums text-sm font-extrabold">
                        {preset.title}
                      </div>
                      <div className="text-[11px] text-[#94a3b8]">{preset.subtitle}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#38bdf8] shrink-0" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              onSubmit={handleManualSubmit}
              className="pt-2 border-t border-[#334155]/60 flex flex-wrap items-end justify-between gap-3"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="custom-break-hours"
                    className="block text-[11px] font-bold text-[#94a3b8] mb-1"
                  >
                    Horas (0 a 3h)
                  </label>
                  <input
                    id="custom-break-hours"
                    type="number"
                    min={0}
                    max={3}
                    value={manualHoursInput}
                    onChange={(e) => setManualHoursInput(e.target.value)}
                    className="w-24 h-10 px-3 rounded-lg bg-[#081425] border border-[#334155] focus:border-[#38bdf8] text-sm font-mono tabular-nums font-bold text-[#d8e3fb] outline-hidden"
                  />
                </div>

                <div>
                  <label
                    htmlFor="custom-break-minutes"
                    className="block text-[11px] font-bold text-[#94a3b8] mb-1"
                  >
                    Minutos (0 a 59m)
                  </label>
                  <input
                    id="custom-break-minutes"
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={manualMinutesInput}
                    onChange={(e) => setManualMinutesInput(e.target.value)}
                    className="w-24 h-10 px-3 rounded-lg bg-[#081425] border border-[#334155] focus:border-[#38bdf8] text-sm font-mono tabular-nums font-bold text-[#d8e3fb] outline-hidden"
                  />
                </div>

                <div className="pb-2 text-xs text-[#94a3b8] font-mono tabular-nums">
                  Intervalo:{' '}
                  <strong className="text-[#38bdf8]">
                    {formatReminderIntervalLabel(draftTotalMinutes)}
                  </strong>{' '}
                  ({draftTotalMinutes} min • limite 15m a 3h55)
                </div>
              </div>

              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[#38bdf8] hover:bg-[#7dd3fc] text-[#082f49] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Tempo Manual</span>
              </button>
            </form>
          )}
        </section>
      )}

      {/* Feedback Banner */}
      {c.notifFeedback && (
        <div
          className={`mt-2.5 px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 ${
            c.notifFeedback.type === 'success'
              ? 'bg-[#064e3b]/40 border-[#10b981]/40 text-[#a7f3d0]'
              : c.notifFeedback.type === 'warning'
              ? 'bg-[#472a00]/60 border-[#f59e0b]/50 text-[#fde68a]'
              : 'bg-[#1e293b] border-[#475569] text-[#cbd5e1]'
          }`}
        >
          <span>{c.notifFeedback.message}</span>
          <button
            type="button"
            onClick={c.dismissNotifFeedback}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Timers Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        {/* Continuous Driving Timer */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            c.isContinuousOvertime
              ? 'bg-[#690005]/45 border-[#ea580c] text-[#ffdad6]'
              : c.isContinuousWarning
              ? 'bg-[#472a00]/55 border-[#f59e0b] shadow-[0_0_0_1px_rgba(245,158,11,0.3)]'
              : c.isCustomReminderActive
              ? 'bg-[#082f49]/45 border-[#38bdf8]'
              : 'bg-[#0f172a] border-[#334155]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1 gap-2">
            <span>Tempo Contínuo no Volante</span>
            <div className="flex items-center gap-2">
              {c.isCustomReminderActive && (
                <span className="inline-flex items-center gap-1 text-[#38bdf8] text-[11px] font-extrabold">
                  <Coffee className="w-3.5 h-3.5" />
                  PAUSA {c.customReminderLabel}
                </span>
              )}
              {c.isContinuousWarning && (
                <span className="inline-flex items-center gap-1 text-[#fbbf24] text-[11px] font-extrabold">
                  <BellRing className="w-3.5 h-3.5" />
                  4H ATINGIDAS
                </span>
              )}
              {c.isContinuousOvertime && (
                <span className="inline-flex items-center gap-1 text-[#ffb4ab] text-[11px] font-extrabold">
                  ESTOURO 5H30
                </span>
              )}
              <span className={c.isContinuousOvertime ? 'text-[#ffb4ab]' : 'text-[#f59e0b]'}>
                Alerta 4h / Máx 5h30
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <span
              className={`font-mono tabular-nums font-extrabold text-2xl lg:text-3xl tracking-tight ${
                c.isContinuousOvertime
                  ? 'text-[#ffb4ab]'
                  : c.isContinuousWarning
                  ? 'text-[#f59e0b]'
                  : c.isCustomReminderActive
                  ? 'text-[#38bdf8]'
                  : 'text-[#d8e3fb]'
              }`}
            >
              {formatTimeSeconds(c.continuousSeconds)}
            </span>
            <span className="text-xs font-bold text-[#94a3b8] font-mono tabular-nums">
              {c.isContinuousOvertime
                ? 'ESTOURO!'
                : c.isContinuousWarning
                ? `Limite em ${formatShortHours(c.remainingContinuous)}`
                : c.customReminderEnabled && c.remainingToCustomReminder > 0
                ? `Pausa ${c.customReminderLabel} em ${formatShortHours(c.remainingToCustomReminder)}`
                : `Alerta 4h em ${formatShortHours(c.remainingToFourHours)}`}
            </span>
          </div>

          {/* Progress Bar with Custom & 4h Threshold Markers */}
          <div className="relative w-full h-3 bg-[#152031] rounded-full overflow-hidden mt-3 border border-[#334155]">
            <div
              style={{ width: `${c.continuousProgress}%` }}
              className={`h-full transition-all duration-300 ${
                c.isContinuousOvertime
                  ? 'bg-[#ea580c]'
                  : c.isContinuousWarning
                  ? 'bg-[#f59e0b]'
                  : c.isCustomReminderActive
                  ? 'bg-[#38bdf8]'
                  : 'bg-[#10b981]'
              }`}
            />
            {c.customReminderEnabled && (
              <div
                style={{ left: `${c.customMarkerPercent}%` }}
                title={`Lembrete personalizado: ${c.customReminderLabel}`}
                className="absolute top-0 bottom-0 w-0.5 bg-[#38bdf8] z-10"
              />
            )}
            {/* 4-hour Lei do Motorista threshold marker */}
            <div
              style={{ left: `${c.fourHourMarkerPercent}%` }}
              title="Marco de 4h00 ininterruptas (Lei do Motorista)"
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
            />
          </div>
          <div className="relative flex justify-between text-[10px] font-bold font-mono tabular-nums text-[#94a3b8] mt-1">
            <span>0h</span>
            {c.customReminderEnabled && (
              <span
                style={{ left: `${c.customMarkerPercent}%` }}
                className="absolute -translate-x-1/2 text-[#38bdf8] font-bold"
              >
                {c.customReminderLabel}
              </span>
            )}
            <span
              style={{ left: `${c.fourHourMarkerPercent}%` }}
              className={`absolute -translate-x-1/2 ${
                c.isContinuousWarning || c.isContinuousOvertime
                  ? 'text-[#ffb95f] font-extrabold'
                  : 'text-[#94a3b8]'
              }`}
            >
              {c.customReminderEnabled && c.customReminderMinutes >= 195 ? '4h00' : '4h00 (Alerta)'}
            </span>
            <span>5h30</span>
          </div>
        </div>

        {/* Daily Total Driving Timer */}
        <div className="p-4 rounded-xl bg-[#0f172a] border border-[#334155]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#94a3b8] mb-1">
            <span>Total Dirigido Hoje</span>
            <span className="text-[#bec6e0]">Limite Diário: 10h</span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="font-mono tabular-nums font-extrabold text-2xl lg:text-3xl text-[#d8e3fb] tracking-tight">
              {formatTimeSeconds(c.totalDailySeconds)}
            </span>
            <span className="text-xs font-bold text-[#94a3b8] font-mono tabular-nums">
              {Math.round(c.dailyProgress)}% da diária
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-[#152031] rounded-full overflow-hidden mt-3 border border-[#334155]">
            <div
              style={{ width: `${c.dailyProgress}%` }}
              className="h-full bg-[#ffb95f] transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold font-mono tabular-nums text-[#94a3b8] mt-1">
            <span>0h</span>
            <span>5h</span>
            <span>10h (Máx)</span>
          </div>
        </div>
      </div>

      {/* Custom Pre-4h Break Reminder Visual Alert Banner */}
      {c.isCustomReminderActive && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-[#082f49] border-2 border-[#38bdf8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#e0f2fe] shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#38bdf8]/20 border border-[#38bdf8] flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-[#38bdf8]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#38bdf8]">
                  LEMBRETE PERSONALIZADO DE PAUSA ({c.customReminderLabel} NO VOLANTE)
                </span>
              </div>
              <p className="text-xs text-[#bae6fd] mt-1">
                Você atingiu seu intervalo personalizado de <strong>{c.customReminderLabel}</strong>{' '}
                de direção contínua. Ainda restam{' '}
                <strong>{formatShortHours(c.remainingToFourHours)}</strong> para o alerta obrigatório
                de 4h00 da Lei do Motorista.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => c.handleStatusChange('rest')}
              className="h-10 px-3.5 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
            >
              <Coffee className="w-4 h-4" />
              Iniciar Pausa
            </button>
            <button
              type="button"
              onClick={c.dismissCustomReminder}
              className="h-10 px-3 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] border border-[#38bdf8]/40 text-xs font-bold text-[#bae6fd] cursor-pointer transition-all whitespace-nowrap"
            >
              Dispensar
            </button>
          </div>
        </div>
      )}

      {/* 4-Hour Preventive Visual Alert Banner (Lei do Motorista) */}
      {c.isContinuousWarning && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-[#472a00] border-2 border-[#f59e0b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#fef3c7] shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f59e0b]/20 border border-[#f59e0b] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#fbbf24]">
                  ALERTA VISUAL 4H00 — LEI DO MOTORISTA (LEI 13.103/15)
                </span>
                {c.fourHourAlertSent && (
                  <span className="text-[11px] font-bold text-[#ffb95f]">
                    · {c.notifPermission === 'granted' ? 'Notificação Enviada' : 'Alerta em Tela'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#fde68a] mt-1">
                Você completou <strong>4 horas ininterruptas</strong> no volante. Programe um ponto
                de parada seguro para cumprir o descanso obrigatório de 30 minutos antes de atingir
                5h30 ({formatShortHours(c.remainingContinuous)} restantes).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => c.handleStatusChange('rest')}
            className="h-10 px-3.5 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all whitespace-nowrap"
          >
            <Coffee className="w-4 h-4" />
            Iniciar Descanso 30m
          </button>
        </div>
      )}

      {/* Critical 5h30 Overtime Banner */}
      {c.isContinuousOvertime && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-[#690005] border-2 border-[#ea580c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#ffdad6] shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ef4444]/25 border border-[#ffb4ab] flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-[#ffb4ab]" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#ffb4ab]">
                ALERTA CRÍTICO TACÓGRAFO — LIMITE DE 5H30 EXCEDIDO
              </span>
              <p className="text-xs mt-1 font-medium">
                Você atingiu o limite máximo legal de 5h30 de direção contínua (Lei 13.103/15).
                Encoste imediatamente no próximo ponto de apoio para o descanso obrigatório de 30
                minutos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => c.handleStatusChange('rest')}
            className="h-10 px-3.5 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all whitespace-nowrap"
          >
            <Coffee className="w-4 h-4" />
            Registrar Descanso 30m
          </button>
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
            onClick={() => c.handleStatusChange('driving')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              c.status === 'driving'
                ? 'bg-[#f59e0b] text-[#0f172a] border-[#f59e0b] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Truck className="w-5 h-5" />
            Em Rodagem
          </button>

          <button
            type="button"
            onClick={() => c.handleStatusChange('rest')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              c.status === 'rest'
                ? 'bg-[#10b981] text-[#022c22] border-[#10b981] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Coffee className="w-5 h-5" />
            Descanso 30m
          </button>

          <button
            type="button"
            onClick={() => c.handleStatusChange('meal')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              c.status === 'meal'
                ? 'bg-[#38bdf8] text-[#082f49] border-[#38bdf8] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <Utensils className="w-5 h-5" />
            Refeição
          </button>

          <button
            type="button"
            onClick={() => c.handleStatusChange('loading')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              c.status === 'loading'
                ? 'bg-[#bec6e0] text-[#0f172a] border-[#bec6e0] shadow-md font-extrabold'
                : 'bg-[#152031] text-[#d8e3fb] border-[#334155] hover:bg-[#243248]'
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            Carga/Descarga
          </button>

          <button
            type="button"
            onClick={() => c.handleStatusChange('sleeping')}
            className={`h-14 min-h-[56px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              c.status === 'sleeping'
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
