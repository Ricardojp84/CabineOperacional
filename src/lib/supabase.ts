import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Extracts the Supabase project reference/ID from dashboard URL or API URL
 */
export const getSupabaseProjectId = (raw: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  const dashMatch = trimmed.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashMatch && dashMatch[1]) return dashMatch[1];
  const urlMatch = trimmed.match(/https?:\/\/([a-zA-Z0-9_-]+)\.supabase\.co/i);
  if (urlMatch && urlMatch[1] && urlMatch[1] !== 'your-project') return urlMatch[1];
  // If user typed bare project ID like 'qzprywtvmbxlaweidghj'
  if (/^[a-zA-Z0-9_-]{12,30}$/.test(trimmed)) return trimmed;
  return '';
};

/**
 * Sanitizes Supabase URL, removing surrounding quotes, spaces, trailing slashes,
 * and automatically converting dashboard URLs (supabase.com/dashboard/project/XYZ) into API URLs (XYZ.supabase.co)
 */
export const sanitizeSupabaseUrl = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["']|["']$/g, '');
  // Remove accidental prefix like VITE_SUPABASE_URL=
  if (cleaned.includes('=')) {
    cleaned = cleaned.split('=').pop()?.trim() || cleaned;
  }

  // If user pasted dashboard URL like https://supabase.com/dashboard/project/abcdefghijk
  const projectId = getSupabaseProjectId(cleaned);
  if (cleaned.includes('supabase.com/dashboard') && projectId) {
    return `https://${projectId}.supabase.co`;
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
};

/**
 * Sanitizes Supabase Anon Key, removing quotes, prefix, spaces, and linebreaks
 */
export const sanitizeSupabaseKey = (raw: string): string => {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["']|["']$/g, '');
  // Remove accidental prefix like VITE_SUPABASE_ANON_KEY= or anon=
  if (cleaned.includes('=')) {
    cleaned = cleaned.split('=').pop()?.trim() || cleaned;
  }
  // Strip any accidental spaces or newlines within key
  cleaned = cleaned.replace(/\s+/g, '');
  return cleaned;
};

// Retrieve credentials from Vite environment or localStorage override
export const getStoredCredentials = () => {
  let envUrl = '';
  let envKey = '';

  try {
    envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  } catch {
    // Ignore
  }

  try {
    const storedUrl = localStorage.getItem('cabine_supabase_url');
    const storedKey = localStorage.getItem('cabine_supabase_anon_key');
    if (storedUrl && storedKey) {
      return {
        url: sanitizeSupabaseUrl(storedUrl),
        key: sanitizeSupabaseKey(storedKey),
      };
    }
  } catch {
    // Ignore localStorage errors
  }

  return {
    url: sanitizeSupabaseUrl(envUrl),
    key: sanitizeSupabaseKey(envKey),
  };
};

export const checkIsConfigured = (url?: string, key?: string): boolean => {
  const creds = url && key ? { url, key } : getStoredCredentials();
  return Boolean(
    creds.url &&
    creds.key &&
    creds.url.startsWith('https://') &&
    !creds.url.includes('your-project') &&
    creds.key.length > 20 &&
    !creds.key.includes('your-anon-key')
  );
};

export let isSupabaseConfigured = checkIsConfigured();

let activeSupabaseClient: SupabaseClient | null = null;

export const createSupabaseInstance = (url: string, key: string): SupabaseClient | null => {
  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = sanitizeSupabaseKey(key);

  if (!cleanUrl || !cleanKey || !cleanUrl.startsWith('https://') || cleanUrl.includes('your-project')) {
    return null;
  }

  try {
    return createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  } catch (err) {
    console.warn('Falha ao inicializar cliente Supabase:', err);
    return null;
  }
};

// Initialize default instance
const initialCreds = getStoredCredentials();
if (checkIsConfigured(initialCreds.url, initialCreds.key)) {
  activeSupabaseClient = createSupabaseInstance(initialCreds.url, initialCreds.key);
}

/**
 * Returns the currently active SupabaseClient or creates one on the fly with custom credentials
 */
export const getSupabaseClient = (overrideUrl?: string, overrideKey?: string): SupabaseClient | null => {
  if (overrideUrl && overrideKey) {
    return createSupabaseInstance(overrideUrl, overrideKey);
  }
  if (!activeSupabaseClient) {
    const creds = getStoredCredentials();
    if (checkIsConfigured(creds.url, creds.key)) {
      activeSupabaseClient = createSupabaseInstance(creds.url, creds.key);
      isSupabaseConfigured = true;
    }
  }
  return activeSupabaseClient;
};

/**
 * Proxy object so existing imports of `supabase` stay active and point to the current client
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      return undefined;
    }
    const val = (client as any)[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  },
});

/**
 * Helper to save and immediately activate new Supabase credentials in memory and localStorage
 */
export const saveSupabaseCredentials = (url: string, key: string): { success: boolean; message: string } => {
  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = sanitizeSupabaseKey(key);

  if (!cleanUrl) {
    return { success: false, message: 'URL do Supabase não pode ser vazia.' };
  }
  if (!cleanUrl.startsWith('https://') || cleanUrl.includes('your-project')) {
    return { success: false, message: 'A URL do Supabase deve iniciar com https:// e pertencer ao seu projeto.' };
  }
  if (!cleanKey || cleanKey.length < 20 || cleanKey.includes('your-anon-key')) {
    return { success: false, message: 'A Chave Anon deve ser a chave pública copiada do Supabase (começa com eyJ...).' };
  }

  try {
    localStorage.setItem('cabine_supabase_url', cleanUrl);
    localStorage.setItem('cabine_supabase_anon_key', cleanKey);

    activeSupabaseClient = createSupabaseInstance(cleanUrl, cleanKey);
    isSupabaseConfigured = true;

    return {
      success: true,
      message: 'Credenciais salvas e ativadas imediatamente com sucesso!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao salvar localmente: ${err.message}`,
    };
  }
};

/**
 * Helper to clear custom Supabase credentials
 */
export const clearSupabaseCredentials = (): void => {
  try {
    localStorage.removeItem('cabine_supabase_url');
    localStorage.removeItem('cabine_supabase_anon_key');
    activeSupabaseClient = null;
    isSupabaseConfigured = false;
  } catch {
    // Ignore
  }
};
