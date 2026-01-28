import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SidebarLayout from '@/components/layout/SidebarLayout';
import EmployeeRegistration from '@/components/admin/EmployeeRegistration';
import WorkScheduleManagement from '@/components/admin/WorkScheduleManagement';
import { Settings, Clock, Loader2 } from 'lucide-react';

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
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Gerencie as jornadas de trabalho e colaboradores
            </p>
          </div>
          <EmployeeRegistration />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Clock className="h-5 w-5 text-primary" />
            Jornadas de Trabalho
          </div>
          <WorkScheduleManagement />
        </div>
      </div>
    </SidebarLayout>
  );
};

export default AdminSettings;
