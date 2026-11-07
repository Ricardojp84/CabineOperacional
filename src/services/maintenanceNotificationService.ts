/**
 * Cabine Operacional do Caminhoneiro - Serviço de Notificações Locais Web API
 * Responsável por gerenciar permissões, Service Worker e envio de alertas críticos
 * de manutenção preventiva quando o aplicativo estiver em background ou com tela bloqueada.
 */

import { MaintenanceItem } from '../types/cockpit';
import { formatOdometer, formatKm } from '../utils/formatters';
import { playAlertBeep, playCockpitClick } from '../utils/audio';

export type NotificationSupportStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface CriticalItemAnalysis {
  item: MaintenanceItem;
  isOverdue: boolean;
  isCriticalImminent: boolean;
  kmDifference: number; // Positivo = atrasado/vencido por X km; Negativo = faltam X km
  urgencyLevel: 'overdue' | 'imminent';
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: { action: string; title: string; icon?: string }[];
  renotify?: boolean;
  vibrate?: number[];
}

const NOTIFICATION_THROTTLE_MS = 15 * 60 * 1000; // 15 minutos entre notificações automáticas repetidas
const STORAGE_KEY_LAST_NOTIF = 'cabine_last_maintenance_notification_time';
const STORAGE_KEY_NOTIF_ENABLED = 'cabine_background_notifications_enabled';

let swRegistration: ServiceWorkerRegistration | null = null;
let watcherIntervalId: number | null = null;

/**
 * Registra o Service Worker dedicado para gerenciar notificações com tela apagada/bloqueada
 */
export async function registerMaintenanceServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    swRegistration = reg;
    return reg;
  } catch (error) {
    console.warn('[Web Notification] Falha ao registrar Service Worker:', error);
    return null;
  }
}

/**
 * Retorna o status atual de suporte e permissão de Notificação do navegador
 */
export function getNotificationPermissionStatus(): NotificationSupportStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationSupportStatus;
}

/**
 * Solicita ao motorista a permissão nativa para envio de Notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  playCockpitClick();

  try {
    const permission = await Notification.requestPermission();
    const isGranted = permission === 'granted';
    if (isGranted) {
      localStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, 'true');
      await registerMaintenanceServiceWorker();
    }
    return isGranted;
  } catch (error) {
    console.error('[Web Notification] Erro ao solicitar permissão:', error);
    return false;
  }
}

/**
 * Verifica se as notificações em segundo plano estão ativadas pelo motorista no cockpit
 */
export function isBackgroundNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const permission = getNotificationPermissionStatus();
  if (permission !== 'granted') return false;
  return localStorage.getItem(STORAGE_KEY_NOTIF_ENABLED) !== 'false';
}

/**
 * Habilita ou desabilita as notificações de manutenção nas preferências locais
 */
export function setBackgroundNotificationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_NOTIF_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Analisa a lista de itens de manutenção contra o hodômetro atual do caminhão
 * e identifica itens vencidos (atrasados) ou criticamente iminentes (menos de 500 km ou urgência máxima)
 */
export function analyzeCriticalMaintenance(
  items: MaintenanceItem[],
  currentOdometer: number
): CriticalItemAnalysis[] {
  const criticalList: CriticalItemAnalysis[] = [];

  items.forEach((item) => {
    const kmDifference = currentOdometer - item.nextDueKm;
    const isOverdue = kmDifference >= 0;
    const kmRemaining = item.nextDueKm - currentOdometer;
    const isCriticalImminent = !isOverdue && (kmRemaining <= 500 || item.urgency === 'urgent');

    if (isOverdue) {
      criticalList.push({
        item,
        isOverdue: true,
        isCriticalImminent: false,
        kmDifference,
        urgencyLevel: 'overdue',
      });
    } else if (isCriticalImminent) {
      criticalList.push({
        item,
        isOverdue: false,
        isCriticalImminent: true,
        kmDifference: kmRemaining,
        urgencyLevel: 'imminent',
      });
    }
  });

  // Ordena os itens mais urgentes primeiro (vencidos há mais tempo primeiro)
  criticalList.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isOverdue && b.isOverdue) return b.kmDifference - a.kmDifference;
    return a.kmDifference - b.kmDifference;
  });

  return criticalList;
}

