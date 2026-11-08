/**
 * Serviço de Gerenciamento e Monitoramento de Lembretes de Documentação do Condutor
 * Acompanhamento de CNH, EAR, Exames Toxicológicos Periódicos (CTB Art. 148-A) e outros
 */

import { DriverDocumentReminder, DriverDocumentType, DriverDocumentStatus } from '../types/cockpit';

export const STORAGE_KEY_DRIVER_DOCUMENTS = 'cabine_driver_documents';

export const INITIAL_DRIVER_DOCUMENTS: DriverDocumentReminder[] = [
  {
    id: 'doc-cnh',
    type: 'cnh',
    title: 'CNH - Carteira Nacional de Habilitação',
    documentNumber: '04829104820',
    categoryOrDetails: 'Categoria E (Veículos Articulados e Pesados)',
    dueDate: '2027-08-15',
    issueDate: '2022-08-15',
    alertDaysThreshold: 60,
    driverName: 'Ricardo Pinheiro',
    laboratoryOrIssuer: 'DETRAN-SP',
    notes: 'Renovação obrigatória com exames de aptidão física e mental a cada 5 anos.',
  },
  {
    id: 'doc-ear',
    type: 'ear',
    title: 'EAR - Exerce Atividade Remunerada',
    documentNumber: 'Averbação na CNH 04829104820',
    categoryOrDetails: 'Averbação Profissional Obrigatória para CTe e Fretes',
    dueDate: '2027-08-15',
    issueDate: '2022-08-15',
    alertDaysThreshold: 60,
    driverName: 'Ricardo Pinheiro',
    laboratoryOrIssuer: 'DETRAN / SENATRAN',
    notes: 'Exigência legal para motoristas que realizam transporte remunerado de cargas.',
  },
  {
    id: 'doc-toxicologico',
    type: 'toxicologico',
    title: 'Exame Toxicológico Periódico (CTB Art. 148-A)',
    documentNumber: 'TOX-2024-883921',
    categoryOrDetails: 'Janela Obrigatória de 2 anos e meio (30 meses)',
    dueDate: '2026-11-28', // Faltam 21 dias para alertar na cabine (tempo real 2026-11-07)
    issueDate: '2024-05-28',
    alertDaysThreshold: 30,
    driverName: 'Ricardo Pinheiro',
    laboratoryOrIssuer: 'Laboratório Toxicológico Credenciado SENATRAN',
    notes: 'Art. 148-A CTB: Multa gravíssima de R$ 1.467,35 (fator 5x) e 7 pontos caso dirija após o prazo de 30 dias de tolerância.',
  },
  {
    id: 'doc-crlv',
    type: 'crlv_veiculo',
    title: 'CRLV-e Licenciamento do Veículo (Cavalo Mecânico)',
    documentNumber: 'Placa BRA-2026',
    categoryOrDetails: 'Licenciamento Anual (Exercício 2026)',
    dueDate: '2026-12-31',
    issueDate: '2025-12-10',
    alertDaysThreshold: 60,
    driverName: 'Ricardo Pinheiro',
    laboratoryOrIssuer: 'DETRAN-SP',
    notes: 'Caminhão Scania R540 Super. IPVA, DPVAT e taxa anual de licenciamento quitados.',
  },
  {
    id: 'doc-tacografo',
    type: 'cronotacografo',
    title: 'Certificado de Verificação do Cronotacógrafo',
    documentNumber: 'INMETRO-098241',
    categoryOrDetails: 'Ensaio Metrológico Bienal INMETRO',
    dueDate: '2027-04-20',
    issueDate: '2025-04-20',
    alertDaysThreshold: 30,
    driverName: 'Ricardo Pinheiro',
    laboratoryOrIssuer: 'Posto Autorizado de Cronotacógrafo INMETRO',
    notes: 'Certificado de verificação metrológica exigido em fiscalizações da Polícia Rodoviária Federal.',
  },
];

/**
 * Carrega a lista de documentos do localStorage ou inicializa com os padrões
 */
export function loadDriverDocuments(): DriverDocumentReminder[] {
  if (typeof window === 'undefined') return INITIAL_DRIVER_DOCUMENTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DRIVER_DOCUMENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler documentos do localStorage:', err);
  }
  return INITIAL_DRIVER_DOCUMENTS;
}

/**
 * Salva a lista de documentos no localStorage
 */
export function saveDriverDocuments(docs: DriverDocumentReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DRIVER_DOCUMENTS, JSON.stringify(docs));
  } catch (err) {
    console.error('Erro ao salvar documentos no localStorage:', err);
  }
}

/**
 * Calcula os dias restantes até o vencimento.
 * Positivo: faltam X dias
 * Zero: vence hoje
 * Negativo: vencido há X dias
 */
export function calculateDaysRemaining(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dueDateStr.split('-');
    if (parts.length !== 3) return 0;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const due = new Date(year, month, day);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Retorna o status de conformidade do documento
 */
export function getDocumentStatus(
  dueDateStr: string,
  alertThresholdDays: number = 30
): DriverDocumentStatus {
  const days = calculateDaysRemaining(dueDateStr);
  if (days < 0) return 'vencido';
  if (days <= alertThresholdDays) return 'alerta';
  return 'valido';
}

/**
 * Formata data no formato brasileiro dd/mm/aaaa
 */
export function formatBrazilianDate(dateStr?: string): string {
  if (!dateStr) return 'Não informada';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Sugere a nova data de validade com base na legislação de trânsito brasileira:
 * - Toxicológico: +30 meses (2 anos e 6 meses)
 * - CNH / EAR: +5 anos
 * - CRLV: +1 ano
 * - Cronotacógrafo: +2 anos
 * - Outros: +1 ano
 */
export function getSuggestedRenewalDate(
  type: DriverDocumentType,
  currentDueDate?: string
): string {
  const base = new Date(); // Usar data de hoje como base da renovação
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = base.getDate();

  let targetDate = new Date(year, month, day);

  switch (type) {
    case 'toxicologico':
      // Adiciona 30 meses (2 anos e 6 meses)
      targetDate = new Date(year, month + 30, day);
      break;
    case 'cnh':
    case 'ear':
    case 'mopp':
    case 'rntrc_antt':
      // Adiciona 5 anos
      targetDate = new Date(year + 5, month, day);
      break;
    case 'cronotacografo':
      // Adiciona 2 anos
      targetDate = new Date(year + 2, month, day);
      break;
    case 'crlv_veiculo':
    case 'outros':
    default:
      // Adiciona 1 ano
      targetDate = new Date(year + 1, month, day);
      break;
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Filtra documentos que necessitam de atenção imediata (vencidos ou em alerta)
 */
export function getCriticalDocumentAlerts(
  docs: DriverDocumentReminder[]
): { doc: DriverDocumentReminder; daysRemaining: number; status: DriverDocumentStatus }[] {
  return docs
    .map((doc) => {
      const days = calculateDaysRemaining(doc.dueDate);
      const status = getDocumentStatus(doc.dueDate, doc.alertDaysThreshold);
      return { doc, daysRemaining: days, status };
    })
    .filter((item) => item.status === 'vencido' || item.status === 'alerta')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
