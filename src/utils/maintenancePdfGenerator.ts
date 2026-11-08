import { jsPDF } from 'jspdf';
import { MaintenanceItem, MaintenanceComponent, User } from '../types/cockpit';
import { formatCurrency, formatOdometer, formatKm } from './formatters';

interface GenerateMaintenancePdfOptions {
  maintenanceItems: MaintenanceItem[];
  currentOdometer: number;
  vehicleModel?: string;
  vehiclePlate?: string;
  currentUser?: User | null;
}

export function generateMaintenancePdf({
  maintenanceItems,
  currentOdometer,
  vehicleModel = 'Scania R540 6x4 Super',
  vehiclePlate = 'BRA-2026',
  currentUser,
}: GenerateMaintenancePdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Helpers
  const addPageIfNeeded = (requiredHeight: number) => {
    if (cursorY + requiredHeight > pageHeight - margin - 15) {
      doc.addPage();
      cursorY = margin;
      drawPageBorder();
    }
  };

  const drawPageBorder = () => {
    // Top subtle accent bar
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(margin, cursorY, contentWidth, 2, 'F');
    cursorY += 6;
  };

  // Analyze maintenance urgency & statistics
  const urgent: MaintenanceItem[] = [];
  const warning: MaintenanceItem[] = [];
  const ok: MaintenanceItem[] = [];
  let pendingCost = 0;

  maintenanceItems.forEach((item) => {
    const kmRemaining = item.nextDueKm - currentOdometer;
    if (kmRemaining <= 0) {
      urgent.push(item);
      pendingCost += item.estimatedCost;
    } else if (kmRemaining <= 3000) {
      warning.push(item);
      pendingCost += item.estimatedCost;
    } else {
      ok.push(item);
    }
  });

  const componentLabels: Record<MaintenanceComponent, string> = {
    oleo_motor: 'Oleo & Lubrificacao',
    filtro_combustivel: 'Filtro Combustivel',
    filtro_ar: 'Filtro de Ar / Cabine',
    freios: 'Freios & Cuicas',
    pneus: 'Pneus & Borracharia',
    diferencial: 'Cambio & Diferencial',
    suspensao: 'Suspensao Pneumatica',
    eletrica_bateria: 'Eletrica & Bateria',
    arrefecimento: 'Radiador / Arrefecimento',
    consertos_gerais: 'Consertos Gerais',
  };

  // --- HEADER (Matching TripReportModal & tripPdfGenerator standard) ---
  doc.setFillColor(15, 23, 42); // Dark slate (#0f172a)
  doc.roundedRect(margin, cursorY, contentWidth, 26, 2, 2, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CABINE OPERACIONAL - RELATORIO DE MANUTENCAO PREVENTIVA', margin + 6, cursorY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('HISTORICO DE REVISOES REALIZADAS E CRONOGRAMA DE TROCAS DA FROTA', margin + 6, cursorY + 14);

  // Metadata tags right-aligned
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const cleanPlate = vehiclePlate.replace(/[^a-zA-Z0-9]/g, '');
  const docCode = `MANUT-${cleanPlate.slice(-4)}-${now.getFullYear()}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`PROTOCOLO: ${docCode}`, pageWidth - margin - 6, cursorY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Emissao: ${dateFormatted} as ${timeFormatted}`, pageWidth - margin - 6, cursorY + 14, { align: 'right' });
  
  const statusLabel = urgent.length > 0 ? 'STATUS: ATENCAO CRITICA' : warning.length > 0 ? 'STATUS: REVISOES PROXIMAS' : 'STATUS: FROTA 100% EM DIA';
  doc.setFont('helvetica', 'bold');
  if (urgent.length > 0) {
    doc.setTextColor(239, 68, 68); // Red
  } else if (warning.length > 0) {
    doc.setTextColor(245, 158, 11); // Amber
  } else {
    doc.setTextColor(16, 185, 129); // Green
  }
  doc.text(statusLabel, pageWidth - margin - 6, cursorY + 20, { align: 'right' });

  cursorY += 31;

  // --- SECTION 1: IDENTIFICACAO DO VEICULO E RESUMO DA FROTA ---
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DADOS DO CAVALO MECANICO E HODOMETRO AFERIDO', margin + 4, cursorY + 4.5);
  cursorY += 9;

  // Info Grid Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cursorY, contentWidth, 23, 1, 1, 'FD');

  const col1 = margin + 4;
  const col2 = margin + contentWidth * 0.52;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Veiculo / Modelo:', col1, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(vehicleModel, col1 + 28, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Placa Identificadora:', col1, cursorY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(vehiclePlate, col1 + 28, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Hodometro Atual:', col1, cursorY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(formatOdometer(currentOdometer), col1 + 28, cursorY + 17);

  // Col 2
  const driverName = currentUser?.name || 'Condutor / Gestor Autonomo';
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Motorista / Gestor:', col2, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(driverName, col2 + 32, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Perfil no Sistema:', col2, cursorY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(currentUser?.role ? currentUser.role.toUpperCase() : 'MOTORISTA AUTONOMO', col2 + 32, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Provisao Estimada:', col2, cursorY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Red
  doc.text(formatCurrency(pendingCost), col2 + 32, cursorY + 17);

  cursorY += 27;

  // KPI Highlights Bar
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, cursorY, contentWidth, 14, 1.5, 1.5, 'F');

  const cardW = contentWidth / 4;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);

  // KPI 1: Total
  doc.text('ITENS MONITORADOS', margin + cardW * 0 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(96, 165, 250); // Blue
  doc.text(`${maintenanceItems.length} Pecas`, margin + cardW * 0 + cardW / 2, cursorY + 10.5, { align: 'center' });

  // KPI 2: Vencidos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TROCAS VENCIDAS', margin + cardW * 1 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(248, 113, 113); // Red
  doc.text(`${urgent.length} Itens`, margin + cardW * 1 + cardW / 2, cursorY + 10.5, { align: 'center' });

  // KPI 3: Em Alerta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('ALERTA PROXIMO (< 3.000 KM)', margin + cardW * 2 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 185, 95); // Amber
  doc.text(`${warning.length} Itens`, margin + cardW * 2 + cardW / 2, cursorY + 10.5, { align: 'center' });

  // KPI 4: Em Dia
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('ITENS EM CONFORMIDADE', margin + cardW * 3 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153); // Emerald
  doc.text(`${ok.length} Itens`, margin + cardW * 3 + cardW / 2, cursorY + 10.5, { align: 'center' });

  cursorY += 19;

  // --- SECTION 2: HISTÓRICO DE MANUTENÇÕES REALIZADAS ---
  addPageIfNeeded(35);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. HISTORICO DE MANUTENCOES E ULTIMAS REVISOES REALIZADAS', margin + 4, cursorY + 4.5);
  cursorY += 9;

  // Table Header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, cursorY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text('COMPONENTE / SISTEMA', margin + 3, cursorY + 4);
  doc.text('DESCRICAO DO ITEM / REVISAO', margin + 45, cursorY + 4);
  doc.text('ULTIMA TROCA (KM)', margin + 110, cursorY + 4);
  doc.text('INTERVALO', margin + 142, cursorY + 4);
  doc.text('ESPECIFICACAO / PECA', margin + contentWidth - 3, cursorY + 4, { align: 'right' });
  cursorY += 6;

  maintenanceItems.forEach((item, index) => {
    addPageIfNeeded(6.5);
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY + 6, margin + contentWidth, cursorY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const compLabel = componentLabels[item.component] || item.component;
    doc.text(compLabel, margin + 3, cursorY + 4);

    const title = item.title.length > 34 ? item.title.substring(0, 32) + '...' : item.title;
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 45, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(formatOdometer(item.lastDoneKm), margin + 110, cursorY + 4);
    doc.text(`A cada ${formatKm(item.intervalKm)}`, margin + 142, cursorY + 4);

    const part = item.recommendedPart ? (item.recommendedPart.length > 24 ? item.recommendedPart.substring(0, 22) + '...' : item.recommendedPart) : '-';
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(part, margin + contentWidth - 3, cursorY + 4, { align: 'right' });

    cursorY += 6;
  });

  cursorY += 8;

  // --- SECTION 3: CRONOGRAMA DAS PRÓXIMAS MANUTENÇÕES ---
  addPageIfNeeded(35);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. CRONOGRAMA DAS PROXIMAS REVISOES E SITUACAO NO HODOMETRO', margin + 4, cursorY + 4.5);
  cursorY += 9;

  // Table Header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, cursorY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text('PECA / SERVICO', margin + 3, cursorY + 4);
  doc.text('PROXIMA TROCA', margin + 65, cursorY + 4);
  doc.text('SALDO / SITUACAO NO HODOMETRO', margin + 98, cursorY + 4);
  doc.text('URGENCIA', margin + 148, cursorY + 4);
  doc.text('ESTIMADO (R$)', margin + contentWidth - 3, cursorY + 4, { align: 'right' });
  cursorY += 6;

  // Sort: most urgent first
  const sortedSchedule = [...maintenanceItems].sort((a, b) => {
    const diffA = a.nextDueKm - currentOdometer;
    const diffB = b.nextDueKm - currentOdometer;
    return diffA - diffB;
  });

  sortedSchedule.forEach((item, index) => {
    addPageIfNeeded(6.5);
    const kmRemaining = item.nextDueKm - currentOdometer;
    const isOverdue = kmRemaining <= 0;
    const isWarning = !isOverdue && kmRemaining <= 3000;

    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY + 6, margin + contentWidth, cursorY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const title = item.title.length > 32 ? item.title.substring(0, 30) + '...' : item.title;
    doc.text(title, margin + 3, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.text(formatOdometer(item.nextDueKm), margin + 65, cursorY + 4);

    if (isOverdue) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38);
      doc.text(`VENCIDO ha ${formatKm(Math.abs(kmRemaining))}`, margin + 98, cursorY + 4);
    } else if (isWarning) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6); // Amber
      doc.text(`Faltam ${formatKm(kmRemaining)} (Revisar)`, margin + 98, cursorY + 4);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`Faltam ${formatKm(kmRemaining)} (Em dia)`, margin + 98, cursorY + 4);
    }

    // Urgency tag
    doc.setFont('helvetica', 'bold');
    if (isOverdue) {
      doc.setTextColor(220, 38, 38);
      doc.text('CRITICA', margin + 148, cursorY + 4);
    } else if (isWarning) {
      doc.setTextColor(217, 119, 6);
      doc.text('ATENCAO', margin + 148, cursorY + 4);
    } else {
      doc.setTextColor(5, 150, 105);
      doc.text('EM DIA', margin + 148, cursorY + 4);
    }

    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(item.estimatedCost), margin + contentWidth - 3, cursorY + 4, { align: 'right' });

    cursorY += 6;
  });

  cursorY += 8;

  // --- SECTION 4: ENCERRAMENTO E ASSINATURAS ---
  addPageIfNeeded(32);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  const signWidth = 72;
  const signY = cursorY + 16;

  // Driver signature
  doc.line(margin + 10, signY, margin + 10 + signWidth, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ASSINATURA DO MOTORISTA / CONDUTOR', margin + 10 + signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(driverName, margin + 10 + signWidth / 2, signY + 8, { align: 'center' });

  // Workshop / Inspector signature
  doc.line(pageWidth - margin - 10 - signWidth, signY, pageWidth - margin - 10, signY);
  doc.setFont('helvetica', 'normal');
  doc.text('OFICINA MECANICA / GESTAO DA FROTA', pageWidth - margin - 10 - signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSAVEL TECNICO / LAUDO', pageWidth - margin - 10 - signWidth / 2, signY + 8, { align: 'center' });

  // Footer Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Documento emitido eletronicamente pelo aplicativo Cabine Operacional. Controle de manutenções preventivas conforme normas da ANTT e fabricantes.',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // File Name
  const dateStr = now.toISOString().split('T')[0];
  const fileName = `Relatorio_Manutencao_${cleanPlate}_${dateStr}.pdf`;

  // Download
  doc.save(fileName);
}
