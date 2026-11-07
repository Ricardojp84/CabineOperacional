import { jsPDF } from 'jspdf';
import { Trip, User } from '../types/cockpit';
import { formatCurrency, formatKm } from './formatters';

interface GeneratePdfOptions {
  trip: Trip;
  currentUser?: User | null;
}

export function generateTripPdf({ trip, currentUser }: GeneratePdfOptions): void {
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

  // --- HEADER ---
  // Header background box
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.roundedRect(margin, cursorY, contentWidth, 26, 2, 2, 'F');

  // Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CABINE OPERACIONAL - RELATORIO GERENCIAL E CONTABIL', margin + 6, cursorY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('DEMONSTRATIVO CONSOLIDADO DE VIAGEM, DESPESAS OPERACIONAIS E MARGEM DE LUCRO', margin + 6, cursorY + 14);

  // Metadata tags right-aligned
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const docCode = `DOC-${(trip.id || 'VIAGEM').slice(-6).toUpperCase()}-${now.getFullYear()}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(`PROTOCOLO: ${docCode}`, pageWidth - margin - 6, cursorY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Emissao: ${dateFormatted} as ${timeFormatted}`, pageWidth - margin - 6, cursorY + 14, { align: 'right' });
  doc.text(`Status: ${trip.isCompleted ? 'VIAGEM CONCLUIDA' : 'VIAGEM EM ANDAMENTO'}`, pageWidth - margin - 6, cursorY + 20, { align: 'right' });

  cursorY += 31;

  // --- SECTION 1: DADOS DO TRANSPORTE E MOTORISTA ---
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DADOS GERAIS DO TRANSPORTE E DA ROTA', margin + 4, cursorY + 4.5);
  cursorY += 9;

  // Info Grid Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, cursorY, contentWidth, 25, 1, 1, 'FD');

  const col1 = margin + 4;
  const col2 = margin + contentWidth * 0.52;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Origem ➔ Destino:', col1, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${trip.origin} ➔ ${trip.destination}`, col1 + 30, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Veiculo / Placa:', col1, cursorY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${trip.vehicleModel} | Placa: ${trip.vehiclePlate} (${trip.axles} Eixos)`, col1 + 30, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Carga / Peso:', col1, cursorY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${trip.cargo} (${trip.cargoWeightTon} Toneladas)`, col1 + 30, cursorY + 17);

  // Col 2
  const driverName = currentUser?.name || 'Condutor Autonomo Cadastrado';
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Motorista / Responsavel:', col2, cursorY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(driverName, col2 + 38, cursorY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Distancia Percorrida:', col2, cursorY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatKm(trip.completedDistanceKm)} de ${formatKm(trip.totalDistanceKm)}`, col2 + 38, cursorY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Consumo Medio Aferido:', col2, cursorY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`${trip.actualConsumptionKmL.toFixed(2)} km/L (Meta: ${trip.targetConsumptionKmL.toFixed(2)} km/L)`, col2 + 38, cursorY + 17);

  cursorY += 30;

  // --- SECTION 2: DEMONSTRATIVO FINANCEIRO E MARGEM DE LUCRO ---
  // Calculate finances
  const fuelExpenses = trip.expenses.filter((e) => e.category === 'combustivel' || e.category === 'arla');
  const fuelTotal = fuelExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLiters = fuelExpenses.reduce((sum, e) => sum + (e.liters || 0), 0);

  const tollExpenses = trip.expenses.filter((e) => e.category === 'pedagio');
  const tollTotal = tollExpenses.reduce((sum, e) => sum + e.amount, 0);

  const foodExpenses = trip.expenses.filter((e) => e.category === 'alimentacao');
  const foodTotal = foodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const maintExpenses = trip.expenses.filter((e) => e.category === 'manutencao' || e.category === 'pneu_borracharia');
  const maintTotal = maintExpenses.reduce((sum, e) => sum + e.amount, 0);

  const otherExpenses = trip.expenses.filter(
    (e) => e.category !== 'combustivel' && e.category !== 'arla' && e.category !== 'pedagio' && e.category !== 'alimentacao' && e.category !== 'manutencao' && e.category !== 'pneu_borracharia'
  );
  const otherTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalDirectExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedWearCost = trip.completedDistanceKm * 0.85; // Provisao pneus e depreciacao
  const totalTripCost = totalDirectExpenses + estimatedWearCost;

  const netPocketProfit = trip.grossFreight - totalDirectExpenses;
  const realNetProfit = trip.grossFreight - totalTripCost;
  const netMarginPct = trip.grossFreight > 0 ? (realNetProfit / trip.grossFreight) * 100 : 0;
  const pocketMarginPct = trip.grossFreight > 0 ? (netPocketProfit / trip.grossFreight) * 100 : 0;
  const costPerKm = trip.completedDistanceKm > 0 ? totalDirectExpenses / trip.completedDistanceKm : 0;
  const profitPerKm = trip.completedDistanceKm > 0 ? realNetProfit / trip.completedDistanceKm : 0;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('2. BALANCO FINANCEIRO (DRE DO FRETE)', margin + 4, cursorY + 4.5);
  cursorY += 9;

  // Financial Table
  const rowHeight = 6;
  const drawFinancialRow = (label: string, value: string, isHeader = false, isHighlight = false, isNegative = false) => {
    if (isHeader) {
      doc.setFillColor(248, 250, 252);
    } else if (isHighlight) {
      doc.setFillColor(236, 253, 245); // Emerald-50
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, cursorY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, cursorY + rowHeight, margin + contentWidth, cursorY + rowHeight);

    doc.setFont('helvetica', isHeader || isHighlight ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(label, margin + 4, cursorY + 4.5);

    if (isNegative) {
      doc.setTextColor(220, 38, 38);
    } else if (isHighlight) {
      doc.setTextColor(5, 150, 105);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + contentWidth - 4, cursorY + 4.5, { align: 'right' });

    cursorY += rowHeight;
  };

  drawFinancialRow('(+) Frete Bruto Contratado', formatCurrency(trip.grossFreight), true);
  drawFinancialRow('   • Adiantamento Recebido (70%)', formatCurrency(trip.advancePayment));
  drawFinancialRow('   • Saldo a Receber na Descarga (30%)', formatCurrency(trip.balancePayment));
  drawFinancialRow('(-) Combustivel Diesel & Arla (' + totalLiters + ' Litros)', formatCurrency(fuelTotal), false, false, true);
  drawFinancialRow('(-) Pedagios Concessionarias', formatCurrency(tollTotal), false, false, true);
  drawFinancialRow('(-) Alimentacao e Pernoites', formatCurrency(foodTotal), false, false, true);
  drawFinancialRow('(-) Manutencao Emergencial / Borracharia', formatCurrency(maintTotal), false, false, true);
  if (otherTotal > 0) {
    drawFinancialRow('(-) Outras Despesas (Chapa, Descarga, Estacionamento)', formatCurrency(otherTotal), false, false, true);
  }
  drawFinancialRow('(=) Total de Despesas Diretas Pagas', formatCurrency(totalDirectExpenses), true, false, true);
  drawFinancialRow('(=) Sobra em Dinheiro no Bolso (Caixa Imediato)', `${formatCurrency(netPocketProfit)}  (${pocketMarginPct.toFixed(1)}% do frete)`, false, true);
  drawFinancialRow('(-) Provisao Tecnica de Desgaste de Pneus e Depreciacao (R$ 0,85/km)', formatCurrency(estimatedWearCost), false, false, true);
  drawFinancialRow('(=) LUCRO LIQUIDO REAL DA VIAGEM', `${formatCurrency(realNetProfit)}  (${netMarginPct.toFixed(1)}% MARGEM LIQUIDA)`, true, true);

  cursorY += 4;

  // KPI Highlights Cards
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, cursorY, contentWidth, 14, 1.5, 1.5, 'F');

  const cardW = contentWidth / 4;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);

  // KPI 1
  doc.text('MARGEM LIQUIDA REAL', margin + cardW * 0 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153);
  doc.text(`${netMarginPct.toFixed(1)}%`, margin + cardW * 0 + cardW / 2, cursorY + 10.5, { align: 'center' });

  // KPI 2
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('LUCRO REAL POR KM', margin + cardW * 1 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 185, 95);
  doc.text(`${formatCurrency(profitPerKm)}/km`, margin + cardW * 1 + cardW / 2, cursorY + 10.5, { align: 'center' });

  // KPI 3
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CUSTO DIRETO POR KM', margin + cardW * 2 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(248, 113, 113);
  doc.text(`${formatCurrency(costPerKm)}/km`, margin + cardW * 2 + cardW / 2, cursorY + 10.5, { align: 'center' });

  // KPI 4
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('SOBRA DIRETA NO BOLSO', margin + cardW * 3 + cardW / 2, cursorY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(96, 165, 250);
  doc.text(formatCurrency(netPocketProfit), margin + cardW * 3 + cardW / 2, cursorY + 10.5, { align: 'center' });

  cursorY += 19;

  // --- SECTION 3: COMPROVANTES E DISCRIMINAÇÃO DETALHADA ---
  addPageIfNeeded(35);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, cursorY, contentWidth, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. DISCRIMINACAO DE COMPROVANTES E GASTOS (${trip.expenses.length} LANCAMENTOS)`, margin + 4, cursorY + 4.5);
  cursorY += 9;

  // Table Header
  doc.setFillColor(226, 232, 240);
  doc.rect(margin, cursorY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text('DATA / HORA', margin + 3, cursorY + 4);
  doc.text('DESCRICAO / ESTABELECIMENTO', margin + 35, cursorY + 4);
  doc.text('CATEGORIA', margin + 105, cursorY + 4);
  doc.text('DOC / NF', margin + 138, cursorY + 4);
  doc.text('VALOR (R$)', margin + contentWidth - 3, cursorY + 4, { align: 'right' });
  cursorY += 6;

  // Expenses list (limit to 18 rows max on first pages, gracefully paginate)
  const categoryLabels: Record<string, string> = {
    combustivel: 'Combustivel',
    arla: 'Arla 32',
    pedagio: 'Pedagio',
    alimentacao: 'Alimentacao',
    manutencao: 'Manutencao',
    pneu_borracharia: 'Borracharia',
    estacionamento: 'Pernoite',
    chapa_descarga: 'Chapa/Descarga',
    outros: 'Outros Gastos',
  };

  trip.expenses.forEach((expense, index) => {
    addPageIfNeeded(6.5);
    const isEven = index % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, cursorY, contentWidth, 6, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, cursorY + 6, margin + contentWidth, cursorY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);

    const expenseDate = new Date(expense.date).toLocaleDateString('pt-BR');
    doc.text(expenseDate, margin + 3, cursorY + 4);

    const desc = expense.description.length > 36 ? expense.description.substring(0, 34) + '...' : expense.description;
    doc.text(desc, margin + 35, cursorY + 4);

    const catLabel = categoryLabels[expense.category] || expense.category;
    doc.text(catLabel, margin + 105, cursorY + 4);

    const invoice = expense.invoiceNumber ? `NF ${expense.invoiceNumber}` : (expense.paymentMethod || 'A vista');
    doc.text(invoice, margin + 138, cursorY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(expense.amount), margin + contentWidth - 3, cursorY + 4, { align: 'right' });

    cursorY += 6;
  });

  cursorY += 6;

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

  // Management / Accounting signature
  doc.line(pageWidth - margin - 10 - signWidth, signY, pageWidth - margin - 10, signY);
  doc.setFont('helvetica', 'normal');
  doc.text('GESTAO DE FROTAS / CONTABILIDADE', pageWidth - margin - 10 - signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('CONFERIDO E APROVADO', pageWidth - margin - 10 - signWidth / 2, signY + 8, { align: 'center' });

  // Footer Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Documento emitido eletronicamente pelo aplicativo Cabine Operacional. Todos os comprovantes fiscais encontram-se arquivados.',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // Generate File Name
  const cleanOrigin = trip.origin.split('-')[0].trim().replace(/\s+/g, '_');
  const cleanDest = trip.destination.split('-')[0].trim().replace(/\s+/g, '_');
  const cleanPlate = trip.vehiclePlate.replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `Relatorio_Viagem_${cleanPlate}_${cleanOrigin}_${cleanDest}.pdf`;

  // Save/Download
  doc.save(fileName);
}
