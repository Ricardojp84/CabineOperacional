import React, { useState, useEffect } from 'react';
import { Trip, MaintenanceItem, User, isAdminRole } from '../types/cockpit';
import {
  isSupabaseConfigured,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  getStoredCredentials,
  sanitizeSupabaseUrl,
  sanitizeSupabaseKey,
  getSupabaseProjectId,
} from '../lib/supabase';
import {
  testSupabaseConnection,
  syncTripToSupabase,
  syncMaintenanceToSupabase,
} from '../services/supabaseSync';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  ExternalLink,
  RefreshCw,
  Code2,
  Check,
  Server,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  Info,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip: Trip;
  onRestoreTrip?: (trip: Trip) => void;
  maintenanceItems?: MaintenanceItem[];
  currentUser?: User | null;
}

const MASTER_MIGRATION_SQL = `-- CABINE OPERACIONAL DO CAMINHONEIRO - MIGRATIONS MASTER SUPABASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfis de Usuários
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'motorista_autonomo' CHECK (role IN ('motorista_autonomo', 'gestor_frota', 'motorista_agregado')),
    rntrc TEXT,
    phone TEXT,
    truck_model TEXT NOT NULL DEFAULT 'Scania R540 6x4 Super',
    truck_plate TEXT NOT NULL DEFAULT 'BRA-2026',
    cnh_category TEXT DEFAULT 'E',
    is_email_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Viagens e Rotas
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    route_highlights TEXT,
    cargo TEXT NOT NULL,
    cargo_type TEXT NOT NULL DEFAULT 'granel_solido',
    cargo_weight_ton NUMERIC(10, 2) NOT NULL DEFAULT 37.5,
    vehicle_model TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    axles INTEGER NOT NULL DEFAULT 6,
    gross_freight NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_payment NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_payment NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    completed_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_odometer_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    start_odometer_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    target_consumption_km_l NUMERIC(5, 2) NOT NULL DEFAULT 2.30,
    actual_consumption_km_l NUMERIC(5, 2) NOT NULL DEFAULT 2.25,
    diesel_avg_price_per_l NUMERIC(6, 3) NOT NULL DEFAULT 6.19,
    arla_avg_price_per_l NUMERIC(6, 3) NOT NULL DEFAULT 2.45,
    estimated_toll_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Despesas Operacionais
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('combustivel', 'arla', 'pedagio', 'alimentacao', 'manutencao', 'pneu_borracharia', 'estacionamento', 'chapa_descarga', 'outros')),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    location TEXT,
    liters NUMERIC(8, 2),
    odometer_km NUMERIC(10, 2),
    payment_method TEXT,
    invoice_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Checkpoints e Praças de Pedágio
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    highway TEXT NOT NULL,
    km_marker TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('completed', 'active', 'upcoming')),
    type TEXT NOT NULL,
    estimated_arrival TEXT,
    actual_arrival TEXT,
    toll_fee NUMERIC(8, 2),
    toll_tag_detected BOOLEAN DEFAULT false,
    notes TEXT,
    has_safe_parking BOOLEAN DEFAULT false,
    has_shower BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Manutenções Preventivas e Saúde da Frota
CREATE TABLE IF NOT EXISTS public.maintenance_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    interval_km INTEGER NOT NULL,
    last_done_km INTEGER NOT NULL,
    next_due_km INTEGER NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'ok' CHECK (urgency IN ('ok', 'warning', 'urgent')),
    estimated_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    component TEXT NOT NULL,
    notes TEXT,
    recommended_part TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tacógrafo e Jornada
CREATE TABLE IF NOT EXISTS public.driver_shifts (
    id TEXT PRIMARY KEY DEFAULT ('shift_' || round(extract(epoch from now()))::text),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trip_id TEXT REFERENCES public.trips(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'driving' CHECK (status IN ('driving', 'rest', 'meal', 'loading', 'sleeping', 'stopped')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    continuous_driving_seconds INTEGER NOT NULL DEFAULT 0,
    daily_driving_seconds INTEGER NOT NULL DEFAULT 0,
    required_rest_seconds INTEGER NOT NULL DEFAULT 1800,
    last_rest_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Índices e Segurança
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_trip_id ON public.checkpoints(trip_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_urgency ON public.maintenance_items(urgency);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_all" ON public.profiles FOR ALL USING (true);
CREATE POLICY "trips_all" ON public.trips FOR ALL USING (true);
CREATE POLICY "expenses_all" ON public.expenses FOR ALL USING (true);
CREATE POLICY "checkpoints_all" ON public.checkpoints FOR ALL USING (true);
CREATE POLICY "maintenance_all" ON public.maintenance_items FOR ALL USING (true);
CREATE POLICY "driver_shifts_all" ON public.driver_shifts FOR ALL USING (true);`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  activeTrip,
  onRestoreTrip,
  maintenanceItems = [],
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'migrations' | 'sync'>('credentials');
  const [showKey, setShowKey] = useState(false);

  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    return getStoredCredentials().url;
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    return getStoredCredentials().key;
  });

  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(isSupabaseConfigured);
  const [hasInvalidKeyError, setHasInvalidKeyError] = useState(false);

  useEffect(() => {
    const creds = getStoredCredentials();
    setSupabaseUrl(creds.url);
    setSupabaseKey(creds.key);
    setConnected(isSupabaseConfigured);
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = isAdminRole(currentUser?.role);

  // Security check: Block display and execution of Supabase command functions for non-admin users
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#152031] border-2 border-[#ef4444] rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#450a0a] border border-[#ef4444] flex items-center justify-center text-[#ef4444] shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#7f1d1d]/50 text-[#fca5a5] border border-[#ef4444]/40">
              403 • Acesso Negado
            </span>
            <h3 className="text-xl font-black text-[#d8e3fb] pt-2">
              Painel Supabase Restrito
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              O acesso aos comandos de banco de dados na nuvem, migrations SQL e chaves de API do Supabase é exclusivo para usuários com perfil de <strong className="text-[#fca5a5]">Administrador ('admin')</strong>.
            </p>
          </div>

          <div className="w-full p-3.5 rounded-xl bg-[#081425] border border-[#334155] text-left text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[#bec6e0]">
              <span className="text-[#94a3b8] font-sans">Usuário ativo:</span>
              <span className="font-bold">{currentUser?.name || 'Não identificado'}</span>
            </div>
            <div className="flex items-center justify-between text-[#bec6e0]">
              <span className="text-[#94a3b8] font-sans">Perfil / Role:</span>
              <span className="text-[#ffb95f] font-bold">{currentUser?.role || 'motorista'}</span>
            </div>
            <div className="flex items-center justify-between text-[#bec6e0]">
              <span className="text-[#94a3b8] font-sans">Permissão requerida:</span>
              <span className="text-[#ef4444] font-black uppercase">admin</span>
            </div>
          </div>

          <div className="w-full pt-2">
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                onClose();
              }}
              className="w-full h-12 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#475569] text-[#d8e3fb] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Fechar e Retornar ao Cockpit</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleTestConnection = async () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    setTesting(true);
    setFeedback(null);
    setHasInvalidKeyError(false);

    const cleanUrl = sanitizeSupabaseUrl(supabaseUrl);
    const cleanKey = sanitizeSupabaseKey(supabaseKey);

    if (!cleanUrl || !cleanKey) {
      setTesting(false);
      playAlertBeep();
      setFeedback({
        type: 'warning',
        text: 'Preencha a URL do projeto (ex: https://xyz.supabase.co) e a Chave Anon (começa com eyJ...).',
      });
      return;
    }

    const res = await testSupabaseConnection(cleanUrl, cleanKey);
    setTesting(false);

    if (res.success) {
      playSuccessChime();
      setConnected(true);
      // Auto-save verified credentials
      saveSupabaseCredentials(cleanUrl, cleanKey);
      setFeedback({
        type: 'success',
        text: res.message,
      });
    } else {
      playAlertBeep();
      setConnected(false);
      const isInvalidKey = res.message.toLowerCase().includes('invalid api key') || res.message.toLowerCase().includes('chave api');
      if (isInvalidKey) {
        setHasInvalidKeyError(true);
      }
      setFeedback({
        type: 'error',
        text: res.message,
      });
    }
  };

  const handleSaveCredentials = async () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    const cleanUrl = sanitizeSupabaseUrl(supabaseUrl);
    const cleanKey = sanitizeSupabaseKey(supabaseKey);

    const saveResult = saveSupabaseCredentials(cleanUrl, cleanKey);
    if (!saveResult.success) {
      playAlertBeep();
      setFeedback({
        type: 'error',
        text: saveResult.message,
      });
      return;
    }

    // Immediately test the newly saved credentials
    setTesting(true);
    setFeedback({
      type: 'info',
      text: 'Credenciais salvas! Validando conexão com o servidor Supabase...',
    });

    const testRes = await testSupabaseConnection(cleanUrl, cleanKey);
    setTesting(false);

    if (testRes.success) {
      playSuccessChime();
      setConnected(true);
      setFeedback({
        type: 'success',
        text: `Salvo e Conectado! ${testRes.message}`,
      });
    } else {
      playAlertBeep();
      setConnected(false);
      if (testRes.message.toLowerCase().includes('invalid api key') || testRes.message.toLowerCase().includes('chave api')) {
        setHasInvalidKeyError(true);
      }
      setFeedback({
        type: 'error',
        text: testRes.message,
      });
    }
  };

  const handleSyncToSupabase = async () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    setSyncing(true);
    setFeedback({
      type: 'info',
      text: 'Sincronizando dados no PostgreSQL do Supabase...',
    });

    const resTrip = await syncTripToSupabase(activeTrip);
    let maintStatus = '';
    if (maintenanceItems.length > 0) {
      const resMaint = await syncMaintenanceToSupabase(maintenanceItems);
      maintStatus = ` • ${resMaint.message}`;
    }

    setSyncing(false);
    if (resTrip.success) {
      playSuccessChime();
      setFeedback({
        type: 'success',
        text: `${resTrip.message}${maintStatus}`,
      });
    } else {
      playAlertBeep();
      setFeedback({
        type: 'error',
        text: resTrip.message,
      });
    }
  };

  const handleCopySql = () => {
    playCockpitClick();
    navigator.clipboard.writeText(MASTER_MIGRATION_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#10b981] flex items-center justify-center text-[#34d399] shadow-md shadow-emerald-500/10">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                  Integração Supabase & Migrations
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    connected
                      ? 'bg-emerald-500/20 text-[#34d399] border-[#10b981]/40'
                      : 'bg-amber-500/20 text-[#ffb95f] border-[#f59e0b]/40'
                  }`}
                >
                  {connected ? 'Conectado à Nuvem' : 'Modo Local / Desconectado'}
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">
                Banco de dados relacional PostgreSQL, sincronização e migrations SQL.
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

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4 p-1 bg-[#081425] rounded-xl border border-[#334155]">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setActiveTab('credentials');
            }}
            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'credentials'
                ? 'bg-[#1e293b] text-[#34d399] border border-[#10b981]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Conexão & Credenciais</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setActiveTab('migrations');
            }}
            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'migrations'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#f59e0b]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Migrations SQL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setActiveTab('sync');
            }}
            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'sync'
                ? 'bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Sincronização em Nuvem</span>
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`mt-3 p-3.5 rounded-xl border text-xs flex items-start justify-between gap-2.5 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-[#064e3b]/80 border-[#10b981] text-[#a7f3d0]'
                : feedback.type === 'error'
                ? 'bg-[#450a0a]/90 border-[#ef4444] text-[#fecaca]'
                : feedback.type === 'warning'
                ? 'bg-[#451a03]/90 border-[#f59e0b] text-[#fde68a]'
                : 'bg-[#081425] border-[#38bdf8]/50 text-[#bae6fd]'
            }`}
          >
            <div className="flex items-start gap-2">
              {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0 mt-0.5" />}
              {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />}
              {feedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />}
              {feedback.type === 'info' && <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />}
              <span className="font-medium leading-relaxed">{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB 1: CONEXÃO E CREDENCIAIS */}
        {activeTab === 'credentials' && (
          <div className="mt-4 space-y-4">
            {/* Resolution Box for Invalid API Key */}
            {hasInvalidKeyError && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#2a0e10] to-[#1e1320] border-2 border-[#ef4444] space-y-2.5 text-xs text-[#fecaca] animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 font-black text-sm text-[#f87171]">
                  <AlertCircle className="w-5 h-5 text-[#ef4444] shrink-0" />
                  <span>Como resolver o erro "Invalid API key" no Supabase:</span>
                </div>
                <p className="text-[#fca5a5]">
                  O Supabase recusou a chave porque foi informada uma chave incorreta (como a senha do banco de dados, JWT Secret ou chave truncada).
                </p>
                <div className="bg-[#150a0c] p-3 rounded-lg border border-[#7f1d1d] space-y-1.5 font-mono text-[11px] text-[#fecaca]">
                  <div>1. Abra seu projeto no Supabase: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline text-[#60a5fa]">supabase.com/dashboard</a></div>
                  <div>2. No menu esquerdo inferior, clique no ícone de engrenagem ⚙️ <strong>Project Settings</strong></div>
                  <div>3. Clique em <strong>API</strong> (sob Configuration)</div>
                  <div>4. Na seção <strong>Project API keys</strong>, copie a chave da linha <strong>anon public</strong> (ela é longa e começa com <span className="text-[#34d399] font-bold">eyJhbGci...</span>)</div>
                  <div className="text-amber-300 font-bold">⚠️ Não use a "Database Password" nem a chave "service_role". Use apenas a chave "anon public".</div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#34d399]" />
                  Configuração de Acesso ao Supabase
                </span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#38bdf8] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Dashboard Supabase</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] mb-1">
                    URL do Projeto (Project URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://exemplo-seu-projeto.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => {
                      setSupabaseUrl(e.target.value);
                      setHasInvalidKeyError(false);
                    }}
                    className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-xs font-mono text-[#d8e3fb] outline-hidden"
                  />
                  <span className="text-[10px] text-[#64748b] mt-0.5 block">Exemplo: https://xyzcompany.supabase.co</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#94a3b8]">
                      Chave Pública / Anon Key (Project API keys ➔ anon public)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[11px] text-[#38bdf8] hover:text-[#7dd3fc] flex items-center gap-1 cursor-pointer"
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showKey ? 'Ocultar' : 'Visualizar Chave'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey}
                      onChange={(e) => {
                        setSupabaseKey(e.target.value);
                        setHasInvalidKeyError(false);
                      }}
                      className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 pr-9 text-xs font-mono text-[#d8e3fb] outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-[#64748b] mt-0.5 block">
                    Copie a chave da linha <strong>anon public</strong> no menu Project Settings ➔ API. Começa com <code>eyJ...</code>
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveCredentials}
                      disabled={testing}
                      className="h-10 px-4 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-black text-xs cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>{testing ? 'Verificando...' : 'Salvar e Conectar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="h-10 px-3.5 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-xs font-bold text-[#38bdf8] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                      <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      clearSupabaseCredentials();
                      setSupabaseUrl('');
                      setSupabaseKey('');
                      setConnected(false);
                      setHasInvalidKeyError(false);
                      playCockpitClick();
                      setFeedback({
                        type: 'info',
                        text: 'Credenciais removidas do navegador. O aplicativo voltou ao modo de dados local.',
                      });
                    }}
                    className="text-xs text-[#94a3b8] hover:text-[#ffb4ab] cursor-pointer"
                  >
                    Limpar Credenciais
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Project API Link Helper */}
            {getSupabaseProjectId(supabaseUrl) && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0d2847] to-[#152744] border border-[#38bdf8]/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-[#f8fafc] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#38bdf8]" />
                    <span>Atalho Direto para as Chaves do seu Projeto</span>
                  </div>
                  <div className="text-[11px] text-[#94a3b8]">
                    Projeto detectado: <strong className="font-mono text-[#38bdf8]">{getSupabaseProjectId(supabaseUrl)}</strong>
                  </div>
                </div>

                <a
                  href={`https://supabase.com/dashboard/project/${getSupabaseProjectId(supabaseUrl)}/settings/api`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <span>Abrir Tela de API do Projeto</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Visual Guide: How to find anon key */}
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] text-xs text-[#bec6e0] space-y-3">
              <div className="font-bold text-[#ffb95f] flex items-center gap-1.5 text-xs sm:text-sm">
                <HelpCircle className="w-4 h-4 text-[#ffb95f]" />
                <span>2 Formas Fáceis de Encontrar a Anon Key no Supabase:</span>
              </div>

              {/* Method 1: Connect button */}
              <div className="p-3 bg-[#152031] rounded-xl border border-[#334155]/80 space-y-1.5">
                <div className="font-extrabold text-[#34d399] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-center leading-5 text-[11px]">1</span>
                  <span>Opção Mais Rápida: Pelo botão "Connect" (no topo da tela)</span>
                </div>
                <p className="text-[#94a3b8] leading-relaxed text-[11px] pl-6">
                  Na página inicial do seu projeto no Supabase, olhe na barra superior e clique no botão verde/azul <strong>"Connect"</strong>. Na janela que abrir, acesse <strong>App Frameworks</strong> ou <strong>Project API keys</strong> e copie a chave <strong>anon public</strong>.
                </p>
              </div>

              {/* Method 2: Settings > API */}
              <div className="p-3 bg-[#152031] rounded-xl border border-[#334155]/80 space-y-1.5">
                <div className="font-extrabold text-[#38bdf8] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-center leading-5 text-[11px]">2</span>
                  <span>Opção Padrão: Pelo menu Project Settings ➔ API</span>
                </div>
                <div className="text-[#94a3b8] leading-relaxed text-[11px] pl-6 space-y-1">
                  <div>• No menu lateral esquerdo inferior, clique no ícone de engrenagem ⚙️ <strong>Project Settings</strong>.</div>
                  <div>• Clique em <strong>API</strong> (na coluna Configuration).</div>
                  <div>• Na caixa <strong>Project API keys</strong>, procure a linha com a etiqueta <strong>anon</strong> e <strong>public</strong>.</div>
                  <div>• Clique no botão <strong>Copy</strong> (a chave começa com <code>eyJhbGciOi...</code>).</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MIGRATIONS SQL */}
        {activeTab === 'migrations' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#ffb95f]" />
                    Migration SQL Completa (PostgreSQL)
                  </h4>
                  <p className="text-[11px] text-[#94a3b8]">
                    Gera tabelas, chaves primárias, triggers de data, índices e políticas de segurança RLS.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="h-9 px-3.5 rounded-xl bg-[#ffb95f] hover:bg-[#f59e0b] text-[#0f172a] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Migration SQL'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="max-h-56 overflow-y-auto p-3 bg-[#040e1f] border border-[#334155] rounded-xl text-[10px] font-mono text-[#a5b4fc] leading-relaxed select-all">
                  {MASTER_MIGRATION_SQL}
                </pre>
              </div>

              <div className="text-[11px] text-[#94a3b8] space-y-1">
                <span className="font-bold text-[#d8e3fb]">Como rodar a migration:</span>
                <p>
                  1. Copie o script acima clicando em <strong>Copiar Migration SQL</strong>.<br />
                  2. No Supabase Dashboard do seu projeto, acesse o menu <strong>SQL Editor</strong>.<br />
                  3. Cole o código e clique em <strong>Run</strong>. Todas as tabelas serão geradas imediatamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SINCRONIZAÇÃO EM NUVEM */}
        {activeTab === 'sync' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] space-y-4">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#38bdf8]" />
                  Sincronização de Viagens e Manutenções
                </h4>
                <p className="text-[11px] text-[#94a3b8]">
                  Envia o estado da viagem atual, despesas, paradas e manutenções para as tabelas PostgreSQL do Supabase.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#152031] rounded-xl border border-[#334155]">
                  <span className="text-[#94a3b8]">Viagem Ativa:</span>
                  <div className="font-bold text-[#d8e3fb] truncate">{activeTrip.origin} ➔ {activeTrip.destination}</div>
                  <div className="text-[11px] text-[#4edea3] mt-1">{activeTrip.expenses.length} despesas registradas</div>
                </div>

                <div className="p-3 bg-[#152031] rounded-xl border border-[#334155]">
                  <span className="text-[#94a3b8]">Plano de Manutenção:</span>
                  <div className="font-bold text-[#d8e3fb]">{maintenanceItems.length} itens cadastrados</div>
                  <div className="text-[11px] text-[#ffb95f] mt-1">Óleo, filtros, pneus e lonas</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncToSupabase}
                disabled={syncing || !connected}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0284c7] via-[#2563eb] to-[#1d4ed8] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <Cloud className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
                <span>{syncing ? 'Sincronizando com o Supabase...' : 'Sincronizar Agora com a Nuvem'}</span>
              </button>

              {!connected && (
                <div className="text-center text-xs text-[#f59e0b] font-semibold">
                  ⚠️ Configure e teste a conexão na primeira aba antes de sincronizar.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
