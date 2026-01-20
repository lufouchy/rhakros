import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AvatarUpload from './AvatarUpload';

const EmployeeHero = () => {
  const { user, profile, refreshProfile } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAvatarUpdate = async (newUrl: string) => {
    await refreshProfile();
  };

  return (
    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-6">
        <AvatarUpload
          userId={user?.id || ''}
          avatarUrl={profile?.avatar_url || null}
          fallbackText={getInitials(profile?.full_name)}
          onUploadComplete={handleAvatarUpdate}
          size="lg"
        />
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile?.full_name || 'Colaborador'}</h1>
          <p className="text-white/70 text-sm mt-1">
            {profile?.email}
          </p>
          
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="secondary" className="bg-cyan-400/20 text-cyan-200 border-0">
              Filial: Centro
            </Badge>
            <Badge variant="secondary" className="bg-blue-400/20 text-blue-200 border-0">
              Depto: Operações
            </Badge>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
          <Mail className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default EmployeeHero;
