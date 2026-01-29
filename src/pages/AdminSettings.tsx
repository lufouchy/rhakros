import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EmployeeRegistration from '@/components/admin/EmployeeRegistration';
import WorkScheduleManagement from '@/components/admin/WorkScheduleManagement';
import PayrollSettings from '@/components/admin/PayrollSettings';
import MonthlyClosingPanel from '@/components/admin/MonthlyClosingPanel';
import { Settings, Clock, Loader2, Calendar, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AdminSettings = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SidebarLayout>
    );
  }

  if (!user || userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie as configurações do sistema de ponto
            </p>
          </div>
          <EmployeeRegistration />
        </div>

        <Tabs defaultValue="schedules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Jornadas de Trabalho</span>
              <span className="sm:hidden">Jornadas</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Folha de Pagamento</span>
              <span className="sm:hidden">Folha</span>
            </TabsTrigger>
            <TabsTrigger value="closing" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Fechamento Mensal</span>
              <span className="sm:hidden">Fechamento</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules" className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-medium">
              <Clock className="h-5 w-5 text-primary" />
              Jornadas de Trabalho
            </div>
            <WorkScheduleManagement />
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <PayrollSettings />
          </TabsContent>

          <TabsContent value="closing" className="space-y-4">
            <MonthlyClosingPanel />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default AdminSettings;
