import React, { useState, useRef } from 'react';
import { Trip, MaintenanceItem, User, isAdminRole, isUserAdmin } from '../types/cockpit';
import { formatCurrency, formatKm } from '../utils/formatters';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  isSupabaseConfigured,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
} from '../lib/supabase';
import {
  testSupabaseConnection,
  syncTripToSupabase,
  syncMaintenanceToSupabase,
} from '../services/supabaseSync';
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  X,
  HardDrive,
  ShieldCheck,
  Calendar,
  FileText,
  RotateCcw,
  Sparkles,
  Truck,
  Database,
  Cloud,
  CloudCheck,
  Copy,
  ExternalLink,
  RefreshCw,
  Code2,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { withAdminPermission } from '../middlewares/permissionMiddleware';

interface BackupDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTrip: Trip;
  onRestoreTrip: (trip: Trip) => void;
  currentUser?: User | null;
  maintenanceItems?: MaintenanceItem[];
}

interface ParsedBackup {
  type: 'single_trip' | 'full_backup';
  trip?: Trip;
  allTrips?: Trip[];
  maintenance?: MaintenanceItem[];
  exportedAt?: string;
  sourceApp?: string;
}

const SUPABASE_MIGRATION_SQL = `-- CABINE OPERACIONAL DO CAMINHONEIRO - SCHEMA & MIGRATIONS SUPABASE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'motorista_autonomo',
    rntrc TEXT,
    phone TEXT,
    truck_model TEXT NOT NULL DEFAULT 'Cavalo Mecânico 6x2',
    truck_plate TEXT NOT NULL DEFAULT 'BRA-2026',
    cnh_category TEXT DEFAULT 'E',
    is_email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.checkpoints (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    highway TEXT NOT NULL,
    km_marker TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
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

CREATE TABLE IF NOT EXISTS public.maintenance_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    interval_km INTEGER NOT NULL,
    last_done_km INTEGER NOT NULL,
    next_due_km INTEGER NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'ok',
    estimated_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    component TEXT NOT NULL,
    notes TEXT,
    recommended_part TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso publico total a perfis" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Acesso publico total a viagens" ON public.trips FOR ALL USING (true);
CREATE POLICY "Acesso publico total a despesas" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Acesso publico total a checkpoints" ON public.checkpoints FOR ALL USING (true);
CREATE POLICY "Acesso publico total a manutencao" ON public.maintenance_items FOR ALL USING (true);`;

