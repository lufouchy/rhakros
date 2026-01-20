import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeRecord {
  id: string;
  record_type: 'entry' | 'lunch_out' | 'lunch_in' | 'exit';
  recorded_at: string;
}

interface GeneratePDFParams {
  records: TimeRecord[];
  month: Date;
  employeeName: string;
  signatureData?: string | null;
}

const recordTypeLabel: Record<string, string> = {
  entry: 'Entrada',
  lunch_out: 'Saída Almoço',
  lunch_in: 'Volta Almoço',
  exit: 'Saída',
};

export const generateTimesheetPDF = ({ records, month, employeeName, signatureData }: GeneratePDFParams): jsPDF => {
  const doc = new jsPDF();
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ESPELHO DE PONTO', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Colaborador: ${employeeName}`, 14, 35);
  doc.text(`Período: ${format(startDate, "MMMM 'de' yyyy", { locale: ptBR })}`, 14, 42);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 49);

  // Prepare table data
  const tableData: (string | number)[][] = [];
  let totalWorkedMinutes = 0;
  let totalOvertimeMinutes = 0;
  const STANDARD_WORK_MINUTES = 8 * 60;

  days.forEach((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayRecords = records.filter((r) => r.recorded_at.startsWith(dayStr));
    
    const entry = dayRecords.find((r) => r.record_type === 'entry');
    const lunchOut = dayRecords.find((r) => r.record_type === 'lunch_out');
    const lunchIn = dayRecords.find((r) => r.record_type === 'lunch_in');
    const exit = dayRecords.find((r) => r.record_type === 'exit');

    let workedMinutes = 0;
    if (entry && lunchOut) {
      workedMinutes += differenceInMinutes(new Date(lunchOut.recorded_at), new Date(entry.recorded_at));
    }
    if (lunchIn && exit) {
      workedMinutes += differenceInMinutes(new Date(exit.recorded_at), new Date(lunchIn.recorded_at));
    }

    const overtime = Math.max(0, workedMinutes - STANDARD_WORK_MINUTES);
    totalWorkedMinutes += workedMinutes;
    totalOvertimeMinutes += overtime;

    const isWeekendDay = isWeekend(day);

    tableData.push([
      format(day, 'dd/MM (EEE)', { locale: ptBR }),
      entry ? format(new Date(entry.recorded_at), 'HH:mm') : '-',
      lunchOut ? format(new Date(lunchOut.recorded_at), 'HH:mm') : '-',
      lunchIn ? format(new Date(lunchIn.recorded_at), 'HH:mm') : '-',
      exit ? format(new Date(exit.recorded_at), 'HH:mm') : '-',
      workedMinutes > 0 ? formatMinutes(workedMinutes) : '-',
      overtime > 0 ? `+${formatMinutes(overtime)}` : '-',
      isWeekendDay ? 'FDS' : '',
    ]);
  });

  // Table
  autoTable(doc, {
    startY: 55,
    head: [['Data', 'Entrada', 'Saída Almoço', 'Volta Almoço', 'Saída', 'Trabalhado', 'H. Extra', 'Obs']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [219, 39, 119], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
    },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO DO PERÍODO', 14, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de horas trabalhadas: ${formatMinutes(totalWorkedMinutes)}`, 14, finalY + 7);
  doc.text(`Total de horas extras: ${formatMinutes(totalOvertimeMinutes)}`, 14, finalY + 14);

  // Signature
  if (signatureData) {
    const signatureY = finalY + 30;
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do colaborador:', 14, signatureY);
    doc.addImage(signatureData, 'PNG', 14, signatureY + 5, 60, 22);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 14, signatureY + 32);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Documento gerado automaticamente pelo Sistema de Ponto Digital', 105, 285, { align: 'center' });

  return doc;
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const getPDFBase64 = (doc: jsPDF): string => {
  return doc.output('datauristring');
};
