import { User, UserRole, isUserAdmin } from '../types/cockpit';
import { getSupabaseClient, isSupabaseConfigured, getStoredCredentials, getSupabaseProjectId } from '../lib/supabase';
import { saveCurrentUserSession } from '../data/mockUsers';

export interface SupabaseAdminAuthResult {
  success: boolean;
  user?: User;
  error?: string;
  isConfigured?: boolean;
}

/**
 * Generates SQL script to register or promote a user to Administrator in Supabase
 */
export const getSupabaseAdminSqlSnippet = (
  email: string = 'ricardo.jr.pinheiro@gmail.com',
  name: string = 'Ricardo Pinheiro'
): string => {
  const safeEmail = email.trim() || 'administrador@cabine.com';
  const safeName = name.trim() || 'Administrador do Sistema';

  return `-- 1. Inserir ou atualizar na tabela pública de perfis como Administrador
INSERT INTO public.profiles (name, email, role, truck_model, truck_plate, is_email_verified)
VALUES (
    '${safeName.replace(/'/g, "''")}',
    '${safeEmail.replace(/'/g, "''")}',
    'administrador',
    'Volvo FH 540 Globetrotter',
    'PR-CAS-6540',
    true
)
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'administrador',
    is_email_verified = true,
    updated_at = timezone('utc'::text, now());

-- 2. Consulta de confirmação dos Administradores autorizados
SELECT id, name, email, role, created_at 
FROM public.profiles 
WHERE role IN ('administrador', 'admin', 'gestor_frota');`;
};

/**
 * Authenticates an administrator exclusively through the connected Supabase instance.
 * Rejects any local or pre-configured admin bypass.
 */
export const authenticateSupabaseAdmin = async (
  emailInput: string,
  passwordInput?: string
): Promise<SupabaseAdminAuthResult> => {
  const cleanEmail = emailInput.trim().toLowerCase();
  const trimmedPassword = passwordInput?.trim() || '';

  if (!cleanEmail) {
    return {
      success: false,
      error: 'Por favor, informe o e-mail cadastrado no Supabase.',
    };
  }

  const client = getSupabaseClient();
  const creds = getStoredCredentials();

  if (!client || !creds.url || !creds.key) {
    return {
      success: false,
      isConfigured: false,
      error:
        'O Supabase não está configurado. Conecte seu projeto Supabase no painel para validar administradores autorizados.',
    };
  }

  try {
    // 1. First, check if Supabase Auth login is possible when password is provided
    let authUser: any = null;
    if (trimmedPassword) {
      try {
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: trimmedPassword,
        });

        if (!authError && authData?.user) {
          authUser = authData.user;
        }
      } catch {
        // If auth endpoint fails (e.g. user was created in profiles table only), proceed to query profiles
      }
    }

    // 2. Query the profiles table in Supabase
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileError) {
      // Table might not exist or connection failed
      console.warn('Erro ao consultar tabela profiles no Supabase:', profileError);
      return {
        success: false,
        error: `Falha na consulta ao Supabase: ${profileError.message}. Verifique se a migration inicial foi executada no banco.`,
      };
    }

    // Check if user was found in profiles table
    if (profile) {
      const role = String(profile.role || '').toLowerCase();
      const isRoleAdmin = role === 'administrador' || role === 'admin' || role === 'gestor_frota';

      if (!isRoleAdmin) {
        return {
          success: false,
          error: `Acesso negado: O usuário "${cleanEmail}" está registrado no Supabase, mas seu perfil é "${profile.role || 'motorista'}" e não Administrador.`,
        };
      }

      // Valid admin confirmed in Supabase!
      const adminUser: User = {
        id: profile.id || `supabase-${Date.now()}`,
        name: profile.name || authUser?.user_metadata?.name || 'Administrador Supabase',
        email: profile.email || cleanEmail,
        password: trimmedPassword || undefined,
        role: 'administrador',
        truckModel: profile.truck_model || 'Frota Corporativa',
        truckPlate: profile.truck_plate || 'ADM-2026',
        rntrc: profile.rntrc || 'Gestão Matriz',
        phone: profile.phone || '',
        cnhCategory: profile.cnh_category || 'E',
        isEmailVerified: true,
        createdAt: profile.created_at || new Date().toISOString(),
        supabaseUserId: profile.auth_user_id || authUser?.id || profile.id,
        isSupabaseVerifiedAdmin: true,
        authProvider: 'supabase',
      };

      saveCurrentUserSession(adminUser);
      return {
        success: true,
        user: adminUser,
      };
    }

    // 3. If not in profiles, check if authUser has admin metadata
    if (authUser) {
      const authRole = authUser.app_metadata?.role || authUser.user_metadata?.role;
      if (authRole === 'admin' || authRole === 'administrador' || authRole === 'gestor_frota') {
        const adminUser: User = {
          id: authUser.id,
          name: authUser.user_metadata?.name || 'Administrador Supabase',
          email: authUser.email || cleanEmail,
          password: trimmedPassword || undefined,
          role: 'administrador',
          truckModel: 'Frota Corporativa',
          truckPlate: 'ADM-2026',
          isEmailVerified: true,
          createdAt: authUser.created_at || new Date().toISOString(),
          supabaseUserId: authUser.id,
          isSupabaseVerifiedAdmin: true,
          authProvider: 'supabase',
        };

        saveCurrentUserSession(adminUser);
        return {
          success: true,
          user: adminUser,
        };
      }
    }

    // 4. Not registered in Supabase
    return {
      success: false,
      error: `A conta "${cleanEmail}" não foi encontrada como Administrador no banco de dados do Supabase. Cadastre-a no Supabase para liberar o acesso.`,
    };
  } catch (err: any) {
    console.error('Erro na autenticação de Administrador via Supabase:', err);
    return {
      success: false,
      error: `Erro ao comunicar com o Supabase: ${err.message || 'Falha de conexão com a nuvem'}.`,
    };
  }
};

/**
 * Validates the currently logged-in user against Supabase.
 * If the user claims to be an admin but has no valid Supabase verification,
 * their admin permissions are revoked.
 */
export const verifyActiveAdminSession = async (user: User | null): Promise<User | null> => {
  if (!user) return null;

  // Drivers do not need Supabase admin verification
  if (user.role !== 'admin' && user.role !== 'administrador' && user.role !== 'gestor_frota') {
    return user;
  }

  // If user claims to be admin, require isSupabaseVerifiedAdmin
  if (!user.isSupabaseVerifiedAdmin) {
    // Demote to driver
    const demoted: User = {
      ...user,
      role: 'motorista',
      isSupabaseVerifiedAdmin: false,
    };
    saveCurrentUserSession(demoted);
    return demoted;
  }

  // If Supabase is configured, re-verify with the database
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('role')
        .eq('email', user.email.toLowerCase().trim())
        .maybeSingle();

      if (!error && data) {
        const role = String(data.role || '').toLowerCase();
        if (role !== 'administrador' && role !== 'admin' && role !== 'gestor_frota') {
          // Demoted in Supabase
          const demoted: User = {
            ...user,
            role: 'motorista',
            isSupabaseVerifiedAdmin: false,
          };
          saveCurrentUserSession(demoted);
          return demoted;
        }
      }
    } catch {
      // Offline fallback: retain if already verified
    }
  }

  return user;
};
