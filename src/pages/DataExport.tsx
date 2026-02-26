import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Database, Users, FolderOpen, Loader2, CheckSquare, Copy, Check, Code } from 'lucide-react';
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

// SQL DDL for each table
const TABLE_SQL: Record<string, string> = {
  organizations: `-- Enums utilizados
CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'suporte');
CREATE TYPE public.absence_type AS ENUM ('vacation','medical_consultation','medical_leave','justified_absence','bereavement_leave','maternity_leave','paternity_leave','unjustified_absence','work_accident','punitive_suspension','day_off');
CREATE TYPE public.adjustment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.admin_position AS ENUM ('rh','dono','gerente','diretor','coordenador','socio','outro');
CREATE TYPE public.bank_validity AS ENUM ('3_months','6_months','1_year','custom');
CREATE TYPE public.business_sector AS ENUM ('tecnologia','varejo','industria','servicos','saude','educacao','financeiro','construcao','agronegocio','logistica','alimentacao','outro');
CREATE TYPE public.document_status AS ENUM ('pending_signature','signed','expired');
CREATE TYPE public.mixed_rule_type AS ENUM ('hours_threshold','day_type');
CREATE TYPE public.overtime_strategy AS ENUM ('bank','payment','mixed');
CREATE TYPE public.time_record_type AS ENUM ('entry','lunch_out','lunch_in','exit');
CREATE TYPE public.vacation_type AS ENUM ('individual','collective');

CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  org_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  profiles: `CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  avatar_url TEXT,
  birth_date DATE,
  hire_date DATE,
  termination_date DATE,
  sector TEXT,
  position TEXT,
  status TEXT DEFAULT 'ativo',
  specification TEXT DEFAULT 'normal',
  branch_id UUID REFERENCES public.company_branches(id),
  work_schedule_id UUID REFERENCES public.work_schedules(id),
  location_mode TEXT NOT NULL DEFAULT 'disabled',
  work_location_type TEXT NOT NULL DEFAULT 'sede',
  allowed_radius_meters INTEGER DEFAULT 100,
  work_latitude NUMERIC,
  work_longitude NUMERIC,
  work_address_cep TEXT,
  work_address_street TEXT,
  work_address_number TEXT,
  work_address_complement TEXT,
  work_address_neighborhood TEXT,
  work_address_city TEXT,
  work_address_state TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  user_roles: `CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  organization_id UUID NOT NULL REFERENCES public.organizations(id)
);`,

  company_info: `CREATE TABLE public.company_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  cnpj TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  business_sector business_sector NOT NULL DEFAULT 'outro',
  has_branches BOOLEAN NOT NULL DEFAULT false,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  logo_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  financial_email TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  company_branches: `CREATE TABLE public.company_branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.company_info(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  cnpj TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  financial_email TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  company_admins: `CREATE TABLE public.company_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.company_info(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  position admin_position NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  time_records: `CREATE TABLE public.time_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  record_type time_record_type NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  work_schedules: `CREATE TABLE public.work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'weekly',
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  break_start_time TIME,
  break_end_time TIME,
  break_duration_minutes INTEGER DEFAULT 60,
  monday_hours NUMERIC DEFAULT 8,
  tuesday_hours NUMERIC DEFAULT 8,
  wednesday_hours NUMERIC DEFAULT 8,
  thursday_hours NUMERIC DEFAULT 8,
  friday_hours NUMERIC DEFAULT 8,
  saturday_hours NUMERIC DEFAULT 0,
  sunday_hours NUMERIC DEFAULT 0,
  shift_work_hours INTEGER,
  shift_rest_hours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  schedule_adjustments: `CREATE TABLE public.schedule_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  adjustment_type TEXT NOT NULL DEFAULT 'temporary_change',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  custom_start_time TIME,
  custom_end_time TIME,
  custom_break_start TIME,
  custom_break_end TIME,
  overtime_authorized BOOLEAN NOT NULL DEFAULT false,
  overtime_max_minutes INTEGER,
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  adjustment_requests: `CREATE TABLE public.adjustment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  request_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  record_type time_record_type NOT NULL,
  requested_time TIMESTAMPTZ NOT NULL,
  status adjustment_status NOT NULL DEFAULT 'pending',
  absence_type absence_type,
  absence_reason TEXT,
  absence_dates TEXT[],
  start_time TIME,
  end_time TIME,
  attachment_url TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  vacation_requests: `CREATE TABLE public.vacation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  vacation_type vacation_type NOT NULL DEFAULT 'individual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INTEGER NOT NULL,
  sell_days INTEGER DEFAULT 0,
  reason TEXT,
  status adjustment_status NOT NULL DEFAULT 'pending',
  is_admin_created BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  hours_balance: `CREATE TABLE public.hours_balance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  balance_minutes INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  monthly_overtime_decisions: `CREATE TABLE public.monthly_overtime_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  reference_month DATE NOT NULL,
  destination TEXT NOT NULL DEFAULT 'bank',
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  bank_minutes INTEGER DEFAULT 0,
  payment_minutes INTEGER DEFAULT 0,
  payment_amount NUMERIC DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  documents: `CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'timesheet',
  reference_month DATE NOT NULL,
  status document_status NOT NULL DEFAULT 'pending_signature',
  file_url TEXT,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  holidays: `CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  state_code TEXT,
  city_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  payroll_settings: `CREATE TABLE public.payroll_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  cycle_start_day INTEGER NOT NULL DEFAULT 1,
  tolerance_minutes INTEGER NOT NULL DEFAULT 10,
  tolerance_entry_minutes INTEGER NOT NULL DEFAULT 10,
  schedule_flexibility_mode TEXT NOT NULL DEFAULT 'tolerance',
  overtime_strategy overtime_strategy NOT NULL DEFAULT 'bank',
  bank_validity bank_validity DEFAULT '6_months',
  bank_custom_months INTEGER,
  bank_daily_limit_hours NUMERIC DEFAULT 2,
  bank_compensation_ratio NUMERIC DEFAULT 1.0,
  bank_sunday_multiplier NUMERIC DEFAULT 2.0,
  bank_holiday_multiplier NUMERIC DEFAULT 2.0,
  payment_weekday_percent INTEGER DEFAULT 50,
  payment_saturday_percent INTEGER DEFAULT 50,
  payment_sunday_percent INTEGER DEFAULT 100,
  payment_holiday_percent INTEGER DEFAULT 100,
  mixed_rule_type mixed_rule_type DEFAULT 'hours_threshold',
  mixed_hours_threshold INTEGER DEFAULT 20,
  mixed_bank_days TEXT[] DEFAULT ARRAY['weekday','saturday'],
  mixed_payment_days TEXT[] DEFAULT ARRAY['sunday','holiday'],
  auto_decision_enabled BOOLEAN DEFAULT false,
  auto_decision_threshold_hours INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  location_settings: `CREATE TABLE public.location_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  location_mode TEXT NOT NULL DEFAULT 'disabled',
  allowed_radius_meters INTEGER DEFAULT 100,
  company_latitude NUMERIC,
  company_longitude NUMERIC,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,

  status_history: `CREATE TABLE public.status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  previous_status TEXT,
  new_status TEXT,
  previous_specification TEXT,
  new_specification TEXT,
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`,
};

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
  const [copiedTable, setCopiedTable] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

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

  const copySQL = (tableKey: string) => {
    const sql = TABLE_SQL[tableKey];
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopiedTable(tableKey);
      toast.success(`SQL de "${tableKey}" copiado!`);
      setTimeout(() => setCopiedTable(null), 2000);
    }
  };

  const copyAllSQL = () => {
    const allSQL = EXPORTABLE_TABLES
      .map(t => `-- ========== ${t.label} ==========\n${TABLE_SQL[t.key] || '-- SQL não disponível'}`)
      .join('\n\n');
    navigator.clipboard.writeText(allSQL);
    setCopiedAll(true);
    toast.success('SQL completo copiado!');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <SidebarLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
          <p className="text-muted-foreground mt-1">
            Exporte dados em CSV ou copie o SQL das tabelas para migração
          </p>
        </div>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList>
            <TabsTrigger value="csv" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-2">
              <Code className="h-4 w-4" />
              SQL das Tabelas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
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
          </TabsContent>

          <TabsContent value="sql" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-lg">SQL de Criação das Tabelas</CardTitle>
                    <CardDescription>
                      Copie o SQL (CREATE TABLE) para migrar a estrutura do banco de dados
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyAllSQL}
                    className="gap-1"
                  >
                    {copiedAll ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    {copiedAll ? 'Copiado!' : 'Copiar Tudo'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {EXPORTABLE_TABLES.map((table) => {
                  const sql = TABLE_SQL[table.key];
                  if (!sql) return null;
                  const isCopied = copiedTable === table.key;
                  return (
                    <div key={table.key} className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">{table.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">({table.key})</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copySQL(table.key)}
                          className="gap-1 h-7 text-xs"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {isCopied ? 'Copiado!' : 'Copiar'}
                        </Button>
                      </div>
                      <pre className="p-4 text-xs font-mono overflow-x-auto bg-[hsl(200,95%,14%)]/5 text-foreground max-h-56 whitespace-pre-wrap">
                        {sql}
                      </pre>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default DataExport;
