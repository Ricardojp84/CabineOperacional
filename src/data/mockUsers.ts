import { User } from '../types/cockpit';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Marcos Vinícius (Motorista de Estrada)',
    email: 'marcos@cabine.com',
    password: 'estrada123',
    role: 'motorista',
    rntrc: '48.291.802',
    phone: '(66) 99842-1920',
    truckModel: 'Scania R540 6x4 Super',
    truckPlate: 'BRA-9S40',
    cnhCategory: 'E',
    isEmailVerified: true,
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Ricardo Pinheiro (Administrador do Sistema)',
    email: 'ricardo@cabine.com',
    password: 'frota2026',
    role: 'administrador',
    rntrc: '39.104.992',
    phone: '(45) 99711-8840',
    truckModel: 'Volvo FH 540 6x2 Globetrotter',
    truckPlate: 'PR-CAS-6540',
    cnhCategory: 'E',
    isEmailVerified: true,
    createdAt: '2025-02-10T14:30:00Z',
  },
  {
    id: 'user-3',
    name: 'Juliana Freitas (Motorista Agregada)',
    email: 'juliana@cabine.com',
    password: 'juliana123',
    role: 'motorista_agregado',
    rntrc: '52.710.443',
    phone: '(31) 98822-4411',
    truckModel: 'Mercedes-Benz Actros 2651',
    truckPlate: 'MG-BTM-2651',
    cnhCategory: 'E',
    isEmailVerified: true,
    createdAt: '2025-03-01T08:00:00Z',
  },
];

export const getUsersFromStorage = (): User[] => {
  try {
    const raw = localStorage.getItem('cabine_users_list');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return INITIAL_USERS;
};

export const saveUsersToStorage = (users: User[]): void => {
  try {
    localStorage.setItem('cabine_users_list', JSON.stringify(users));
  } catch {
    // Ignore
  }
};

export const getCurrentUserSession = (): User | null => {
  try {
    const raw = localStorage.getItem('cabine_logged_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return null;
};

export const saveCurrentUserSession = (user: User | null): void => {
  try {
    if (user) {
      localStorage.setItem('cabine_logged_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cabine_logged_user');
    }
  } catch {
    // Ignore
  }
};

/**
 * Confirma o e-mail do usuário através do token recebido pelo link
 */
export const verifyUserByToken = (token: string): { success: boolean; user?: User; message: string } => {
  if (!token) {
    return { success: false, message: 'Token de confirmação inválido ou expirado.' };
  }

  const list = getUsersFromStorage();
  const index = list.findIndex((u) => u.verificationToken === token);

  if (index === -1) {
    return { success: false, message: 'Link de confirmação não encontrado ou já utilizado.' };
  }

  const user = list[index];
  const updatedUser: User = {
    ...user,
    isEmailVerified: true,
    verificationToken: undefined,
  };

  list[index] = updatedUser;
  saveUsersToStorage(list);
  saveCurrentUserSession(updatedUser);

  return {
    success: true,
    user: updatedUser,
    message: `Conta de ${updatedUser.name} ativada com sucesso! Bem-vindo à Cabine Operacional.`,
  };
};

/**
 * Reenvia / Gera novo token de confirmação para o e-mail informado
 */
export const resendVerificationToken = (
  email: string
): { success: boolean; token?: string; user?: User; message: string } => {
  const trimmed = email.trim().toLowerCase();
  const list = getUsersFromStorage();
  const index = list.findIndex((u) => u.email.toLowerCase() === trimmed);

  if (index === -1) {
    return { success: false, message: 'Usuário não encontrado com este e-mail.' };
  }

  const user = list[index];
  if (user.isEmailVerified) {
    return { success: false, message: 'Este e-mail já foi confirmado anteriormente. Faça login diretamente.' };
  }

  const newToken = `vtok_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
  const updatedUser: User = {
    ...user,
    verificationToken: newToken,
  };

  list[index] = updatedUser;
  saveUsersToStorage(list);

  return {
    success: true,
    token: newToken,
    user: updatedUser,
    message: `Novo link de ativação gerado para ${updatedUser.email}.`,
  };
};
