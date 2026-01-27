import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  cpf: string | null;
  birth_date: string | null;
  hire_date: string | null;
  termination_date: string | null;
  phone: string | null;
  sector: string | null;
  position: string | null;
  work_schedule_id: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  status: string | null;
  specification: string | null;
}

interface WorkSchedule {
  id: string;
  name: string;
}

interface ExportParams {
  employees: Employee[];
  schedules: WorkSchedule[];
  filters: {
    searchTerm: string;
    filterSector: string;
    filterStatus: string;
  };
}

const formatCPF = (cpf: string | null): string => {
  if (!cpf) return '-';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return cpf;
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (phone: string | null): string => {
  if (!phone) return '-';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  if (numbers.length === 11) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
  return phone;
};

const formatDate = (date: string | null): string => {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
};

const getScheduleName = (scheduleId: string | null, schedules: WorkSchedule[]): string => {
  if (!scheduleId) return '-';
  const schedule = schedules.find(s => s.id === scheduleId);
  return schedule?.name || '-';
};

const getFilterDescription = (filters: ExportParams['filters']): string => {
  const parts: string[] = [];
  if (filters.searchTerm) parts.push(`Nome: "${filters.searchTerm}"`);
  if (filters.filterSector !== 'all') parts.push(`Setor: ${filters.filterSector}`);
  if (filters.filterStatus !== 'all') parts.push(`Status: ${filters.filterStatus}`);
  return parts.length > 0 ? parts.join(' | ') : 'Sem filtros aplicados';
};

export const exportToPDF = ({ employees, schedules, filters }: ExportParams): void => {
  const doc = new jsPDF('landscape');

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTA DE COLABORADORES', 148, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 25);
  doc.text(`Filtros: ${getFilterDescription(filters)}`, 14, 31);
  doc.text(`Total: ${employees.length} colaborador(es)`, 14, 37);

  // Table data
  const tableData = employees.map((emp) => [
    emp.full_name,
    emp.email,
    formatCPF(emp.cpf),
    emp.sector || '-',
    emp.position || '-',
    formatDate(emp.hire_date),
    getScheduleName(emp.work_schedule_id, schedules),
    (emp.status || 'ativo').charAt(0).toUpperCase() + (emp.status || 'ativo').slice(1),
    emp.specification || '-',
  ]);

  autoTable(doc, {
    startY: 42,
    head: [['Nome', 'E-mail', 'CPF', 'Setor', 'Cargo', 'Admissão', 'Jornada', 'Status', 'Especificação']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [219, 39, 119], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 45 },
      2: { cellWidth: 28 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 22 },
      6: { cellWidth: 25 },
      7: { cellWidth: 20 },
      8: { cellWidth: 30 },
    },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Página ${i} de ${pageCount} - Sistema de Ponto Digital`,
      148,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  const filename = `colaboradores_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
  doc.save(filename);
};

export const exportToExcel = ({ employees, schedules, filters }: ExportParams): void => {
  // Prepare data
  const data = employees.map((emp) => ({
    'Nome': emp.full_name,
    'E-mail': emp.email,
    'CPF': formatCPF(emp.cpf),
    'Telefone': formatPhone(emp.phone),
    'Data de Nascimento': formatDate(emp.birth_date),
    'Setor': emp.sector || '-',
    'Cargo': emp.position || '-',
    'Data de Admissão': formatDate(emp.hire_date),
    'Data de Desligamento': formatDate(emp.termination_date),
    'Jornada': getScheduleName(emp.work_schedule_id, schedules),
    'Status': (emp.status || 'ativo').charAt(0).toUpperCase() + (emp.status || 'ativo').slice(1),
    'Especificação': emp.specification || '-',
    'CEP': emp.address_cep || '-',
    'Endereço': emp.address_street || '-',
    'Número': emp.address_number || '-',
    'Complemento': emp.address_complement || '-',
    'Bairro': emp.address_neighborhood || '-',
    'Cidade': emp.address_city || '-',
    'Estado': emp.address_state || '-',
  }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 35 }, // E-mail
    { wch: 15 }, // CPF
    { wch: 16 }, // Telefone
    { wch: 15 }, // Data de Nascimento
    { wch: 15 }, // Setor
    { wch: 20 }, // Cargo
    { wch: 15 }, // Data de Admissão
    { wch: 18 }, // Data de Desligamento
    { wch: 20 }, // Jornada
    { wch: 12 }, // Status
    { wch: 20 }, // Especificação
    { wch: 10 }, // CEP
    { wch: 35 }, // Endereço
    { wch: 10 }, // Número
    { wch: 20 }, // Complemento
    { wch: 20 }, // Bairro
    { wch: 20 }, // Cidade
    { wch: 8 },  // Estado
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
  
  // Add metadata sheet
  const metadata = [
    ['Relatório de Colaboradores'],
    [''],
    ['Gerado em:', format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })],
    ['Filtros aplicados:', getFilterDescription(filters)],
    ['Total de colaboradores:', employees.length.toString()],
  ];
  const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
  wsMetadata['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsMetadata, 'Informações');

  // Save file
  const filename = `colaboradores_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