const BackupDataModalContent: React.FC<BackupDataModalProps> = ({
  isOpen,
  onClose,
  activeTrip,
  onRestoreTrip,
  currentUser,
  maintenanceItems = [],
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'supabase'>('export');
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedBackup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase states
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(() => {
    try {
      return localStorage.getItem('cabine_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
    } catch {
      return '';
    }
  });
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(() => {
    try {
      return localStorage.getItem('cabine_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    } catch {
      return '';
    }
  });
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseFeedback, setSupabaseFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(currentUser);

  // Security check: Block display and execution of backup and cloud command functions for non-admin users
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
              Função Administrativa Protegida
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              As operações de Backup JSON (exportação e restauração total do banco de dados) e integração na nuvem são restritas a usuários com perfil de <strong className="text-[#fca5a5]">Administrador ('admin')</strong>.
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

  const activeTripExpensesTotal = activeTrip.expenses.reduce((s, e) => s + e.amount, 0);

  // Export Active Trip JSON
  const handleExportActiveTrip = () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const cleanOrigin = activeTrip.origin.split(' - ')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const cleanDest = activeTrip.destination.split(' - ')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `backup_viagem_${cleanOrigin}_${cleanDest}_${dateStr}.json`;

    const exportPayload = {
      app: 'Cabine Operacional do Caminhoneiro',
      version: '1.0',
      exportedAt: now.toISOString(),
      exportedBy: currentUser?.name || 'Motorista',
      type: 'single_trip',
      trip: activeTrip,
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    playSuccessChime();
    setSuccessNotice(`Viagem baixada com sucesso como "${filename}"!`);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  // Export Full System Backup JSON
  const handleExportFullBackup = () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `backup_completo_cabine_${dateStr}.json`;

    let allSavedTrips: Trip[] = [activeTrip];
    try {
      const raw = localStorage.getItem('cabine_preset_trips');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) allSavedTrips = parsed;
      }
    } catch {
      // fallback
    }

    const exportPayload = {
      app: 'Cabine Operacional do Caminhoneiro',
      version: '1.0',
      exportedAt: now.toISOString(),
      exportedBy: currentUser?.name || 'Motorista',
      type: 'full_backup',
      activeTrip,
      allTrips: allSavedTrips,
      maintenance: maintenanceItems,
      driverProfile: currentUser,
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    playSuccessChime();
    setSuccessNotice(`Backup completo gerado como "${filename}"!`);
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  // Process uploaded JSON file
  const handleFileProcess = (file: File) => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    setImportError(null);
    setSuccessNotice(null);
    setParsedData(null);

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      playAlertBeep();
      setImportError('Por favor, selecione um arquivo válido no formato .json.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        let targetTrip: Trip | undefined;
        let type: 'single_trip' | 'full_backup' = 'single_trip';

        if (parsed.trip && parsed.trip.origin && parsed.trip.destination) {
          targetTrip = parsed.trip;
          type = 'single_trip';
        } else if (parsed.activeTrip && parsed.activeTrip.origin) {
          targetTrip = parsed.activeTrip;
          type = 'full_backup';
        } else if (parsed.origin && parsed.destination && Array.isArray(parsed.expenses)) {
          targetTrip = parsed as Trip;
          type = 'single_trip';
        }

        if (!targetTrip) {
          playAlertBeep();
          setImportError(
            'Arquivo JSON inválido. Não foi possível identificar uma rota de viagem com origem, destino e despesas.'
          );
          return;
        }

        const sanitizedTrip: Trip = {
          ...targetTrip,
          id: targetTrip.id || `trip-restored-${Date.now()}`,
          expenses: Array.isArray(targetTrip.expenses) ? targetTrip.expenses : [],
          checkpoints: Array.isArray(targetTrip.checkpoints) ? targetTrip.checkpoints : [],
          grossFreight: Number(targetTrip.grossFreight) || 0,
          totalDistanceKm: Number(targetTrip.totalDistanceKm) || 100,
          currentOdometerKm: Number(targetTrip.currentOdometerKm) || 0,
          startOdometerKm: Number(targetTrip.startOdometerKm) || 0,
        };

        playCockpitClick();
        setParsedData({
          type,
          trip: sanitizedTrip,
          allTrips: parsed.allTrips,
          maintenance: parsed.maintenance,
          exportedAt: parsed.exportedAt,
          sourceApp: parsed.app || 'Backup Cabine',
        });
      } catch (err) {
        playAlertBeep();
        setImportError('Falha ao processar o arquivo JSON. Certifique-se de que o arquivo não está corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    if (!parsedData || !parsedData.trip) return;

    playSuccessChime();
    onRestoreTrip(parsedData.trip);

    if (parsedData.allTrips && Array.isArray(parsedData.allTrips)) {
      try {
        localStorage.setItem('cabine_preset_trips', JSON.stringify(parsedData.allTrips));
      } catch {
        // ignore
      }
    }

    setSuccessNotice(`Viagem de ${parsedData.trip.origin} para ${parsedData.trip.destination} restaurada com sucesso!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Supabase Handlers
  const handleSaveCredentials = async () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      playAlertBeep();
      setSupabaseFeedback('Por favor, informe a URL do projeto e a Chave Anon.');
      return;
    }

    const saveResult = saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    if (!saveResult.success) {
      playAlertBeep();
      setSupabaseFeedback(saveResult.message);
      return;
    }

    setIsTestingSupabase(true);
    setSupabaseFeedback('Credenciais salvas! Testando conexão com o Supabase...');
    const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
    setIsTestingSupabase(false);
    if (res.success) {
      playSuccessChime();
    } else {
      playAlertBeep();
    }
    setSupabaseFeedback(res.message);
  };

  const handleTestConnection = async () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    setIsTestingSupabase(true);
    setSupabaseFeedback(null);

    const res = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
    setIsTestingSupabase(false);
    if (res.success) {
      playSuccessChime();
      saveSupabaseCredentials(supabaseUrlInput, supabaseKeyInput);
    } else {
      playAlertBeep();
    }
    setSupabaseFeedback(res.message);
  };

  const handleSyncToSupabase = async () => {
    if (!isAdmin) {
      playAlertBeep();
      return;
    }
    playCockpitClick();
    setIsSyncingSupabase(true);
    setSupabaseFeedback('Sincronizando viagem e despesas com o Supabase...');

    const tripRes = await syncTripToSupabase(activeTrip);
    let maintMsg = '';
    if (maintenanceItems && maintenanceItems.length > 0) {
      const maintRes = await syncMaintenanceToSupabase(maintenanceItems);
      maintMsg = ` • ${maintRes.message}`;
    }

    setIsSyncingSupabase(false);
    if (tripRes.success) {
      playSuccessChime();
      setSupabaseFeedback(`${tripRes.message}${maintMsg}`);
    } else {
      playAlertBeep();
      setSupabaseFeedback(tripRes.message);
    }
  };

  const handleCopyMigrationSql = () => {
    playCockpitClick();
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#38bdf8] flex items-center justify-center text-[#38bdf8]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb] flex items-center gap-2">
                Backup de Dados & Integração Supabase
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Exporte/importe arquivos JSON locais e sincronize seus fretes com o banco de dados na nuvem.
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

        {/* Feedback notices */}
        {successNotice && (
          <div className="mt-3 p-3 rounded-xl bg-[#064e3b]/80 border border-[#10b981] flex items-center gap-2.5 text-[#a7f3d0] text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {importError && (
          <div className="mt-3 p-3 rounded-xl bg-[#690005]/80 border border-[#ea580c] flex items-center gap-2.5 text-[#ffdad6] text-xs animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-[#ffb4ab] shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Tab switchers: Exportar, Importar, Supabase */}
        <div className="flex gap-2 mt-4 p-1 bg-[#081425] rounded-xl border border-[#334155]">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setActiveTab('export');
              setImportError(null);
            }}
            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setActiveTab('import');
              setSuccessNotice(null);
            }}
            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar JSON</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setActiveTab('supabase');
            }}
            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'bg-[#1e293b] text-[#34d399] border border-[#10b981]/50 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Cloud className="w-4 h-4 text-[#34d399]" />
            <span>Nuvem Supabase</span>
          </button>
        </div>

        {/* TAB 1: EXPORT VIEW */}
        {activeTab === 'export' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#38bdf8]" />
                  Viagem Ativa Pronta para Backup
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-[#34d399] border border-emerald-500/30">
                  Dados em Memória
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Trajeto</div>
                  <div className="font-extrabold text-[#d8e3fb] truncate mt-0.5">
                    {activeTrip.origin}
                  </div>
                  <div className="text-[11px] text-[#38bdf8] truncate font-medium">
                    ➔ {activeTrip.destination}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Despesas Registradas</div>
                  <div className="font-mono font-black text-sm text-[#ffb95f] mt-0.5">
                    {formatCurrency(activeTripExpensesTotal)}
                  </div>
                  <div className="text-[11px] text-[#94a3b8]">
                    {activeTrip.expenses.length} lançamentos gravados
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155]/60">
                  <div className="text-[10px] text-[#94a3b8] uppercase font-bold">Checkpoints & Distância</div>
                  <div className="font-mono font-bold text-sm text-[#d8e3fb] mt-0.5">
                    {formatKm(activeTrip.totalDistanceKm)}
                  </div>
                  <div className="text-[11px] text-[#94a3b8]">
                    {activeTrip.checkpoints.length} paradas / pedágios
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportActiveTrip}
                className="p-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] border-1.5 border-[#38bdf8]/50 hover:border-[#38bdf8] flex flex-col text-left transition-all cursor-pointer group shadow-lg active:scale-[0.99]"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="p-2 rounded-lg bg-[#38bdf8]/15 text-[#38bdf8]">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-[#38bdf8] uppercase bg-[#38bdf8]/10 px-2 py-0.5 rounded">
                    Recomendado
                  </span>
                </div>
                <div className="font-extrabold text-sm text-[#d8e3fb] group-hover:text-[#38bdf8]">
                  Exportar Esta Viagem (JSON)
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">
                  Gera arquivo com notas fiscais, recibos, consumo de diesel e checkpoints desta rota.
                </div>
              </button>

              <button
                type="button"
                onClick={handleExportFullBackup}
                className="p-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] border-1.5 border-[#f59e0b]/50 hover:border-[#f59e0b] flex flex-col text-left transition-all cursor-pointer group shadow-lg active:scale-[0.99]"
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className="p-2 rounded-lg bg-[#f59e0b]/15 text-[#f59e0b]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-[#ffb95f] uppercase bg-[#f59e0b]/10 px-2 py-0.5 rounded">
                    Backup Global
                  </span>
                </div>
                <div className="font-extrabold text-sm text-[#d8e3fb] group-hover:text-[#ffb95f]">
                  Backup Completo do Cockpit
                </div>
                <div className="text-xs text-[#94a3b8] mt-1">
                  Inclui todas as rotas salvas, manutenções, pneus, relatórios e perfil do caminhoneiro.
                </div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: IMPORT VIEW */}
        {activeTab === 'import' && (
          <div className="mt-4 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileProcess(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#f59e0b] bg-[#f59e0b]/10 scale-[1.01]'
                  : 'border-[#334155] hover:border-[#f59e0b]/70 bg-[#081425]/70 hover:bg-[#081425]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#243248] text-[#f59e0b] flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-extrabold text-[#d8e3fb]">
                Clique para selecionar ou arraste o arquivo .json aqui
              </div>
              <div className="text-xs text-[#94a3b8] mt-1">
                Suporta backups individuais de viagens ou arquivos completos da Cabine Operacional
              </div>
            </div>

            {parsedData && parsedData.trip && (
              <div className="p-4 rounded-xl bg-[#081425] border-2 border-[#10b981] space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[#334155]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#34d399]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Arquivo Válido Encontrado</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    {parsedData.type === 'full_backup' ? 'Backup Completo' : 'Viagem Individual'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Rota Localizada</span>
                    <div className="text-sm font-extrabold text-[#d8e3fb] mt-0.5">
                      {parsedData.trip.origin} ➔ {parsedData.trip.destination}
                    </div>
                    <div className="text-[11px] text-[#38bdf8]">
                      Distância: {formatKm(parsedData.trip.totalDistanceKm)} • Frete Bruto: {formatCurrency(parsedData.trip.grossFreight)}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Despesas & Paradas</span>
                    <div className="text-sm font-extrabold text-[#ffb95f] mt-0.5">
                      {parsedData.trip.expenses.length} recibos (Total:{' '}
                      {formatCurrency(
                        parsedData.trip.expenses.reduce((s, e) => s + e.amount, 0)
                      )}
                      )
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      {parsedData.trip.checkpoints.length} pontos de parada e pedágios
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleApplyRestore}
                    className="w-full h-12 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[3]" />
                    <span>Restaurar Esta Viagem no Cockpit</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUPABASE CLOUD & MIGRATIONS */}
        {activeTab === 'supabase' && (
          <div className="mt-4 space-y-4">
            {/* Status Card */}
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-[#34d399]" />
                  Status da Conexão Supabase
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    isSupabaseConfigured
                      ? 'bg-emerald-500/20 text-[#34d399] border-[#10b981]/40'
                      : 'bg-amber-500/15 text-[#ffb95f] border-amber-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Offline (Local)'}
                </span>
              </div>

              <p className="text-xs text-[#94a3b8]">
                Sincronize suas viagens, despesas, checklists de pedágio e saúde da frota no banco relacional PostgreSQL do Supabase.
              </p>

              {/* Actions row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingSupabase}
                  className="h-10 px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-xs font-bold text-[#38bdf8] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>Testar Conexão</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncToSupabase}
                  disabled={isSyncingSupabase}
                  className="h-10 px-4 bg-[#10b981] hover:bg-[#059669] text-[#022c22] text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Sincronizar Rota & Despesas Agora</span>
                </button>
              </div>

              {/* Feedback text */}
              {supabaseFeedback && (
                <div className="p-2.5 rounded-lg bg-[#152031] border border-[#334155] text-xs text-[#d8e3fb]">
                  {supabaseFeedback}
                </div>
              )}
            </div>

            {/* Credentials Configuration Box */}
            <div className="p-4 rounded-xl bg-[#0b1322] border border-[#334155] space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#38bdf8]" />
                Credenciais do Projeto Supabase
              </span>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] mb-1">
                    Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="text"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    className="w-full h-10 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-lg px-3 text-xs font-mono text-[#d8e3fb] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] mb-1">
                    Anon Public Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    className="w-full h-10 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-lg px-3 text-xs font-mono text-[#d8e3fb] outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCredentials}
                    className="h-9 px-3.5 bg-[#243248] hover:bg-[#334155] text-[#34d399] border border-[#10b981]/50 rounded-lg text-xs font-bold cursor-pointer transition-all"
                  >
                    Salvar Credenciais
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearSupabaseCredentials();
                      setSupabaseUrlInput('');
                      setSupabaseKeyInput('');
                      playCockpitClick();
                      setSupabaseFeedback('Credenciais limpas do navegador.');
                    }}
                    className="text-[11px] text-[#94a3b8] hover:text-[#ffb4ab] cursor-pointer"
                  >
                    Limpar Credenciais
                  </button>
                </div>
              </div>
            </div>

            {/* Migration Script Viewer */}
            <div className="p-4 rounded-xl bg-[#081425] border border-[#334155] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-[#ffb95f]" />
                    Arquivo de Migration SQL
                  </span>
                  <p className="text-[11px] text-[#94a3b8]">
                    Salvo em <code className="text-[#38bdf8]">/supabase/migrations/20261106000000_cabine_operacional_initial.sql</code>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMigrationSql}
                  className="h-8 px-3 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#ffb95f]/50 text-[#ffb95f] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado!' : 'Copiar Migration'}</span>
                </button>
              </div>

              {/* Step by step instructions */}
              <div className="p-2.5 rounded-lg bg-[#152031] text-[11px] text-[#bec6e0] space-y-1 border border-[#334155]/60">
                <div className="font-bold text-[#ffb95f]">Como rodar no Supabase:</div>
                <ol className="list-decimal list-inside space-y-0.5 text-[#94a3b8]">
                  <li>Acesse seu projeto no dashboard do Supabase.</li>
                  <li>Clique no menu <strong>SQL Editor</strong> na barra lateral esquerda.</li>
                  <li>Clique em <strong>New Query</strong>, cole o código SQL acima e clique em <strong>Run</strong>.</li>
                  <li>Todas as 6 tabelas, índices e políticas de segurança serão criadas automaticamente!</li>
                </ol>
              </div>

              {/* Code preview snippet */}
              <div className="max-h-40 overflow-y-auto rounded-lg bg-[#050b14] border border-[#334155] p-3 text-[10px] font-mono text-[#a5b4fc]">
                <pre className="whitespace-pre-wrap">{SUPABASE_MIGRATION_SQL}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const BackupDataModal = withAdminPermission(BackupDataModalContent, {
  resourceTitle: 'Backup Local JSON & Exportação',
});
