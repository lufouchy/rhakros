import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, UserCheck, UserX, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { exportReportToPDF, exportReportToExcel } from '@/utils/reportExport';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const EmployeeReportsTab = () => {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, schedRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('organization_id', organizationId!),
      supabase.from('work_schedules').select('id, name').eq('organization_id', organizationId!),
    ]);
    setEmployees(empRes.data || []);
    setSchedules(schedRes.data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Stats
  const total = employees.length;
  const active = employees.filter(e => e.status === 'ativo').length;
  const away = employees.filter(e => e.status === 'afastado').length;
  const inactive = employees.filter(e => e.status === 'inativo').length;

  const statusData = [
    { name: 'Ativos', value: active },
    { name: 'Afastados', value: away },
    { name: 'Inativos', value: inactive },
  ].filter(d => d.value > 0);

  // By sector
  const sectorMap: Record<string, number> = {};
  employees.forEach(e => { const s = e.sector || 'Sem setor'; sectorMap[s] = (sectorMap[s] || 0) + 1; });
  const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // By schedule
  const scheduleMap: Record<string, number> = {};
  employees.forEach(e => {
    const sch = schedules.find(s => s.id === e.work_schedule_id);
    const name = sch?.name || 'Sem jornada';
    scheduleMap[name] = (scheduleMap[name] || 0) + 1;
  });
  const scheduleData = Object.entries(scheduleMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const handleExportPDF = () => {
    exportReportToPDF({
      title: 'Relatório de Colaboradores',
      stats: [
        { label: 'Total', value: total },
        { label: 'Ativos', value: active },
        { label: 'Afastados', value: away },
        { label: 'Inativos', value: inactive },
      ],
      tableHeaders: ['Nome', 'E-mail', 'CPF', 'Setor', 'Cargo', 'Status'],
      tableData: employees.map(e => [
        e.full_name, e.email, e.cpf || '-', e.sector || '-', e.position || '-',
        (e.status || 'ativo').charAt(0).toUpperCase() + (e.status || 'ativo').slice(1),
      ]),
    });
    toast({ title: 'PDF gerado com sucesso' });
  };

  const handleExportExcel = async () => {
    await exportReportToExcel({
      sheetName: 'Colaboradores',
      headers: ['Nome', 'E-mail', 'CPF', 'Setor', 'Cargo', 'Status', 'Admissão'],
      rows: employees.map(e => [
        e.full_name, e.email, e.cpf || '-', e.sector || '-', e.position || '-',
        (e.status || 'ativo').charAt(0).toUpperCase() + (e.status || 'ativo').slice(1),
        e.hire_date || '-',
      ]),
      fileName: 'relatorio_colaboradores',
    });
    toast({ title: 'Excel gerado com sucesso' });
  };

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-2" />Excel</Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><Users className="h-8 w-8 mx-auto text-primary mb-2" /><p className="text-2xl font-bold">{total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><UserCheck className="h-8 w-8 mx-auto text-green-600 mb-2" /><p className="text-2xl font-bold">{active}</p><p className="text-sm text-muted-foreground">Ativos</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><UserX className="h-8 w-8 mx-auto text-yellow-600 mb-2" /><p className="text-2xl font-bold">{away}</p><p className="text-sm text-muted-foreground">Afastados</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><UserX className="h-8 w-8 mx-auto text-red-600 mb-2" /><p className="text-2xl font-bold">{inactive}</p><p className="text-sm text-muted-foreground">Inativos</p></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Colaboradores por Setor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Colaboradores por Jornada</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scheduleData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeReportsTab;
