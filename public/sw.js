// Cabine Operacional do Caminhoneiro - Service Worker de Notificações em Segundo Plano
const SW_VERSION = 'v1.1.0';

self.addEventListener('install', (event) => {
  // Ativação imediata do service worker sem aguardar fechamento de abas
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Reivindica o controle de todos os clientes abertos imediatamente
  event.waitUntil(self.clients.claim());
});

// Manipulador de clique em notificações na tela de bloqueio ou barra de status
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === 'dismiss') {
    return;
  }

  // Ação padrão ou 'open_maintenance': focar o app e navegar para a aba de manutenção
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma janela aberta do app, traz para primeiro plano e envia mensagem
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'OPEN_MAINTENANCE_TAB',
            itemId: data.itemId,
            url: data.url || '/#manutencao',
          });
          return;
        }
      }

      // Se o app estava fechado, abre uma nova janela apontando para manutenção
      if (self.clients.openWindow) {
        return self.clients.openWindow(data.url || '/#manutencao');
      }
    })
  );
});

// Permite ao cliente agendar ou forçar exibição de notificações diretamente pelo Service Worker
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'SHOW_CRITICAL_NOTIFICATION') {
    const title = msg.title || '🚨 ALERTA CRÍTICO DE MANUTENÇÃO';
    const options = msg.options || {};
    self.registration.showNotification(title, options);
  }

  if (msg.type === 'SCHEDULE_BACKGROUND_CHECK') {
    const delayMs = msg.delayMs || 3000;
    setTimeout(() => {
      if (msg.notificationData) {
        self.registration.showNotification(
          msg.notificationData.title,
          msg.notificationData.options
        );
      }
    }, delayMs);
  }
});
