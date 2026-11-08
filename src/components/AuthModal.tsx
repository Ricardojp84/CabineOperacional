import React, { useState } from 'react';
import { User, UserRole, isAdminRole, isDriverRole, isUserAdmin } from '../types/cockpit';
import {
  getUsersFromStorage,
  saveUsersToStorage,
  saveCurrentUserSession,
  verifyUserByToken,
  resendVerificationToken,
} from '../data/mockUsers';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  authenticateSupabaseAdmin,
  getSupabaseAdminSqlSnippet,
} from '../services/supabaseAuthService';
import {
  isSupabaseConfigured,
  getStoredCredentials,
  getSupabaseProjectId,
} from '../lib/supabase';
import {
  Lock,
  User as UserIcon,
  Truck,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  KeyRound,
  Shield,
  ArrowRight,
  UserPlus,
  LogIn,
  X,
  Mail,
  Send,
  ExternalLink,
  Copy,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Info,
  Database,
  Code2,
  Loader2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
  currentUser?: User | null;
  allowClose?: boolean;
  onOpenSupabaseModal?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentUser,
  allowClose = true,
  onOpenSupabaseModal,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'verification_pending'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [loginRoleFilter, setLoginRoleFilter] = useState<'motorista' | 'admin'>('motorista');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('motorista_autonomo');
  const [regTruck, setRegTruck] = useState('Scania R540 6x4 Super');
  const [regPlate, setRegPlate] = useState('BRA-2026');
  const [regRntrc, setRegRntrc] = useState('44.891.200');

  // Verification state
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  if (!isOpen) return null;

  const usersList = getUsersFromStorage();

  const [isAuthenticatingAdmin, setIsAuthenticatingAdmin] = useState(false);
  const [showAdminSqlHelper, setShowAdminSqlHelper] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPass = passwordInput.trim();

    // 1. AUTENTICAÇÃO EXCLUSIVA DE ADMINISTRADOR VIA SUPABASE
    if (loginRoleFilter === 'admin') {
      setIsAuthenticatingAdmin(true);
      try {
        const result = await authenticateSupabaseAdmin(trimmedEmail, trimmedPass);
        if (result.success && result.user) {
          playSuccessChime();
          onLoginSuccess(result.user);
          if (onClose) onClose();
          return;
        } else {
          playAlertBeep();
          setErrorMessage(
            result.error ||
              'Acesso negado. Esta conta não possui perfil de Administrador cadastrado no banco Supabase.'
          );
          return;
        }
      } catch (err: any) {
        playAlertBeep();
        setErrorMessage(`Falha na autenticação via Supabase: ${err.message || 'Erro de comunicação'}`);
        return;
      } finally {
        setIsAuthenticatingAdmin(false);
      }
    }

    // 2. LOGIN OPERACIONAL DE MOTORISTA (LOCAL)
    const found = usersList.find(
      (u) =>
        (u.email.toLowerCase() === trimmedEmail || u.email.split('@')[0].toLowerCase() === trimmedEmail) &&
        u.password === trimmedPass
    );

    if (found) {
      // Check if email is verified
      if (found.isEmailVerified === false) {
        playAlertBeep();
        setPendingUser(found);
        setMode('verification_pending');
        setErrorMessage(
          'Seu cadastro ainda está pendente de confirmação. Acesse o link enviado para seu e-mail para ativar.'
        );
        return;
      }

      playSuccessChime();
      saveCurrentUserSession(found);
      onLoginSuccess(found);
      if (onClose) onClose();
    } else {
      playAlertBeep();
      setErrorMessage('Login ou senha incorretos para a conta de motorista.');
    }
  };

  const handleQuickDemoLogin = (user: User) => {
    playSuccessChime();
    saveCurrentUserSession(user);
    onLoginSuccess(user);
    if (onClose) onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    const trimmedEmail = regEmail.trim().toLowerCase();
    if (usersList.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      playAlertBeep();
      setErrorMessage('Já existe um usuário cadastrado com este e-mail/login.');
      return;
    }

    playSuccessChime();
    const token = `vtok_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: regName.trim(),
      email: trimmedEmail,
      password: regPassword.trim(),
      role: regRole,
      truckModel: regTruck.trim() || 'Cavalo Mecânico 6x2',
      truckPlate: regPlate.trim().toUpperCase() || 'BRA-2026',
      rntrc: regRntrc.trim() || 'Isento',
      isEmailVerified: false,
      verificationToken: token,
      createdAt: new Date().toISOString(),
    };

    const updatedList = [...usersList, newUser];
    saveUsersToStorage(updatedList);
    setPendingUser(newUser);
    setMode('verification_pending');
  };

  // Generate confirmation link
  const getVerificationUrl = (user: User) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?verify_token=${user.verificationToken || 'dummy'}`;
  };

  // Simulate clicking the email link
  const handleConfirmViaEmailLink = (token: string) => {
    playSuccessChime();
    const result = verifyUserByToken(token);
    if (result.success && result.user) {
      setVerificationSuccess(true);
      setTimeout(() => {
        onLoginSuccess(result.user!);
        if (onClose) onClose();
      }, 1500);
    } else {
      playAlertBeep();
      setErrorMessage(result.message);
    }
  };

  const handleResendEmail = () => {
    if (!pendingUser) return;
    playCockpitClick();
    const result = resendVerificationToken(pendingUser.email);
    if (result.success && result.user) {
      setPendingUser(result.user);
      playSuccessChime();
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    playCockpitClick();
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#472a00] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                {mode === 'login'
                  ? 'Identificação & Acesso à Cabine'
                  : mode === 'register'
                  ? 'Cadastro de Novo Estradeiro'
                  : 'Confirmação de Conta por E-mail'}
              </h2>
              <p className="text-xs text-[#94a3b8]">
                {mode === 'login'
                  ? 'Informe seu login e senha para acessar o painel operacional.'
                  : mode === 'register'
                  ? 'Crie sua conta para gerenciar fretes, custos e viagens.'
                  : 'Ative sua conta clicando no link seguro enviado para sua caixa postal.'}
              </p>
            </div>
          </div>
          {allowClose && onClose && (
            <button
              onClick={() => {
                playCockpitClick();
                onClose();
              }}
              className="w-10 h-10 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode switcher tabs (when not in pending state) */}
        {mode !== 'verification_pending' && (
          <div className="flex gap-2 mt-4 p-1 bg-[#081425] rounded-xl border border-[#334155]">
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-xs'
                  : 'text-[#94a3b8] hover:text-[#d8e3fb]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Acessar Conta
            </button>
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-xs'
                  : 'text-[#94a3b8] hover:text-[#d8e3fb]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Criar Nova Conta
            </button>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-[#690005]/60 border border-[#ea580c] flex items-center gap-2.5 text-[#ffdad6] text-xs">
            <AlertCircle className="w-4 h-4 text-[#ffb4ab] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* View 1: Verification Pending Email Card */}
        {mode === 'verification_pending' && pendingUser && (
          <div className="mt-4 space-y-4">
            {verificationSuccess ? (
              <div className="p-6 rounded-2xl bg-[#064e3b]/80 border-2 border-[#10b981] text-center space-y-3 animate-in zoom-in-95">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#10b981] text-[#022c22] flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="text-lg font-black text-[#d8e3fb]">
                  Conta Confirmada com Sucesso!
                </h3>
                <p className="text-xs text-[#a7f3d0]">
                  Bem-vindo à Cabine Operacional, {pendingUser.name}. Conectando seu painel de bordo...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email Sent Notification Box */}
                <div className="p-4 rounded-xl bg-[#081425] border border-[#38bdf8]/40 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8] shrink-0">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#d8e3fb]">
                        Link de Confirmação Enviado!
                      </h4>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Enviamos um link seguro de validação para o endereço:
                      </p>
                      <div className="text-xs font-mono font-bold text-[#38bdf8] mt-1 bg-[#152031] px-2.5 py-1 rounded-md inline-block border border-[#334155]">
                        {pendingUser.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Inbox Message Card */}
                <div className="p-4 rounded-xl bg-[#0b1322] border-1.5 border-[#334155] shadow-inner space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-[#94a3b8] pb-2 border-b border-[#334155]">
                    <span className="font-semibold text-[#d8e3fb] flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#f59e0b]" />
                      Mensagem de Verificação Recebida
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400">Entregue na Caixa Postal</span>
                  </div>

                  <div className="text-xs text-[#d8e3fb] space-y-2">
                    <p>
                      Olá, <strong>{pendingUser.name}</strong>!
                    </p>
                    <p className="text-[#94a3b8]">
                      Obrigado por se registrar na <strong>Cabine Operacional</strong>. Para ativar seu acesso de{' '}
                      {pendingUser.role === 'motorista_autonomo'
                        ? 'Motorista Autônomo'
                        : pendingUser.role === 'gestor_frota'
                        ? 'Gestor de Frota'
                        : 'Motorista Agregado'}{' '}
                      e desbloquear o controle de fretes e despesas, confirme sua conta:
                    </p>
                  </div>

                  {/* Primary CTA Button: Confirm Email */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmViaEmailLink(pendingUser.verificationToken || '')}
                      className="w-full h-12 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>Confirmar Meu E-mail & Ativar Cabine</span>
                    </button>
                  </div>

                  {/* Copy Link Row */}
                  <div className="pt-2">
                    <span className="block text-[10px] uppercase font-bold text-[#94a3b8] mb-1">
                      Link Direto de Confirmação:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getVerificationUrl(pendingUser)}
                        className="flex-1 h-9 bg-[#081425] border border-[#334155] rounded-lg px-2.5 text-[11px] font-mono text-[#94a3b8] outline-hidden truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(getVerificationUrl(pendingUser))}
                        className="h-9 px-3 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-xs font-semibold text-[#d8e3fb] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    className="text-xs text-[#38bdf8] hover:underline font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reenviar Link de Confirmação</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setMode('login');
                      setErrorMessage('');
                    }}
                    className="text-xs text-[#94a3b8] hover:text-[#d8e3fb] cursor-pointer"
                  >
                    Voltar para o Login
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View 2: Login Form */}
        {mode === 'login' && (
          <div className="mt-4 space-y-4">
            {/* Role Filter Tabs for Login: Motorista vs Administrador */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#081425] rounded-xl border border-[#334155]">
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setLoginRoleFilter('motorista');
                  setErrorMessage('');
                }}
                className={`h-11 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginRoleFilter === 'motorista'
                    ? 'bg-[#10b981] text-[#022c22] shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Login do Motorista</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setLoginRoleFilter('admin');
                  setErrorMessage('');
                }}
                className={`h-11 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginRoleFilter === 'admin'
                    ? 'bg-[#ffb95f] text-[#081425] shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Login do Administrador</span>
              </button>
            </div>

            {/* Explanation banner per user requirement */}
            {loginRoleFilter === 'motorista' ? (
              <div className="p-3 rounded-xl bg-[#003824]/60 border border-[#10b981]/50 text-xs text-[#a7f3d0] flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#4edea3] font-bold">Tela Operacional do Motorista</strong>
                  Acesso simplificado aos comandos de bordo: rotas, peso da carga, odômetro e despesas. As funções de comando e nuvem (Supabase, Backup JSON, Migrations SQL e comandos) não aparecerão para manter a cabine limpa e segura.
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#241705]/70 border border-[#f59e0b]/50 text-xs text-[#fed7aa] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#ffb95f] shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[#ffb95f] font-bold">Painel de Comando do Administrador / Gestor</strong>
                  Acesso irrestrito a todas as ferramentas: conexão e migrations SQL do Supabase, backup JSON, relatórios financeiros anuais e parametrização contratual de fretes.
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  E-mail ou Usuário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={loginRoleFilter === 'motorista' ? 'ex: marcos@cabine.com' : 'ex: ricardo@cabine.com'}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 pl-11 text-[#d8e3fb] font-semibold text-sm outline-hidden"
                  />
                  <UserIcon className="w-5 h-5 text-[#94a3b8] absolute left-3.5 top-4.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha secreta"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 pl-11 pr-12 text-[#d8e3fb] font-mono text-sm outline-hidden"
                  />
                  <KeyRound className="w-5 h-5 text-[#94a3b8] absolute left-3.5 top-4.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-4.5 text-[#94a3b8] hover:text-[#d8e3fb] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isAuthenticatingAdmin}
                  className={`w-full h-14 min-h-[56px] rounded-xl font-extrabold text-base flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all cursor-pointer shadow-lg ${
                    loginRoleFilter === 'motorista'
                      ? 'bg-[#10b981] hover:bg-[#059669] text-[#022c22] shadow-emerald-500/25'
                      : 'bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] shadow-amber-500/25'
                  } ${isAuthenticatingAdmin ? 'opacity-80 cursor-wait' : ''}`}
                >
                  {isAuthenticatingAdmin ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validando no Supabase...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 stroke-[2.5]" />
                      <span>
                        {loginRoleFilter === 'motorista' ? 'Entrar como Motorista' : 'Entrar com Supabase (Admin)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Accounts Helper (Filtered by selected role) */}
            <div className="mt-4 pt-4 border-t border-[#334155]/80">
              {loginRoleFilter === 'motorista' ? (
                <>
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8] mb-2 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#10b981]" />
                    Contas Pré-configuradas (Motoristas de Teste)
                  </span>

                  <div className="space-y-2">
                    {usersList
                      .filter((u) => !isAdminRole(u.role))
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleQuickDemoLogin(u)}
                          className="w-full p-3 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#334155] hover:border-[#10b981] flex items-center justify-between text-left transition-all cursor-pointer group"
                        >
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs text-[#d8e3fb] group-hover:text-[#4edea3] flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#10b981]" />
                              <span>{u.name}</span>
                            </div>
                            <div className="text-[11px] text-[#94a3b8] truncate font-mono mt-0.5">
                              Login: <strong className="text-[#bec6e0]">{u.email}</strong> • Senha:{' '}
                              <strong className="text-[#ffb95f]">{u.password}</strong>
                            </div>
                            <div className="text-[10px] text-[#798098] mt-0.5">
                              {u.truckModel} • Placa: {u.truckPlate}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#10b981]">
                            <span>Entrar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#ffb95f] mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ffb95f]" />
                    Regra de Segurança: Administradores Exclusivos do SUPABASE
                  </span>

                  <div className="p-3.5 rounded-xl bg-[#081425] border border-[#f59e0b]/40 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-[#d8e3fb]">
                          Contas Pré-configuradas de Administrador Removidas
                        </h4>
                        <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                          O sistema agora <strong>rejeita qualquer conta pré-configurada ou local</strong> como Administrador. Somente contas cadastradas com permissão de administrador no <strong>SUPABASE</strong> são aceitas.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#334155]/60 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="font-mono text-[#94a3b8]">Status Supabase:</span>
                        {isSupabaseConfigured ? (
                          <span className="text-[#34d399] font-bold flex items-center gap-1 bg-[#064e3b] px-2 py-0.5 rounded border border-[#10b981]/40">
                            <Check className="w-3 h-3" />
                            Conectado ({getSupabaseProjectId(getStoredCredentials().url) || 'Ativo'})
                          </span>
                        ) : (
                          <span className="text-[#f87171] font-bold flex items-center gap-1 bg-[#450a0a] px-2 py-0.5 rounded border border-[#ef4444]/40">
                            <AlertCircle className="w-3 h-3" />
                            Não Conectado
                          </span>
                        )}
                      </div>

                      {onOpenSupabaseModal && (
                        <button
                          type="button"
                          onClick={() => {
                            playCockpitClick();
                            if (onClose) onClose();
                            onOpenSupabaseModal();
                          }}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1 cursor-pointer transition-colors"
                          title="Abrir configurações de conexão do Supabase"
                        >
                          <Database className="w-3 h-3" />
                          <span>Painel Supabase</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SQL Helper Box */}
                  <div className="rounded-xl border border-[#334155] bg-[#0c1322] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setShowAdminSqlHelper(!showAdminSqlHelper);
                      }}
                      className="w-full p-2.5 px-3 flex items-center justify-between text-left text-xs font-bold text-[#ffb95f] hover:text-[#ffd699] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-[#f59e0b]" />
                        Como cadastrar seu e-mail como Administrador no Supabase (SQL)
                      </span>
                      <span className="text-[11px] text-[#94a3b8]">{showAdminSqlHelper ? 'Ocultar' : 'Ver SQL'}</span>
                    </button>

                    {showAdminSqlHelper && (
                      <div className="p-3 pt-0 border-t border-[#334155]/60 space-y-2">
                        <p className="text-[11px] text-[#94a3b8]">
                          Execute este comando no <strong>SQL Editor</strong> do seu painel Supabase para cadastrar o e-mail como Administrador:
                        </p>
                        <div className="relative">
                          <pre className="p-2.5 rounded-lg bg-[#081425] border border-[#334155] font-mono text-[10px] text-[#38bdf8] overflow-x-auto whitespace-pre">
                            {getSupabaseAdminSqlSnippet(emailInput || 'ricardo.jr.pinheiro@gmail.com', 'Ricardo Pinheiro')}
                          </pre>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                getSupabaseAdminSqlSnippet(emailInput || 'ricardo.jr.pinheiro@gmail.com', 'Ricardo Pinheiro')
                              );
                              setCopiedSql(true);
                              playCockpitClick();
                              setTimeout(() => setCopiedSql(false), 3000);
                            }}
                            className="absolute top-2 right-2 px-2 py-1 rounded bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedSql ? <Check className="w-3 h-3 text-[#10b981]" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedSql ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View 3: Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="mt-4 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Nome Completo do Motorista / Gestor
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Carlos Eduardo de Oliveira"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-semibold text-xs outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  E-mail para Confirmação
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: carlos@estrada.com.br"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-semibold text-xs outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Criar Senha de Acesso
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Perfil de Operação
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-2.5 text-[#d8e3fb] font-bold text-xs outline-hidden"
                >
                  <option value="motorista">Motorista (Operacional de rota, cargas e tacógrafo)</option>
                  <option value="motorista_autonomo">Motorista Autônomo (TAC)</option>
                  <option value="motorista_agregado">Motorista Agregado</option>
                </select>
                <p className="text-[10px] text-[#94a3b8] mt-1">
                  * Contas de Administrador são restritas e cadastradas exclusivamente via banco Supabase.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  RNTRC / ANTT
                </label>
                <input
                  type="text"
                  placeholder="Ex: 51.982.340"
                  value={regRntrc}
                  onChange={(e) => setRegRntrc(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Modelo do Cavalo Mecânico
                </label>
                <input
                  type="text"
                  placeholder="Ex: Scania R450 6x2"
                  value={regTruck}
                  onChange={(e) => setRegTruck(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Placa do Veículo
                </label>
                <input
                  type="text"
                  placeholder="Ex: BRA-2026"
                  value={regPlate}
                  onChange={(e) => setRegPlate(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden uppercase"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-14 min-h-[56px] rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 stroke-[2.5]" />
                <span>Criar Conta & Enviar Link de Confirmação</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
