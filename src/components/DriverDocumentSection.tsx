import React, { useState, useMemo } from 'react';
import {
  DriverDocumentReminder,
  DriverDocumentType,
  DriverDocumentStatus,
  User,
} from '../types/cockpit';
import {
  calculateDaysRemaining,
  getDocumentStatus,
  formatBrazilianDate,
  getSuggestedRenewalDate,
  saveDriverDocuments,
} from '../services/driverDocumentService';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Sparkles,
  Info,
  BadgeAlert,
  FileCheck,
  Award,
  FlaskConical,
  CreditCard,
  Building2,
  X,
  Check,
} from 'lucide-react';

interface DriverDocumentSectionProps {
  documents: DriverDocumentReminder[];
  onUpdateDocuments: (docs: DriverDocumentReminder[]) => void;
  currentUser?: User | null;
}

export const DriverDocumentSection: React.FC<DriverDocumentSectionProps> = ({
  documents,
  onUpdateDocuments,
  currentUser,
}) => {
  // Feedback Notice
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState<string>('todos');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DriverDocumentReminder | null>(null);
  const [renewingDoc, setRenewingDoc] = useState<DriverDocumentReminder | null>(null);
  const [newRenewalDate, setNewRenewalDate] = useState<string>('');
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formType, setFormType] = useState<DriverDocumentType>('toxicologico');
  const [formTitle, setFormTitle] = useState('');
  const [formDocNumber, setFormDocNumber] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formIssueDate, setFormIssueDate] = useState('');
  const [formAlertDays, setFormAlertDays] = useState('30');
  const [formIssuer, setFormIssuer] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Document Metrics
  const { validCount, warningCount, expiredCount, categorizedDocs } = useMemo(() => {
    let valid = 0;
    let warning = 0;
    let expired = 0;

    const analyzed = documents.map((doc) => {
      const days = calculateDaysRemaining(doc.dueDate);
      const status = getDocumentStatus(doc.dueDate, doc.alertDaysThreshold);

      if (status === 'valido') valid++;
      else if (status === 'alerta') warning++;
      else if (status === 'vencido') expired++;

      return {
        ...doc,
        daysRemaining: days,
        computedStatus: status,
      };
    });

    // Sort: expired first, then warning (closest due date), then valid
    analyzed.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      validCount: valid,
      warningCount: warning,
      expiredCount: expired,
      categorizedDocs: analyzed,
    };
  }, [documents]);

  // Filtered documents list
  const displayedDocs = useMemo(() => {
    if (filterType === 'todos') return categorizedDocs;
    if (filterType === 'urgentes') {
      return categorizedDocs.filter((d) => d.computedStatus !== 'valido');
    }
    return categorizedDocs.filter((d) => d.type === filterType);
  }, [categorizedDocs, filterType]);

  // Open Add Modal with sensible defaults based on document type
  const handleOpenAddModal = (defaultType: DriverDocumentType = 'toxicologico') => {
    playCockpitClick();
    setFormType(defaultType);
    setFormDueDate('');
    setFormIssueDate('');
    setFormDocNumber('');
    setFormIssuer('');
    setFormNotes('');

    if (defaultType === 'toxicologico') {
      setFormTitle('Exame Toxicológico Periódico');
      setFormCategory('Janela de 2 anos e meio (CTB Art. 148-A)');
      setFormAlertDays('30');
      setFormIssuer('Laboratório Credenciado SENATRAN');
    } else if (defaultType === 'cnh') {
      setFormTitle('CNH - Carteira Nacional de Habilitação');
      setFormCategory('Categoria E (Atividade Remunerada)');
      setFormAlertDays('60');
      setFormIssuer('DETRAN');
    } else if (defaultType === 'ear') {
      setFormTitle('EAR - Exerce Atividade Remunerada');
      setFormCategory('Averbação na CNH para transporte profissional');
      setFormAlertDays('30');
      setFormIssuer('DETRAN / SENATRAN');
    } else {
      setFormTitle('');
      setFormCategory('');
      setFormAlertDays('30');
    }

    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (doc: DriverDocumentReminder) => {
    playCockpitClick();
    setEditingDoc(doc);
    setFormType(doc.type);
    setFormTitle(doc.title);
    setFormDocNumber(doc.documentNumber || '');
    setFormCategory(doc.categoryOrDetails || '');
    setFormDueDate(doc.dueDate);
    setFormIssueDate(doc.issueDate || '');
    setFormAlertDays(String(doc.alertDaysThreshold || 30));
    setFormIssuer(doc.laboratoryOrIssuer || '');
    setFormNotes(doc.notes || '');
  };

  // Open Quick Renewal Modal
  const handleOpenRenewalModal = (doc: DriverDocumentReminder) => {
    playCockpitClick();
    setRenewingDoc(doc);
    const suggested = getSuggestedRenewalDate(doc.type, doc.dueDate);
    setNewRenewalDate(suggested);
  };

  // Handle Type Change in Add Modal
  const handleTypeSelectChange = (newType: DriverDocumentType) => {
    setFormType(newType);
    if (newType === 'toxicologico') {
      setFormTitle('Exame Toxicológico Periódico');
      setFormCategory('Janela Obrigatória de 30 meses (CTB Art. 148-A)');
      setFormAlertDays('30');
      setFormIssuer('Laboratório Credenciado SENATRAN');
    } else if (newType === 'cnh') {
      setFormTitle('CNH - Carteira Nacional de Habilitação');
      setFormCategory('Categoria C, D ou E');
      setFormAlertDays('60');
      setFormIssuer('DETRAN');
    } else if (newType === 'ear') {
      setFormTitle('EAR - Exerce Atividade Remunerada');
      setFormCategory('Averbação na CNH');
      setFormAlertDays('30');
      setFormIssuer('DETRAN');
    } else if (newType === 'crlv_veiculo') {
      setFormTitle('CRLV-e Licenciamento do Veículo');
      setFormCategory('Licenciamento Anual DETRAN');
      setFormAlertDays('60');
      setFormIssuer('DETRAN');
    } else if (newType === 'cronotacografo') {
      setFormTitle('Certificado de Cronotacógrafo');
      setFormCategory('Verificação Metrológica Bienal INMETRO');
      setFormAlertDays('30');
      setFormIssuer('Posto Autorizado INMETRO');
    }
  };

  // Save new document
  const handleSaveNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDueDate) {
      playAlertBeep();
      setActionNotice('Preencha ao menos o título e a data de vencimento.');
      return;
    }

    const newDoc: DriverDocumentReminder = {
      id: `doc-${Date.now()}`,
      type: formType,
      title: formTitle,
      documentNumber: formDocNumber || undefined,
      categoryOrDetails: formCategory || undefined,
      dueDate: formDueDate,
      issueDate: formIssueDate || undefined,
      alertDaysThreshold: parseInt(formAlertDays, 10) || 30,
      driverName: currentUser?.name || 'Ricardo Pinheiro',
      laboratoryOrIssuer: formIssuer || undefined,
      notes: formNotes || undefined,
    };

    const updated = [...documents, newDoc];
    onUpdateDocuments(updated);
    saveDriverDocuments(updated);
    playSuccessChime();
    setIsAddModalOpen(false);
    setActionNotice(`Documento "${formTitle}" cadastrado com sucesso.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Save edited document
  const handleSaveEditDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || !formTitle || !formDueDate) return;

    const updated = documents.map((d) => {
      if (d.id === editingDoc.id) {
        return {
          ...d,
          type: formType,
          title: formTitle,
          documentNumber: formDocNumber || undefined,
          categoryOrDetails: formCategory || undefined,
          dueDate: formDueDate,
          issueDate: formIssueDate || undefined,
          alertDaysThreshold: parseInt(formAlertDays, 10) || 30,
          laboratoryOrIssuer: formIssuer || undefined,
          notes: formNotes || undefined,
        };
      }
      return d;
    });

    onUpdateDocuments(updated);
    saveDriverDocuments(updated);
    playSuccessChime();
    setEditingDoc(null);
    setActionNotice(`Documento "${formTitle}" atualizado com sucesso.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Confirm Renewal
  const handleConfirmRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingDoc || !newRenewalDate) return;

    const todayStr = new Date().toISOString().split('T')[0];

    const updated = documents.map((d) => {
      if (d.id === renewingDoc.id) {
        return {
          ...d,
          issueDate: todayStr,
          dueDate: newRenewalDate,
          lastRenewedAt: todayStr,
        };
      }
      return d;
    });

    onUpdateDocuments(updated);
    saveDriverDocuments(updated);
    playSuccessChime();
    setRenewingDoc(null);
    setActionNotice(
      `Renovação de "${renewingDoc.title}" registrada com sucesso! Novo vencimento: ${formatBrazilianDate(newRenewalDate)}.`
    );
    setTimeout(() => setActionNotice(null), 6000);
  };

  // Delete Document (inline confirmation, iframe-safe)
  const handleDeleteDoc = (id: string, title: string) => {
    const updated = documents.filter((d) => d.id !== id);
    onUpdateDocuments(updated);
    saveDriverDocuments(updated);
    playSuccessChime();
    setConfirmDeleteDocId(null);
    setActionNotice(`Documento "${title}" excluído.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Helper for document icon
  const getDocumentIcon = (type: DriverDocumentType) => {
    switch (type) {
      case 'cnh':
        return <Award className="w-5 h-5 text-[#f59e0b]" />;
      case 'ear':
        return <ShieldCheck className="w-5 h-5 text-[#10b981]" />;
      case 'toxicologico':
        return <FlaskConical className="w-5 h-5 text-[#ec4899]" />;
      case 'cronotacografo':
        return <Clock className="w-5 h-5 text-[#38bdf8]" />;
      case 'crlv_veiculo':
        return <CreditCard className="w-5 h-5 text-[#a855f7]" />;
      case 'mopp':
      case 'rntrc_antt':
      case 'outros':
      default:
        return <FileText className="w-5 h-5 text-[#94a3b8]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3 bg-[#081425] border-l-4 border-[#10b981] rounded-r-xl text-xs text-[#34d399] flex items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-[#94a3b8] hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards Grid for Documents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#0f172a] border border-[#334155] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Total Monitorado
            </span>
            <FileCheck className="w-4 h-4 text-[#60a5fa]" />
          </div>
          <div className="text-2xl font-black text-[#f8fafc] mt-1 font-mono">
            {documents.length}
          </div>
          <div className="text-[11px] text-[#94a3b8] mt-0.5">CNH, EAR, Toxicológico e Veículo</div>
        </div>

        <div className="p-4 rounded-xl bg-[#002b1c] border border-[#10b981]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#34d399]">
              Em Dia / Válidos
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-2xl font-black text-[#10b981] mt-1 font-mono">
            {validCount}
          </div>
          <div className="text-[11px] text-[#4edea3] mt-0.5">Regularizados perante órgãos</div>
        </div>

        <div className="p-4 rounded-xl bg-[#3f2500] border border-[#f59e0b]/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#ffb95f]">
              A Vencer / Atenção
            </span>
            <AlertTriangle className="w-4 h-4 text-[#f59e0b] animate-bounce" />
          </div>
          <div className="text-2xl font-black text-[#ffb95f] mt-1 font-mono">
            {warningCount}
          </div>
          <div className="text-[11px] text-[#ffd699] mt-0.5">Vencendo nos próximos 30/60 dias</div>
        </div>

        <div className="p-4 rounded-xl bg-[#450a0a] border border-[#ef4444]/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#fca5a5]">
              Vencidos / Críticos
            </span>
            <BadgeAlert className="w-4 h-4 text-[#ef4444] animate-pulse" />
          </div>
          <div className="text-2xl font-black text-[#fca5a5] mt-1 font-mono">
            {expiredCount}
          </div>
          <div className="text-[11px] text-[#fca5a5] mt-0.5">Risco de multas e retenção</div>
        </div>
      </div>

      {/* Legal & Regulatory High-Priority Alert Banner (When Toxicologico or CNH is in alert) */}
      {warningCount + expiredCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#3f2500]/90 via-[#450a0a]/90 to-[#2e1065]/90 border-2 border-[#f59e0b] shadow-xl text-white space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#ffb95f] animate-pulse shrink-0" />
            <h4 className="font-extrabold text-sm sm:text-base text-[#ffb95f]">
              Atenção com Prazos Regulatórios de Habilitação & Saúde Ocupacional
            </h4>
          </div>
          <p className="text-xs text-[#fed7aa] leading-relaxed">
            De acordo com o <strong>Art. 148-A do Código de Trânsito Brasileiro (CTB)</strong> e Resolução CONTRAN 922/2022, motoristas profissionais das categorias C, D e E devem realizar o <strong>exame toxicológico periódico a cada 2 anos e 6 meses</strong>. Conduzir veículo após 30 dias do vencimento constitui infração <strong>gravíssima (multa de R$ 1.467,35 com fator multiplicador 5x e suspensão do direito de dirigir por 3 meses)</strong>.
          </p>
        </div>
      )}

      {/* Action Toolbar & Filters */}
      <div className="p-4 bg-[#152031] border border-[#334155] rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mr-1">
            Filtrar:
          </span>
          <button
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'todos'
                ? 'bg-[#f59e0b] text-[#0f172a]'
                : 'bg-[#0f172a] text-[#bec6e0] hover:text-white border border-[#334155]'
            }`}
          >
            Todos ({documents.length})
          </button>
          <button
            onClick={() => setFilterType('urgentes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'urgentes'
                ? 'bg-[#ef4444] text-white'
                : 'bg-[#0f172a] text-[#bec6e0] hover:text-white border border-[#334155]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#ffb95f]" />
            Atenção & Vencidos ({warningCount + expiredCount})
          </button>
          <button
            onClick={() => setFilterType('toxicologico')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'toxicologico'
                ? 'bg-[#ec4899] text-white'
                : 'bg-[#0f172a] text-[#bec6e0] hover:text-white border border-[#334155]'
            }`}
          >
            Toxicológico
          </button>
          <button
            onClick={() => setFilterType('cnh')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'cnh'
                ? 'bg-[#3b82f6] text-white'
                : 'bg-[#0f172a] text-[#bec6e0] hover:text-white border border-[#334155]'
            }`}
          >
            CNH & EAR
          </button>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('toxicologico')}
            className="h-10 px-3.5 rounded-xl bg-[#ec4899] hover:bg-[#db2777] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-pink-900/30 cursor-pointer transition-all active:scale-95"
            title="Adicionar ou registrar novo exame toxicológico"
          >
            <FlaskConical className="w-4 h-4" />
            <span>+ Toxicológico</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('cnh')}
            className="h-10 px-3.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
            title="Adicionar novo lembrete de documento regulatório"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Documento</span>
          </button>
        </div>
      </div>

      {/* Document Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {displayedDocs.map((item) => {
          const isExpired = item.computedStatus === 'vencido';
          const isWarning = item.computedStatus === 'alerta';
          const isValid = item.computedStatus === 'valido';

          return (
            <div
              key={item.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isExpired
                  ? 'bg-gradient-to-b from-[#450a0a] to-[#1f0505] border-[#ef4444] shadow-lg shadow-red-950/40'
                  : isWarning
                  ? 'bg-gradient-to-b from-[#3a2000] to-[#181005] border-[#f59e0b] shadow-lg shadow-amber-950/30'
                  : 'bg-gradient-to-b from-[#152031] to-[#0f172a] border-[#334155] hover:border-[#38bdf8]/50'
              }`}
            >
              {/* Background ambient radial light */}
              <div
                className={`absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none opacity-20 blur-xl ${
                  isExpired ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />

              <div className="relative z-10 space-y-3">
                {/* Header: Icon, Type & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isExpired
                          ? 'bg-[#690005] border-[#ef4444] text-[#ffb4ab]'
                          : isWarning
                          ? 'bg-[#472a00] border-[#f59e0b] text-[#ffb95f]'
                          : 'bg-[#081425] border-[#334155] text-[#38bdf8]'
                      }`}
                    >
                      {getDocumentIcon(item.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        {item.type === 'toxicologico'
                          ? 'Exame Laboratorial'
                          : item.type === 'cnh'
                          ? 'Habilitação Profissional'
                          : item.type === 'ear'
                          ? 'Averbação Remunerada'
                          : item.type === 'cronotacografo'
                          ? 'Ensaio Metrológico'
                          : item.type === 'crlv_veiculo'
                          ? 'Veículo / Frota'
                          : 'Documento'}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#f8fafc] leading-tight line-clamp-1">
                        {item.title}
                      </h4>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div>
                    {isExpired ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#ef4444] text-white flex items-center gap-1 shadow-xs animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-white" />
                        VENCIDO
                      </span>
                    ) : isWarning ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#f59e0b] text-[#0f172a] flex items-center gap-1 shadow-xs">
                        <Clock className="w-3 h-3 text-[#0f172a]" />
                        A VENCER
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#003824] text-[#34d399] border border-[#10b981]/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#34d399]" />
                        VÁLIDO
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtitle / Details / Number */}
                <div className="space-y-1 text-xs">
                  {item.categoryOrDetails && (
                    <div className="text-[#bec6e0] font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                      <span>{item.categoryOrDetails}</span>
                    </div>
                  )}

                  {item.documentNumber && (
                    <div className="text-[#94a3b8] font-mono text-[11px]">
                      Nº: <strong className="text-[#d8e3fb]">{item.documentNumber}</strong>
                    </div>
                  )}

                  {item.laboratoryOrIssuer && (
                    <div className="text-[#94a3b8] text-[11px] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#64748b]" />
                      <span className="truncate">{item.laboratoryOrIssuer}</span>
                    </div>
                  )}
                </div>

                {/* Due Date & Countdown Box */}
                <div
                  className={`p-3 rounded-xl border ${
                    isExpired
                      ? 'bg-[#5c0b0b]/70 border-[#ef4444]/60'
                      : isWarning
                      ? 'bg-[#472a00]/70 border-[#f59e0b]/60'
                      : 'bg-[#081425] border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94a3b8] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#f59e0b]" />
                      Vencimento:
                    </span>
                    <span className="font-mono font-extrabold text-[#f8fafc] text-sm">
                      {formatBrazilianDate(item.dueDate)}
                    </span>
                  </div>

                  {/* Countdown Text */}
                  <div className="mt-1 pt-1 border-t border-[#334155]/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-[#94a3b8]">Prazo Legal:</span>
                    {isExpired ? (
                      <span className="text-[#ffb4ab] font-extrabold animate-pulse">
                        Vencido há {Math.abs(item.daysRemaining)} dias
                      </span>
                    ) : item.daysRemaining === 0 ? (
                      <span className="text-[#f59e0b] font-extrabold">VENCE HOJE!</span>
                    ) : (
                      <span
                        className={`font-extrabold ${
                          isWarning ? 'text-[#ffb95f]' : 'text-[#34d399]'
                        }`}
                      >
                        Faltam {item.daysRemaining} dias
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes / Legal Penalty Advice */}
                {item.notes && (
                  <p className="text-[11px] text-[#94a3b8] italic bg-[#081425]/50 p-2 rounded-lg border border-[#334155]/40 leading-snug">
                    {item.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons: Renovar, Editar, Excluir */}
              <div className="pt-3 mt-3 border-t border-[#334155]/60 flex items-center justify-between gap-2 relative z-10">
                <button
                  onClick={() => handleOpenRenewalModal(item)}
                  className="flex-1 h-9 px-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95"
                  title="Registrar renovação com cálculo automático de novo ciclo legal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Renovar</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(item)}
                  className="h-9 px-2.5 rounded-lg bg-[#081425] hover:bg-[#1e293b] border border-[#334155] text-xs font-bold text-[#bec6e0] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Editar datas e informações do documento"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#ffb95f]" />
                  <span>Editar</span>
                </button>

                {confirmDeleteDocId === item.id ? (
                  <div className="flex items-center gap-1 bg-[#450a0a] border border-[#ef4444]/60 rounded-lg px-2 h-9">
                    <span className="text-[10px] font-bold text-[#fca5a5]">Excluir?</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(item.id, item.title)}
                      className="px-2 py-0.5 rounded bg-[#ef4444] text-white text-[10px] font-black cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setConfirmDeleteDocId(null);
                      }}
                      className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[#cbd5e1] text-[10px] font-bold cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playAlertBeep();
                      setConfirmDeleteDocId(item.id);
                    }}
                    className="h-9 w-9 rounded-lg bg-[#081425] hover:bg-[#690005] border border-[#334155] hover:border-[#ef4444] text-[#94a3b8] hover:text-[#ffb4ab] flex items-center justify-center transition-colors cursor-pointer"
                    title="Excluir lembrete de documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADICIONAR DOCUMENTO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#ec4899]/20 border border-[#ec4899]/50 flex items-center justify-center text-[#ec4899]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#f8fafc]">
                    Novo Lembrete de Documentação
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Acompanhe CNH, EAR, Exames Toxicológicos e documentos veiculares
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#1e293b] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDoc} className="space-y-3.5 text-xs">
              {/* Tipo de Documento */}
              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Tipo de Documento:
                </label>
                <select
                  value={formType}
                  onChange={(e) => handleTypeSelectChange(e.target.value as DriverDocumentType)}
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] font-semibold outline-hidden"
                >
                  <option value="toxicologico">Exame Toxicológico Periódico (CTB Art. 148-A)</option>
                  <option value="cnh">CNH - Carteira Nacional de Habilitação</option>
                  <option value="ear">EAR - Exerce Atividade Remunerada</option>
                  <option value="crlv_veiculo">CRLV-e Licenciamento do Veículo</option>
                  <option value="cronotacografo">Certificado de Cronotacógrafo (INMETRO)</option>
                  <option value="mopp">MOPP - Movimentação Operacional de Produtos Perigosos</option>
                  <option value="rntrc_antt">RNTRC / ANTT</option>
                  <option value="outros">Outros Documentos / Laudos</option>
                </select>
              </div>

              {/* Título do Documento */}
              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Título do Documento:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Exame Toxicológico Periódico"
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                />
              </div>

              {/* Grid: Nº do Documento e Categoria/Detalhes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#bec6e0] mb-1">
                    Nº de Registro / Laudo:
                  </label>
                  <input
                    type="text"
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    placeholder="Ex: TOX-2024-998"
                    className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#bec6e0] mb-1">
                    Categoria ou Detalhes:
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex: Categoria E / 30 meses"
                    className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                  />
                </div>
              </div>

              {/* Grid: Data de Emissão e Data de Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#bec6e0] mb-1">
                    Data de Emissão / Coleta:
                  </label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#ffb95f] mb-1">
                    Data de Vencimento *:
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#081425] border border-[#f59e0b] rounded-xl text-[#ffb95f] font-mono font-bold outline-hidden"
                  />
                </div>
              </div>

              {/* Órgão Emissor / Laboratório Credenciado */}
              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Laboratório ou Órgão Emissor:
                </label>
                <input
                  type="text"
                  value={formIssuer}
                  onChange={(e) => setFormIssuer(e.target.value)}
                  placeholder="Ex: Laboratório Toxicológico Credenciado / DETRAN-SP"
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                />
              </div>

              {/* Dias de Alerta de Antecedência */}
              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Alertar com quantos dias de antecedência?
                </label>
                <select
                  value={formAlertDays}
                  onChange={(e) => setFormAlertDays(e.target.value)}
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                >
                  <option value="15">15 dias antes</option>
                  <option value="30">30 dias antes (Recomendado para Toxicológico)</option>
                  <option value="45">45 dias antes</option>
                  <option value="60">60 dias antes (Recomendado para CNH)</option>
                  <option value="90">90 dias antes</option>
                </select>
              </div>

              {/* Observações / Notas */}
              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Observações e Informações Legais:
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Tolerância de 30 dias. Multa gravíssima em fiscalização da PRF se dirigir vencido."
                  className="w-full p-2.5 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 px-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-xs font-bold text-[#bec6e0] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Salvar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR DOCUMENTO */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0f172a] border border-[#334155] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/20 border border-[#38bdf8]/50 flex items-center justify-center text-[#38bdf8]">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#f8fafc]">
                    Editar Lembrete de Documento
                  </h3>
                  <p className="text-xs text-[#94a3b8]">{editingDoc.title}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="w-8 h-8 rounded-lg bg-[#1e293b] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDoc} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Título do Documento:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#bec6e0] mb-1">
                    Nº de Registro / Laudo:
                  </label>
                  <input
                    type="text"
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#bec6e0] mb-1">
                    Categoria ou Detalhes:
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#bec6e0] mb-1">
                    Data de Emissão / Coleta:
                  </label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#ffb95f] mb-1">
                    Data de Vencimento *:
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#081425] border border-[#f59e0b] rounded-xl text-[#ffb95f] font-mono font-bold outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Laboratório ou Órgão Emissor:
                </label>
                <input
                  type="text"
                  value={formIssuer}
                  onChange={(e) => setFormIssuer(e.target.value)}
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Alertar com quantos dias de antecedência?
                </label>
                <select
                  value={formAlertDays}
                  onChange={(e) => setFormAlertDays(e.target.value)}
                  className="w-full h-10 px-3 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden"
                >
                  <option value="15">15 dias antes</option>
                  <option value="30">30 dias antes</option>
                  <option value="45">45 dias antes</option>
                  <option value="60">60 dias antes</option>
                  <option value="90">90 dias antes</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#bec6e0] mb-1">
                  Observações e Informações Legais:
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl text-[#f8fafc] outline-hidden text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="h-10 px-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-xs font-bold text-[#bec6e0] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a] text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Atualizar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RENOVAÇÃO RÁPIDA (CÁLCULO AUTOMÁTICO DE NOVO CICLO LEGAL) */}
      {renewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-md bg-[#0f172a] border-2 border-[#10b981] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#10b981]/20 border border-[#10b981] flex items-center justify-center text-[#10b981]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#f8fafc]">
                    Registrar Renovação do Documento
                  </h3>
                  <p className="text-xs text-[#34d399] font-semibold">{renewingDoc.title}</p>
                </div>
              </div>
              <button
                onClick={() => setRenewingDoc(null)}
                className="w-8 h-8 rounded-lg bg-[#1e293b] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRenewal} className="space-y-4 text-xs">
              <div className="p-3 bg-[#081425] rounded-xl border border-[#334155] space-y-1.5">
                <div className="text-[#bec6e0]">
                  Documento:{' '}
                  <strong className="text-[#f8fafc]">{renewingDoc.title}</strong>
                </div>
                <div className="text-[#94a3b8]">
                  Vencimento Anterior:{' '}
                  <span className="font-mono text-[#ffb95f]">
                    {formatBrazilianDate(renewingDoc.dueDate)}
                  </span>
                </div>
                {renewingDoc.type === 'toxicologico' && (
                  <div className="text-[#ec4899] font-semibold pt-1 border-t border-[#334155]/60 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ciclo legal sugerido: +30 meses (2 anos e 6 meses)
                  </div>
                )}
                {renewingDoc.type === 'cnh' && (
                  <div className="text-[#38bdf8] font-semibold pt-1 border-t border-[#334155]/60 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ciclo legal sugerido: +5 anos (DETRAN)
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#34d399] mb-1.5 text-sm">
                  Nova Data de Validade / Vencimento:
                </label>
                <input
                  type="date"
                  required
                  value={newRenewalDate}
                  onChange={(e) => setNewRenewalDate(e.target.value)}
                  className="w-full h-11 px-3 bg-[#081425] border-2 border-[#10b981] rounded-xl text-base text-[#34d399] font-mono font-black outline-hidden"
                />
                <span className="text-[11px] text-[#94a3b8] mt-1 block">
                  Você pode ajustar manualmente caso o DETRAN ou laboratório tenha emitido com validade diferente.
                </span>
              </div>

              <div className="pt-3 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRenewingDoc(null)}
                  className="h-10 px-4 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-xs font-bold text-[#bec6e0] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Confirmar Renovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