export interface DispatchNotificationOptions {
  items: MaintenanceItem[];
  currentOdometer: number;
  truckPlate?: string;
  truckModel?: string;
  isBackground?: boolean;
  force?: boolean; // Forçar envio imediato (ex: teste ou verificação manual)
}

/**
 * Dispara uma notificação nativa do sistema operacional (Web Notification API)
 * usando Service Worker para máxima confiabilidade quando a tela estiver bloqueada ou em background
 */
export async function sendCriticalMaintenanceNotification(
  options: DispatchNotificationOptions
): Promise<boolean> {
  const {
    items,
    currentOdometer,
    truckPlate = 'BRA-2026',
    truckModel = 'Scania R540',
    isBackground = false,
    force = false,
  } = options;

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // Verifica se o recurso está ativado nas preferências
  if (!force && !isBackgroundNotificationEnabled()) {
    return false;
  }

  const criticalAnalyses = analyzeCriticalMaintenance(items, currentOdometer);
  if (criticalAnalyses.length === 0 && !force) {
    return false;
  }

  // Controle de frequência (anti-spam para não inundar o motorista na estrada)
  if (!force) {
    const lastNotifStr = localStorage.getItem(STORAGE_KEY_LAST_NOTIF);
    if (lastNotifStr) {
      const lastTime = parseInt(lastNotifStr, 10);
      if (Date.now() - lastTime < NOTIFICATION_THROTTLE_MS) {
        return false;
      }
    }
  }

  // Constrói o texto do alerta
  const overdueCount = criticalAnalyses.filter((c) => c.isOverdue).length;
  const imminentCount = criticalAnalyses.filter((c) => c.isCriticalImminent).length;

  let title = '🚨 CABINE: ALERTA DE MANUTENÇÃO';
  let body = '';

  if (criticalAnalyses.length > 0) {
    const primary = criticalAnalyses[0];
    const itemTitle = primary.item.title;

    if (primary.isOverdue) {
      title = `🚨 ${truckPlate}: ${overdueCount} MANUTENÇÃO(ÕES) VENCIDA(S)!`;
      body = `CRÍTICO: ${itemTitle} venceu há ${formatKm(primary.kmDifference)}. Hodômetro: ${formatOdometer(currentOdometer)}. Risco de quebra ou parada na estrada!`;
    } else {
      title = `⚠️ ${truckPlate}: MANUTENÇÃO IMINENTE`;
      body = `ATENÇÃO: ${itemTitle} deve ser revisado em ${formatKm(primary.kmDifference)}. Hodômetro: ${formatOdometer(currentOdometer)}.`;
    }

    if (criticalAnalyses.length > 1) {
      const others = criticalAnalyses.length - 1;
      body += ` (+${others} outro${others > 1 ? 's' : ''} item${others > 1 ? 's' : ''} pendente${others > 1 ? 's' : ''})`;
    }
  } else {
    // Alerta de teste forçado
    title = `🔧 ${truckPlate}: TESTE DE ALERTA EM SEGUNDO PLANO`;
    body = `Vigilância ativa! Notificações com tela bloqueada e hodômetro em ${formatOdometer(currentOdometer)} estão operando com sucesso.`;
  }

  // Dispara áudio se estiver ativo
  try {
    playAlertBeep();
  } catch {
    // Audio pode requerer interação prévia do usuário
  }

  const notificationOptions: ExtendedNotificationOptions = {
    body,
    icon: '/notification-icon.svg',
    badge: '/notification-icon.svg',
    tag: 'cabine-maintenance-critical-alert',
    renotify: true,
    requireInteraction: true, // Mantém a notificação visível até o motorista interagir
    // Padrão de vibração pesado para cabine de caminhão (300ms vibra, 150ms pausa, 300ms vibra, 150ms pausa, 500ms vibra)
    vibrate: [300, 150, 300, 150, 500],
    data: {
      url: '/#manutencao',
      timestamp: Date.now(),
      truckPlate,
      truckModel,
      isBackground,
    },
    actions: [
      { action: 'open_maintenance', title: '🔧 Ver Manutenções' },
      { action: 'dismiss', title: '✖ Dispensar' },
    ],
  };

  try {
    // Método 1: Exibição através do Service Worker Registration (Suporta background e tela bloqueada)
    if (!swRegistration && 'serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.ready.catch(() => null);
    }

    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, notificationOptions);
    } else if ('Notification' in window) {
      // Método 2: Fallback para Notification API direta
      new Notification(title, notificationOptions);
    }

    localStorage.setItem(STORAGE_KEY_LAST_NOTIF, Date.now().toString());
    return true;
  } catch (error) {
    console.error('[Web Notification] Falha ao disparar notificação:', error);
    // Tenta fallback direto se o service worker falhar
    try {
      new Notification(title, notificationOptions);
      localStorage.setItem(STORAGE_KEY_LAST_NOTIF, Date.now().toString());
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Dispara um teste com delay (ex: 3 segundos) para o motorista poder bloquear o celular
 * ou alternar para outro app e comprovar que a notificação local chega na tela bloqueada.
 */
export async function scheduleTestBackgroundNotification(
  delaySeconds = 3,
  currentOdometer = 384520,
  truckPlate = 'BRA-2026'
): Promise<boolean> {
  const perm = getNotificationPermissionStatus();
  if (perm !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  if (!swRegistration && 'serviceWorker' in navigator) {
    swRegistration = await navigator.serviceWorker.ready.catch(() => null);
  }

  const title = `🚨 [TESTE DE BLOQUEIO] ${truckPlate} - MANUTENÇÃO`;
  const options: ExtendedNotificationOptions = {
    body: `Óleo do Motor venceu há 320 km! Notificação recebida com a tela bloqueada ou em background.`,
    icon: '/notification-icon.svg',
    badge: '/notification-icon.svg',
    tag: 'cabine-test-notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 500],
    data: {
      url: '/#manutencao',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open_maintenance', title: '🔧 Abrir Oficina' },
      { action: 'dismiss', title: '✖ Fechar' },
    ],
  };

  // Se o Service Worker estiver ativo, delega o envio via setTimeout pelo worker
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_BACKGROUND_CHECK',
      delayMs: delaySeconds * 1000,
      notificationData: { title, options },
    });
    return true;
  }

  // Fallback via timer da janela se o SW não estiver pronto
  setTimeout(() => {
    if (swRegistration) {
      swRegistration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  }, delaySeconds * 1000);

  return true;
}

export interface BackgroundWatcherOptions {
  getOdometer: () => number;
  getMaintenanceItems: () => MaintenanceItem[];
  getTruckInfo?: () => { plate: string; model: string };
  onNavigateToMaintenance?: () => void;
}

/**
 * Inicializa a escuta de segundo plano:
 * 1. Monitora o evento `visibilitychange` (quando o motorista bloqueia a tela ou minimiza o app)
 * 2. Roda um heartbeat a cada 60s enquanto a página estiver viva
 * 3. Escuta cliques vindos do Service Worker para redirecionar para a aba de manutenção
 */
export function setupBackgroundMaintenanceWatcher(
  options: BackgroundWatcherOptions
): () => void {
  if (typeof window === 'undefined') return () => {};

  registerMaintenanceServiceWorker();

  const checkAndNotify = (isBackground: boolean) => {
    if (Notification.permission !== 'granted') return;
    if (!isBackgroundNotificationEnabled()) return;

    const currentOdo = options.getOdometer();
    const items = options.getMaintenanceItems();
    const truck = options.getTruckInfo?.() || { plate: 'BRA-2026', model: 'Scania R540' };

    const critical = analyzeCriticalMaintenance(items, currentOdo);
    if (critical.length > 0) {
      sendCriticalMaintenanceNotification({
        items,
        currentOdometer: currentOdo,
        truckPlate: truck.plate,
        truckModel: truck.model,
        isBackground,
        force: false,
      });
    }
  };

  // 1. Ouvinte quando o app vai para background ou a tela é bloqueada
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // O motorista minimizou o app, desligou a tela ou bloqueou o telefone
      checkAndNotify(true);
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 2. Intervalo periódico (a cada 60 segundos)
  if (watcherIntervalId !== null) {
    clearInterval(watcherIntervalId);
  }

  watcherIntervalId = window.setInterval(() => {
    const isHidden = document.visibilityState === 'hidden';
    checkAndNotify(isHidden);
  }, 60000);

  // 3. Ouvinte de mensagens do Service Worker (quando o motorista clica na notificação)
  const handleSwMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'OPEN_MAINTENANCE_TAB') {
      if (options.onNavigateToMaintenance) {
        options.onNavigateToMaintenance();
      }
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
  }

  // Função de desmonte / cleanup
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (watcherIntervalId !== null) {
      clearInterval(watcherIntervalId);
      watcherIntervalId = null;
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  };
}
