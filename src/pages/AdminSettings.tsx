import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SidebarLayout from '@/components/layout/SidebarLayout';
import LocationSettings from '@/components/admin/LocationSettings';
import EmployeeRegistration from '@/components/admin/EmployeeRegistration';
import WorkScheduleManagement from '@/components/admin/WorkScheduleManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, MapPin, Clock, Loader2 } from 'lucide-react';

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
              Gerencie as configurações do sistema e colaboradores
            </p>
          </div>
          <EmployeeRegistration />
        </div>

        <Tabs defaultValue="schedules" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Jornadas
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules">
            <WorkScheduleManagement />
          </TabsContent>

          <TabsContent value="location">
            <LocationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

export default AdminSettings;
