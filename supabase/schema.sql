-- ==============================================================================
-- CABINE OPERACIONAL DO CAMINHONEIRO - SCHEMA SUPABASE / POSTGRESQL (MASTER)
-- Arquivo: /supabase/schema.sql
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
    truck_model TEXT NOT NULL DEFAULT 'Scania R540 6x4 Super',
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

-- 8. Índices
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_checkpoints_trip_id ON public.checkpoints(trip_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_user_id ON public.maintenance_items(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_urgency ON public.maintenance_items(urgency);

-- 9. Trigger automático de updated_at
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

-- 10. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_policy" ON public.profiles FOR ALL USING (true);
CREATE POLICY "trips_policy" ON public.trips FOR ALL USING (true);
CREATE POLICY "expenses_policy" ON public.expenses FOR ALL USING (true);
CREATE POLICY "checkpoints_policy" ON public.checkpoints FOR ALL USING (true);
CREATE POLICY "maintenance_policy" ON public.maintenance_items FOR ALL USING (true);
CREATE POLICY "driver_shifts_policy" ON public.driver_shifts FOR ALL USING (true);
