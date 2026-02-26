import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Database, Users, FolderOpen, Loader2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

const EXPORTABLE_TABLES = [
  { key: 'profiles', label: 'Colaboradores (Profiles)', icon: Users, category: 'Database' },
  { key: 'user_roles', label: 'Papéis de Usuário', icon: Users, category: 'Database' },
  { key: 'organizations', label: 'Organizações', icon: Database, category: 'Database' },
  { key: 'company_info', label: 'Informações da Empresa', icon: Database, category: 'Database' },
  { key: 'company_branches', label: 'Filiais', icon: Database, category: 'Database' },
  { key: 'company_admins', label: 'Administradores', icon: Users, category: 'Database' },
  { key: 'time_records', label: 'Registros de Ponto', icon: Database, category: 'Database' },
  { key: 'work_schedules', label: 'Jornadas de Trabalho', icon: Database, category: 'Database' },
  { key: 'schedule_adjustments', label: 'Ajustes de Jornada', icon: Database, category: 'Database' },
  { key: 'adjustment_requests', label: 'Solicitações de Ajuste', icon: Database, category: 'Database' },
  { key: 'vacation_requests', label: 'Solicitações de Férias', icon: Database, category: 'Database' },
  { key: 'hours_balance', label: 'Banco de Horas', icon: Database, category: 'Database' },
  { key: 'monthly_overtime_decisions', label: 'Decisões de Horas Extras', icon: Database, category: 'Database' },
  { key: 'documents', label: 'Documentos', icon: FolderOpen, category: 'Database' },
  { key: 'holidays', label: 'Feriados', icon: Database, category: 'Database' },
  { key: 'payroll_settings', label: 'Configurações de Folha', icon: Database, category: 'Database' },
  { key: 'location_settings', label: 'Configurações de Localização', icon: Database, category: 'Database' },
  { key: 'status_history', label: 'Histórico de Status', icon: Database, category: 'Database' },
] as const;

type TableKey = typeof EXPORTABLE_TABLES[number]['key'];

const convertToCSV = (data: Record<string, unknown>[]): string => {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(';')
    ),
  ];
  return '\uFEFF' + csvRows.join('\n');
};

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const DataExport = () => {
  const { organizationId } = useAuth();
  const [selected, setSelected] = useState<Set<TableKey>>(new Set());
  const [exporting, setExporting] = useState(false);

  const toggleTable = (key: TableKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === EXPORTABLE_TABLES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(EXPORTABLE_TABLES.map(t => t.key)));
    }
  };

  const exportSelected = async () => {
    if (selected.size === 0) {
      toast.error('Selecione ao menos uma tabela para exportar.');
      return;
    }
    if (!organizationId) {
      toast.error('Organização não encontrada.');
      return;
    }

    setExporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const key of selected) {
      try {
        const { data, error } = await supabase
          .from(key)
          .select('*')
          .eq('organization_id' as never, organizationId as never);

        if (error) {
          console.error(`Erro ao exportar ${key}:`, error);
          errorCount++;
          continue;
        }

        if (!data || data.length === 0) {
          toast.info(`Tabela "${key}" está vazia.`);
          continue;
        }

        const csv = convertToCSV(data as Record<string, unknown>[]);
        downloadCSV(csv, `${key}_${new Date().toISOString().slice(0, 10)}`);
        successCount++;
      } catch (err) {
        console.error(`Erro ao exportar ${key}:`, err);
        errorCount++;
      }
    }

    setExporting(false);

    if (successCount > 0) toast.success(`${successCount} tabela(s) exportada(s) com sucesso!`);
    if (errorCount > 0) toast.error(`${errorCount} tabela(s) com erro na exportação.`);
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
          <p className="text-muted-foreground mt-1">
            Selecione as tabelas que deseja exportar em formato CSV
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tabelas do Sistema</CardTitle>
                <CardDescription>
                  {selected.size} de {EXPORTABLE_TABLES.length} selecionada(s)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  {selected.size === EXPORTABLE_TABLES.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </Button>
                <Button
                  size="sm"
                  onClick={exportSelected}
                  disabled={exporting || selected.size === 0}
                  className="bg-[hsl(200,95%,14%)] hover:bg-[hsl(200,95%,20%)]"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-1" />
                  )}
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {EXPORTABLE_TABLES.map((table) => {
                const Icon = table.icon;
                const isSelected = selected.has(table.key);
                return (
                  <label
                    key={table.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[hsl(195,72%,43%)] bg-[hsl(195,72%,43%)]/10'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleTable(table.key)}
                    />
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{table.label}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default DataExport;
