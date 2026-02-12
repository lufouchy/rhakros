import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AvatarUpload from './AvatarUpload';

interface EmployeeHeroProps {
  isRegistering?: boolean;
  onPunchClock?: () => void;
}

const EmployeeHero = ({ isRegistering, onPunchClock }: EmployeeHeroProps) => {
  const { user, profile, refreshProfile } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAvatarUpdate = async (newUrl: string) => {
    await refreshProfile();
  };

  return (
    <div className="bg-gradient-to-r from-[#023047] to-[#034a6b] text-white rounded-2xl p-6 mb-6">
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
            {profile?.position || 'Cargo não definido'}
          </p>
        </div>

        {onPunchClock && (
          <Button
            className="w-16 h-16 rounded-full bg-warning hover:bg-warning/90 text-warning-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 shrink-0"
            onClick={onPunchClock}
            disabled={isRegistering}
          >
            {isRegistering ? (
              <Clock className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase leading-tight">Marcar</span>
                <span className="text-[10px] font-bold uppercase leading-tight">Ponto</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmployeeHero;
