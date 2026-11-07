-- ==============================================================================
-- CABINE OPERACIONAL DO CAMINHONEIRO - SCHEMA & MIGRATIONS SUPABASE / POSTGRESQL
-- Versão: 1.0.0
-- Descrição: Estrutura completa de banco de dados relacional para gestão de rotas,
-- despesas, pedágios, checkpoints, tacógrafo/jornada e manutenção preventiva.
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Usuários (Motoristas / Gestores)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'motorista_autonomo' CHECK (role IN ('motorista_autonomo', 'gestor_frota', 'motorista_agregado')),
    rntrc TEXT,
    phone TEXT,
    truck_model TEXT NOT NULL DEFAULT 'Cavalo Mecânico 6x2',
    truck_plate TEXT NOT NULL DEFAULT 'BRA-2026',
    cnh_category TEXT DEFAULT 'E',
    is_email_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Viagens e Rotas Rodoviárias
CREATE TABLE IF NOT EXISTS public.trips (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    route_highlights TEXT,
    cargo TEXT NOT NULL,
    cargo_type TEXT NOT NULL DEFAULT 'granel_solido' CHECK (cargo_type IN ('granel_solido', 'granel_liquido', 'carga_geral', 'frigorificada', 'perigosa', 'neogranel')),
    cargo_weight_ton NUMERIC(10, 2) NOT NULL DEFAULT 37.5,
    vehicle_model TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    axles INTEGER NOT NULL DEFAULT 6 CHECK (axles IN (2, 3, 4, 5, 6, 7, 9)),
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

-- 4. Tabela de Despesas da Viagem (Combustível, Pedágio, Alimentação, Oficina)
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('combustivel', 'arla', 'pedagio', 'alimentacao', 'manutencao', 'pneu_borracharia', 'estacionamento', 'chapa_descarga', 'outros')),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL,
    time TIME WITHOUT TIME ZONE NOT NULL,
    location TEXT,
    liters NUMERIC(8, 2),
    odometer_km NUMERIC(10, 2),
    payment_method TEXT CHECK (payment_method IN ('Cartão Frete', 'PIX', 'Dinheiro', 'TAG Sem Parar', 'Boleto')),
    invoice_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Checkpoints e Praças de Pedágio
CREATE TABLE IF NOT EXISTS public.checkpoints (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    highway TEXT NOT NULL,
    km_marker TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('completed', 'active', 'upcoming')),
    type TEXT NOT NULL CHECK (type IN ('partida', 'pedagio', 'posto_parada', 'fiscalizacao', 'destino', 'descarga')),
    estimated_arrival TEXT,
    actual_arrival TEXT,
    toll_fee NUMERIC(8, 2),
    toll_tag_detected BOOLEAN DEFAULT false,
    notes TEXT,
    has_safe_parking BOOLEAN DEFAULT false,
    has_shower BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Manutenção Preventiva e Saúde da Frota
CREATE TABLE IF NOT EXISTS public.maintenance_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    interval_km INTEGER NOT NULL,
    last_done_km INTEGER NOT NULL,
    next_due_km INTEGER NOT NULL,
    urgency TEXT NOT NULL DEFAULT 'ok' CHECK (urgency IN ('ok', 'warning', 'urgent')),
    estimated_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    component TEXT NOT NULL CHECK (component IN (
        'oleo_motor',
        'filtro_combustivel',
        'filtro_ar',
        'freios',
        'pneus',
        'diferencial',
        'suspensao',
        'eletrica_bateria',
        'arrefecimento',
        'consertos_gerais'
    )),
    notes TEXT,
    recommended_part TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Jornada do Motorista / Tacógrafo
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

-- ==============================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_checkpoints_trip_id ON public.checkpoints(trip_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_user_id ON public.maintenance_items(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_urgency ON public.maintenance_items(urgency);
CREATE INDEX IF NOT EXISTS idx_maintenance_component ON public.maintenance_items(component);

-- ==============================================================================
-- TRIGGER PARA ATUALIZAR 'updated_at' AUTOMATICAMENTE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_trips_updated_at ON public.trips;
CREATE TRIGGER trigger_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trigger_maintenance_updated_at ON public.maintenance_items;
CREATE TRIGGER trigger_maintenance_updated_at
BEFORE UPDATE ON public.maintenance_items
FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso público/anon (modo autônomo offline-first) e autenticado
CREATE POLICY "Acesso total de leitura a perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Acesso total de escrita a perfis" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Acesso total a viagens" ON public.trips FOR ALL USING (true);
CREATE POLICY "Acesso total a despesas" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Acesso total a checkpoints" ON public.checkpoints FOR ALL USING (true);
CREATE POLICY "Acesso total a manutencao" ON public.maintenance_items FOR ALL USING (true);
CREATE POLICY "Acesso total a turnos" ON public.driver_shifts FOR ALL USING (true);

-- ==============================================================================
-- DADOS INICIAIS DE TESTE / SEED (HUB LOGÍSTICO BRASIL)
-- ==============================================================================
INSERT INTO public.maintenance_items (id, title, interval_km, last_done_km, next_due_km, urgency, estimated_cost, component, notes, recommended_part)
VALUES
    ('m-1', 'Troca de Óleo do Motor (15W40 CI-4)', 30000, 412000, 442000, 'ok', 1450.00, 'oleo_motor', 'Inclui troca do filtro de óleo lubrificante e anel do bujão', 'Óleo Mineral 15W40 Top Turbo + Filtro Blindado'),
    ('m-2', 'Filtro de Combustível Racor & Secundário', 15000, 425000, 440000, 'warning', 480.00, 'filtro_combustivel', 'Drenagem do copo sedimentador e substituição dos dois elementos', 'Elemento Filtrante Separador de Água Racor 30 micra'),
    ('m-3', 'Revisão Lonas e Tambores de Freio', 40000, 395000, 435000, 'urgent', 2200.00, 'freios', 'Verificar espessura das lonas, cuícas de freio e folga nas catracas', 'Jogo de Lonas Standard + Rebites de Cobre'),
    ('m-4', 'Rodízio, Balanceamento e Calibragem de Pneus', 20000, 420000, 440000, 'warning', 420.00, 'pneus', 'Rodízio em X nos eixos da carreta e alinhamento a laser no cavalo', 'Calibragem com 110 PSI a frio nos eixos de tração'),
    ('m-5', 'Troca / Recapagem de Pneus da Tração (295/80 R22.5)', 90000, 352000, 442000, 'warning', 4800.00, 'pneus', 'Aferição de sulco (mínimo legal de 1.6mm) e envio para banda pré-moldada', 'Pneu Radial 295/80 R22.5 Carga Pesada')
ON CONFLICT (id) DO NOTHING;
