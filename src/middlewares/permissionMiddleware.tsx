import React from 'react';
import { User, isAdminRole, isUserAdmin } from '../types/cockpit';
import { getCurrentUserSession } from '../data/mockUsers';
import { playCockpitClick } from '../utils/audio';
import { ShieldAlert, Lock, X, LogIn, AlertCircle } from 'lucide-react';

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  user: User | null;
}

/**
 * Valida se o usuário fornecido ou a sessão ativa possui privilégios legítimos de Administrador.
 * Conforme a política de segurança:
 * - O usuário deve ter role 'admin', 'administrador' ou 'gestor_frota'
 * - O usuário deve ser verificado pelo Supabase (isSupabaseVerifiedAdmin === true)
 */
export function checkAdminPermission(currentUser?: User | null): PermissionCheckResult {
  const user = currentUser ?? getCurrentUserSession();

  if (!user) {
    return {
      allowed: false,
      reason: 'Nenhum usuário autenticado no sistema.',
      user: null,
    };
  }

  if (!isAdminRole(user.role)) {
    return {
      allowed: false,
      reason: `O usuário '${user.name}' possui perfil operacional de '${user.role || 'motorista'}'. Funções administrativas de banco de dados, chaves de API e backup são restritas ao cargo 'admin'.`,
      user,
    };
  }

  if (!user.isSupabaseVerifiedAdmin) {
    return {
      allowed: false,
      reason: `A conta '${user.email}' não possui validação de administrador no Supabase. Contas pré-configuradas ou não verificadas na nuvem não têm permissão de acesso.`,
      user,
    };
  }

  return {
    allowed: true,
    reason: 'Acesso autorizado.',
    user,
  };
}

export interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceTitle?: string;
  currentUser?: User | null;
  onOpenAuth?: () => void;
}

/**
 * Modal padronizado de Segurança exibido quando um usuário não-administrador tenta acessar
 * um componente sensível envolvido pelo Middleware.
 */
