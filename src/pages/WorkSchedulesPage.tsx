import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SidebarLayout from '@/components/layout/SidebarLayout';
import WorkScheduleManagement from '@/components/admin/WorkScheduleManagement';
import { Loader2 } from 'lucide-react';

const WorkSchedulesPage = () => {
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

  if (!user || (userRole !== 'admin' && userRole !== 'suporte')) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto p-6 animate-fade-in">
        <WorkScheduleManagement />
      </div>
    </SidebarLayout>
  );
};

export default WorkSchedulesPage;