export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({
  isOpen,
  onClose,
  resourceTitle = 'Recurso Restrito',
  currentUser,
  onOpenAuth,
}) => {
  if (!isOpen) return null;

  const user = currentUser ?? getCurrentUserSession();
  const userName = user?.name || 'Não identificado';
  const userRole = user?.role || 'motorista';
  const userEmail = user?.email || 'Nenhum e-mail conectado';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border-2 border-[#ef4444] rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header com ícone de alerta de segurança */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#450a0a] border border-[#ef4444] flex items-center justify-center text-[#ef4444] shadow-lg shadow-red-950/50 shrink-0">
              <ShieldAlert className="w-7 h-7 stroke-[2.2] animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#7f1d1d]/70 text-[#fca5a5] border border-[#ef4444]/40">
                403 • Acesso Negado pelo MiddleWare
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {resourceTitle}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
            title="Fechar aviso de segurança"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem e Justificativa de Proteção de Dados */}
        <div className="space-y-2 text-xs text-[#bec6e0] leading-relaxed">
          <p>
            Por determinação da política de proteção de dados, <strong>nenhuma credencial, chave de banco de dados ou pacote de backup foi carregado na memória do aplicativo</strong>.
          </p>
          <p className="text-[11px] text-[#94a3b8]">
            Este recurso manipula dados estruturais do banco de dados na nuvem (Supabase), migrations SQL e backups completos de faturamento. Somente usuários com o cargo <strong className="text-[#fca5a5] font-mono">admin</strong> autenticados e validados têm permissão para carregar essas informações.
          </p>
        </div>

        {/* Quadro informativo do Usuário Ativo */}
        <div className="p-3.5 rounded-xl bg-[#081425] border border-[#334155] space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-[#bec6e0]">
            <span className="text-[#94a3b8] font-sans">Usuário Conectado:</span>
            <span className="font-bold text-white">{userName}</span>
          </div>
          <div className="flex items-center justify-between text-[#bec6e0]">
            <span className="text-[#94a3b8] font-sans">E-mail:</span>
            <span className="truncate max-w-[220px] text-[#94a3b8]">{userEmail}</span>
          </div>
          <div className="flex items-center justify-between text-[#bec6e0]">
            <span className="text-[#94a3b8] font-sans">Cargo / Perfil Atual:</span>
            <span className="font-extrabold text-[#f59e0b] capitalize bg-[#f59e0b]/10 px-2 py-0.5 rounded border border-[#f59e0b]/30">
              {userRole.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#334155]/60 text-[#bec6e0]">
            <span className="text-[#94a3b8] font-sans">Cargo Exigido:</span>
            <span className="font-black text-[#ef4444] bg-[#450a0a] px-2 py-0.5 rounded border border-[#ef4444]/40">
              admin (Verificado)
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          {onOpenAuth && (
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                onClose();
                onOpenAuth();
              }}
              className="w-full sm:w-auto h-10 px-4 bg-[#081425] hover:bg-[#152031] border border-[#f59e0b]/50 text-[#ffb95f] font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4 text-[#f59e0b]" />
              <span>Conectar Conta de Administrador</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-full sm:w-auto h-10 px-5 bg-[#243248] hover:bg-[#334155] border border-[#475569] text-white font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface AdminPermissionMiddlewareProps {
  currentUser?: User | null;
  isOpen?: boolean;
  onClose?: () => void;
  resourceTitle?: string;
  onOpenAuth?: () => void;
  silentFallback?: boolean;
  children: React.ReactNode | ((adminUser: User) => React.ReactNode);
}

/**
 * Componente MiddleWare de Permissões:
 * Envolve componentes sensíveis impedindo completamente sua montagem (mount) caso o usuário não seja 'admin'.
 * 
 * GARANTIA DE SEGURANÇA:
 * Se checkAdminPermission falhar:
 * - O componente filho 'children' NÃO é montado no ciclo de vida do React.
 * - Os hooks de estado (useState, useEffect, requisições de rede, leitura de chaves de API/localStorage) NUNCA são executados.
 * - Renderiza a tela segura de AccessDeniedModal ou null.
 */
export const AdminPermissionMiddleware: React.FC<AdminPermissionMiddlewareProps> = ({
  currentUser,
  isOpen = true,
  onClose = () => {},
  resourceTitle = 'Recurso Administrativo',
  onOpenAuth,
  silentFallback = false,
  children,
}) => {
  const check = checkAdminPermission(currentUser);

  // Se não for admin, bloqueia imediatamente
  if (!check.allowed) {
    if (!isOpen || silentFallback) {
      return null;
    }

    return (
      <AccessDeniedModal
        isOpen={isOpen}
        onClose={onClose}
        resourceTitle={resourceTitle}
        currentUser={check.user}
        onOpenAuth={onOpenAuth}
      />
    );
  }

  // Se o modal estiver fechado, não renderiza
  if (!isOpen) {
    return null;
  }

  // Usuário é Administrador verificado: monta e renderiza os filhos com segurança
  if (typeof children === 'function') {
    return <>{children(check.user!)}</>;
  }

  return <>{children}</>;
};

/**
 * Higher-Order Component (HOC) de MiddleWare de Permissões:
 * Envolve qualquer componente React sensível (ex: BackupDataModal, SupabaseModal)
 * garantindo que ele só seja renderizado se o usuário logado tiver cargo 'admin'.
 */
export function withAdminPermission<P extends { currentUser?: User | null; isOpen?: boolean; onClose?: () => void }>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    resourceTitle?: string;
    onOpenAuth?: () => void;
    silentFallback?: boolean;
  }
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ProtectedComponent: React.FC<P> = (props) => {
    const { currentUser, isOpen = true, onClose = () => {} } = props;
    const check = checkAdminPermission(currentUser);

    if (!check.allowed) {
      if (!isOpen || options?.silentFallback) {
        return null;
      }

      return (
        <AccessDeniedModal
          isOpen={isOpen}
          onClose={onClose}
          resourceTitle={options?.resourceTitle || `Acesso Restrito a Administradores (${displayName})`}
          currentUser={check.user}
          onOpenAuth={options?.onOpenAuth}
        />
      );
    }

    if (!isOpen) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };

  ProtectedComponent.displayName = `withAdminPermission(${displayName})`;
  return ProtectedComponent;
}

/**
 * Hook utilitário para validação de permissões administrativas em botões ou fluxos de execução
 */
export function useAdminPermission(currentUser?: User | null) {
  const result = checkAdminPermission(currentUser);
  return {
    isAdmin: result.allowed,
    isDriver: !result.allowed,
    denialReason: result.reason,
    user: result.user,
  };
}
